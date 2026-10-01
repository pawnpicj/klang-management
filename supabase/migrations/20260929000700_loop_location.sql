-- Add a location to each Loop row and preserve per-row alert settings.
alter table public.loop_timer_steps
 add column location text;

alter table public.loop_timer_steps
 add constraint loop_timer_steps_location_length
 check (location is null or length(btrim(location)) between 1 and 200);

create function public.add_loop_timer_step_with_location(
 p_clan_id uuid,
 p_loop_timer_id uuid,
 p_location text,
 p_timer_type text,
 p_countdown_seconds integer,
 p_clock_time time without time zone,
 p_siren_enabled boolean,
 p_sound_enabled boolean
) returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
 actor uuid:=auth.uid();
 timer public.loop_timers;
 new_step_id uuid;
 next_number integer;
 target timestamptz;
begin
 if actor is null or not public.has_clan_permission(p_clan_id,'loop.manage') then
  raise exception 'Not authorized' using errcode='42501';
 end if;
 perform 1 from public.clans where id=p_clan_id and status='ACTIVE' for update;
 if not found then raise exception 'Not authorized' using errcode='42501'; end if;
 select * into timer from public.loop_timers
 where id=p_loop_timer_id and clan_id=p_clan_id for update;
 if not found then raise exception 'Loop topic not found' using errcode='P0002'; end if;
 if timer.status not in ('DRAFT','ACTIVE') or timer.loop_count>=100
  or p_location is null
  or length(btrim(p_location)) not between 1 and 200
  or p_timer_type not in ('COUNTDOWN','CLOCK')
  or (p_timer_type='COUNTDOWN' and (p_countdown_seconds not between 1 and 86400 or p_clock_time is not null))
  or (p_timer_type='CLOCK' and (p_countdown_seconds is not null or p_clock_time is null)) then
  raise exception 'Invalid Loop step' using errcode='22023';
 end if;
 next_number:=timer.loop_count+1;
 insert into public.loop_timer_steps(
  clan_id,loop_timer_id,step_number,location,timer_type,countdown_seconds,
  clock_time,siren_enabled,sound_enabled
 ) values(
  p_clan_id,timer.id,next_number,btrim(p_location),p_timer_type,p_countdown_seconds,
  p_clock_time,coalesce(p_siren_enabled,false),coalesce(p_sound_enabled,false)
 ) returning id into new_step_id;

 if timer.status='DRAFT' then
  if p_timer_type='COUNTDOWN' then
   target:=now()+make_interval(secs=>p_countdown_seconds);
  else
   target:=(((now() at time zone 'Asia/Bangkok')::date+p_clock_time) at time zone 'Asia/Bangkok');
   if target<=now() then target:=target+interval '1 day'; end if;
  end if;
  update public.loop_timers set
   loop_count=1,current_loop=1,timer_type=p_timer_type,
   countdown_seconds=p_countdown_seconds,clock_time=p_clock_time,
   siren_enabled=coalesce(p_siren_enabled,false),status='ACTIVE',next_alert_at=target
  where id=timer.id and clan_id=p_clan_id;
 else
  update public.loop_timers set loop_count=next_number
  where id=timer.id and clan_id=p_clan_id;
 end if;
 return new_step_id;
end
$$;

revoke all on function public.add_loop_timer_step_with_location(
 uuid,uuid,text,text,integer,time without time zone,boolean,boolean
) from public,anon;
grant execute on function public.add_loop_timer_step_with_location(
 uuid,uuid,text,text,integer,time without time zone,boolean,boolean
) to authenticated;
