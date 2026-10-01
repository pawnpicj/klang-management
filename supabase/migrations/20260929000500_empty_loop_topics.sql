-- Loop topics are created first; timed rows are added afterwards.
alter table public.loop_timers drop constraint if exists loop_timers_loop_count_check;
alter table public.loop_timers drop constraint if exists loop_timers_current_loop_check;
alter table public.loop_timers drop constraint if exists loop_timers_status_check;
alter table public.loop_timers drop constraint if exists loop_timers_check1;
alter table public.loop_timers drop constraint if exists loop_timers_check2;
alter table public.loop_timers drop constraint if exists loop_timers_check3;

alter table public.loop_timers alter column timer_type drop not null;
alter table public.loop_timers alter column loop_count set default 0;
alter table public.loop_timers alter column current_loop set default 1;

alter table public.loop_timers
 add constraint loop_timers_loop_count_check check (loop_count between 0 and 100),
 add constraint loop_timers_current_loop_check check (current_loop between 0 and 100),
 add constraint loop_timers_status_check check (status in ('DRAFT','ACTIVE','COMPLETED','CANCELLED')),
 add constraint loop_timers_timing_check check (
   (loop_count=0 and timer_type is null and countdown_seconds is null and clock_time is null)
   or
   (loop_count>0 and (
     (timer_type='COUNTDOWN' and countdown_seconds is not null and clock_time is null)
     or (timer_type='CLOCK' and countdown_seconds is null and clock_time is not null)
   ))
 ),
 add constraint loop_timers_progress_check check (current_loop <= loop_count),
 add constraint loop_timers_alert_check check (
   (status='ACTIVE' and loop_count>0 and next_alert_at is not null)
   or (status<>'ACTIVE' and next_alert_at is null)
 ),
 add constraint loop_timers_draft_check check (
   (status='DRAFT' and loop_count=0 and current_loop=0)
   or status<>'DRAFT'
 );

create function public.create_loop_topic(
 p_clan_id uuid,
 p_name text,
 p_owner_type text,
 p_member_id uuid
) returns uuid
language plpgsql security definer set search_path = ''
as $$
declare actor uuid:=auth.uid(); new_id uuid;
begin
 if actor is null or not public.has_clan_permission(p_clan_id,'loop.manage') then
  raise exception 'Not authorized' using errcode='42501';
 end if;
 perform 1 from public.clans where id=p_clan_id and status='ACTIVE' for update;
 if not found then raise exception 'Not authorized' using errcode='42501'; end if;
 if length(btrim(p_name)) not between 1 and 100
  or p_owner_type not in ('CLAN','MEMBER')
  or (p_owner_type='CLAN' and p_member_id is not null)
  or (p_owner_type='MEMBER' and p_member_id is null) then
  raise exception 'Invalid Loop topic' using errcode='22023';
 end if;
 if p_member_id is not null and not exists(
  select 1 from public.clan_members where id=p_member_id and clan_id=p_clan_id and status='ACTIVE'
 ) then raise exception 'Member not found' using errcode='P0002'; end if;
 insert into public.loop_timers(
  clan_id,name,owner_type,member_id,loop_count,current_loop,timer_type,
  countdown_seconds,clock_time,siren_enabled,status,next_alert_at,created_by
 ) values(
  p_clan_id,btrim(p_name),p_owner_type,p_member_id,0,0,null,null,null,false,'DRAFT',null,actor
 ) returning id into new_id;
 return new_id;
end
$$;

create function public.add_loop_timer_step(
 p_clan_id uuid,
 p_loop_timer_id uuid,
 p_timer_type text,
 p_countdown_seconds integer,
 p_clock_time time without time zone,
 p_siren_enabled boolean
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
  or p_timer_type not in ('COUNTDOWN','CLOCK')
  or (p_timer_type='COUNTDOWN' and (p_countdown_seconds not between 1 and 86400 or p_clock_time is not null))
  or (p_timer_type='CLOCK' and (p_countdown_seconds is not null or p_clock_time is null)) then
  raise exception 'Invalid Loop step' using errcode='22023';
 end if;
 next_number:=timer.loop_count+1;
 insert into public.loop_timer_steps(
  clan_id,loop_timer_id,step_number,timer_type,countdown_seconds,clock_time,siren_enabled
 ) values(
  p_clan_id,timer.id,next_number,p_timer_type,p_countdown_seconds,p_clock_time,coalesce(p_siren_enabled,false)
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

revoke all on function public.create_loop_topic(uuid,text,text,uuid),
 public.add_loop_timer_step(uuid,uuid,text,integer,time without time zone,boolean)
 from public,anon;
grant execute on function public.create_loop_topic(uuid,text,text,uuid),
 public.add_loop_timer_step(uuid,uuid,text,integer,time without time zone,boolean)
 to authenticated;
