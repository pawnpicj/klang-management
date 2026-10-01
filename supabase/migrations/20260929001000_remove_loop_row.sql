-- Remove one Loop row and keep the remaining row numbers contiguous.
create function public.remove_loop_timer_step(
 p_clan_id uuid,
 p_loop_timer_id uuid,
 p_step_number integer
) returns void
language plpgsql security definer set search_path = ''
as $$
declare
 actor uuid:=auth.uid();
 timer public.loop_timers;
 remaining_count integer;
 next_step public.loop_timer_steps;
 row_number integer;
begin
 if actor is null or not public.has_clan_permission(p_clan_id,'loop.manage') then
  raise exception 'Not authorized' using errcode='42501';
 end if;
 perform 1 from public.clans
 where id=p_clan_id and status='ACTIVE' for update;
 if not found then
  raise exception 'Not authorized' using errcode='42501';
 end if;
 select * into timer from public.loop_timers
 where id=p_loop_timer_id and clan_id=p_clan_id for update;
 if not found then
  raise exception 'Loop topic not found' using errcode='P0002';
 end if;
 perform 1 from public.loop_timer_steps
 where clan_id=p_clan_id and loop_timer_id=p_loop_timer_id
  and step_number=p_step_number for update;
 if not found then
  raise exception 'Loop row not found' using errcode='P0002';
 end if;

 delete from public.loop_checkpoints
 where clan_id=p_clan_id and loop_timer_id=p_loop_timer_id
  and loop_number=p_step_number;
 delete from public.loop_timer_steps
 where clan_id=p_clan_id and loop_timer_id=p_loop_timer_id
  and step_number=p_step_number;

 for row_number in
  select loop_number from public.loop_checkpoints
  where clan_id=p_clan_id and loop_timer_id=p_loop_timer_id
   and loop_number>p_step_number
  order by loop_number
 loop
  update public.loop_checkpoints set loop_number=row_number-1
  where clan_id=p_clan_id and loop_timer_id=p_loop_timer_id
   and loop_number=row_number;
 end loop;

 for row_number in
  select step_number from public.loop_timer_steps
  where clan_id=p_clan_id and loop_timer_id=p_loop_timer_id
   and step_number>p_step_number
  order by step_number
 loop
  update public.loop_timer_steps set step_number=row_number-1
  where clan_id=p_clan_id and loop_timer_id=p_loop_timer_id
   and step_number=row_number;
 end loop;

 select count(*)::integer into remaining_count
 from public.loop_timer_steps
 where clan_id=p_clan_id and loop_timer_id=p_loop_timer_id;

 if remaining_count=0 then
  update public.loop_timers set
   loop_count=0,current_loop=0,timer_type=null,countdown_seconds=null,
   clock_time=null,siren_enabled=false,status='DRAFT',next_alert_at=null
  where id=p_loop_timer_id and clan_id=p_clan_id;
  return;
 end if;

 select * into next_step from public.loop_timer_steps
 where clan_id=p_clan_id and loop_timer_id=p_loop_timer_id
  and acknowledged_at is null
 order by alert_at,step_number
 limit 1;

 if found then
  update public.loop_timers set
   loop_count=remaining_count,current_loop=next_step.step_number,
   timer_type=next_step.timer_type,
   countdown_seconds=next_step.countdown_seconds,
   clock_time=next_step.clock_time,siren_enabled=next_step.siren_enabled,
   status='ACTIVE',next_alert_at=next_step.alert_at
  where id=p_loop_timer_id and clan_id=p_clan_id;
 else
  select * into next_step from public.loop_timer_steps
  where clan_id=p_clan_id and loop_timer_id=p_loop_timer_id
  order by step_number desc limit 1;
  update public.loop_timers set
   loop_count=remaining_count,current_loop=remaining_count,
   timer_type=next_step.timer_type,
   countdown_seconds=next_step.countdown_seconds,
   clock_time=next_step.clock_time,siren_enabled=next_step.siren_enabled,
   status='COMPLETED',next_alert_at=null
  where id=p_loop_timer_id and clan_id=p_clan_id;
 end if;
end
$$;

revoke all on function public.remove_loop_timer_step(uuid,uuid,integer)
 from public,anon;
grant execute on function public.remove_loop_timer_step(uuid,uuid,integer)
 to authenticated;
