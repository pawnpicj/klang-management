-- Permanently delete a Loop topic and its dependent records.
create function public.delete_loop_timer(
 p_clan_id uuid,
 p_loop_timer_id uuid
) returns void
language plpgsql security definer set search_path = ''
as $$
declare actor uuid:=auth.uid();
begin
 if actor is null or not public.has_clan_permission(p_clan_id,'loop.manage') then
  raise exception 'Not authorized' using errcode='42501';
 end if;
 perform 1 from public.clans
 where id=p_clan_id and status='ACTIVE' for update;
 if not found then
  raise exception 'Not authorized' using errcode='42501';
 end if;
 perform 1 from public.loop_timers
 where id=p_loop_timer_id and clan_id=p_clan_id for update;
 if not found then
  raise exception 'Loop topic not found' using errcode='P0002';
 end if;

 delete from public.loop_checkpoints
 where clan_id=p_clan_id and loop_timer_id=p_loop_timer_id;
 delete from public.loop_timers
 where clan_id=p_clan_id and id=p_loop_timer_id;
end
$$;

revoke all on function public.delete_loop_timer(uuid,uuid) from public,anon;
grant execute on function public.delete_loop_timer(uuid,uuid) to authenticated;
