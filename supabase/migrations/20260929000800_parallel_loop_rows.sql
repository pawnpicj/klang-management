-- Run every Loop row independently and acknowledge alerts per row.
alter table public.loop_timer_steps
 add column started_at timestamptz,
 add column alert_at timestamptz,
 add column acknowledged_at timestamptz,
 add column acknowledged_by uuid references public.profiles(id);

alter table public.loop_timer_steps
 add constraint loop_timer_steps_schedule_pair check (
  (started_at is null and alert_at is null)
  or (started_at is not null and alert_at is not null)
 ),
 add constraint loop_timer_steps_acknowledgement_pair check (
  (acknowledged_at is null and acknowledged_by is null)
  or (acknowledged_at is not null and acknowledged_by is not null)
 );

update public.loop_timer_steps step
set started_at=least(step.created_at,checkpoint.scheduled_for),
    alert_at=checkpoint.scheduled_for,
    acknowledged_at=checkpoint.recorded_at,
    acknowledged_by=checkpoint.recorded_by
from public.loop_checkpoints checkpoint
where checkpoint.clan_id=step.clan_id
 and checkpoint.loop_timer_id=step.loop_timer_id
 and checkpoint.loop_number=step.step_number;

update public.loop_timer_steps step
set started_at=now(),
    alert_at=case
      when step.step_number=timer.current_loop then timer.next_alert_at
      when step.timer_type='COUNTDOWN'
        then now()+make_interval(secs=>step.countdown_seconds)
      else
        case
          when (((now() at time zone 'Asia/Bangkok')::date+step.clock_time)
                at time zone 'Asia/Bangkok')<=now()
          then (((now() at time zone 'Asia/Bangkok')::date+step.clock_time)
                at time zone 'Asia/Bangkok')+interval '1 day'
          else (((now() at time zone 'Asia/Bangkok')::date+step.clock_time)
                at time zone 'Asia/Bangkok')
        end
    end
from public.loop_timers timer
where timer.id=step.loop_timer_id
 and timer.clan_id=step.clan_id
 and timer.status='ACTIVE'
 and step.acknowledged_at is null;

create index loop_timer_steps_due
 on public.loop_timer_steps(clan_id,loop_timer_id,acknowledged_at,alert_at);

create or replace function public.add_loop_timer_step_with_location(
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
 started timestamptz:=now();
 target timestamptz;
 normalized_location text:=nullif(btrim(p_location),'');
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
  or length(normalized_location)>200
  or p_timer_type not in ('COUNTDOWN','CLOCK')
  or (p_timer_type='COUNTDOWN' and
      (p_countdown_seconds not between 1 and 86400 or p_clock_time is not null))
  or (p_timer_type='CLOCK' and
      (p_countdown_seconds is not null or p_clock_time is null)) then
  raise exception 'Invalid Loop step' using errcode='22023';
 end if;

 if p_timer_type='COUNTDOWN' then
  target:=started+make_interval(secs=>p_countdown_seconds);
 else
  target:=(((started at time zone 'Asia/Bangkok')::date+p_clock_time)
           at time zone 'Asia/Bangkok');
  if target<=started then target:=target+interval '1 day'; end if;
 end if;

 next_number:=timer.loop_count+1;
 insert into public.loop_timer_steps(
  clan_id,loop_timer_id,step_number,location,timer_type,countdown_seconds,
  clock_time,siren_enabled,sound_enabled,started_at,alert_at
 ) values(
  p_clan_id,timer.id,next_number,normalized_location,p_timer_type,
  p_countdown_seconds,p_clock_time,coalesce(p_siren_enabled,false),
  coalesce(p_sound_enabled,false),started,target
 ) returning id into new_step_id;

 if timer.status='DRAFT' then
  update public.loop_timers set
   loop_count=1,current_loop=1,timer_type=p_timer_type,
   countdown_seconds=p_countdown_seconds,clock_time=p_clock_time,
   siren_enabled=coalesce(p_siren_enabled,false),status='ACTIVE',
   next_alert_at=target
  where id=timer.id and clan_id=p_clan_id;
 elsif target<timer.next_alert_at then
  update public.loop_timers set
   loop_count=next_number,current_loop=next_number,timer_type=p_timer_type,
   countdown_seconds=p_countdown_seconds,clock_time=p_clock_time,
   siren_enabled=coalesce(p_siren_enabled,false),next_alert_at=target
  where id=timer.id and clan_id=p_clan_id;
 else
  update public.loop_timers set loop_count=next_number
  where id=timer.id and clan_id=p_clan_id;
 end if;
 return new_step_id;
end
$$;

create function public.acknowledge_loop_timer_step(
 p_clan_id uuid,
 p_loop_timer_id uuid,
 p_step_number integer
) returns text
language plpgsql security definer set search_path = ''
as $$
declare
 actor uuid:=auth.uid();
 timer public.loop_timers;
 selected_step public.loop_timer_steps;
 next_step public.loop_timer_steps;
begin
 if actor is null or not public.has_clan_permission(p_clan_id,'loop.manage') then
  raise exception 'Not authorized' using errcode='42501';
 end if;
 perform 1 from public.clans where id=p_clan_id and status='ACTIVE' for update;
 if not found then raise exception 'Not authorized' using errcode='42501'; end if;
 select * into timer from public.loop_timers
 where id=p_loop_timer_id and clan_id=p_clan_id for update;
 if not found then raise exception 'Loop topic not found' using errcode='P0002'; end if;
 select * into selected_step from public.loop_timer_steps
 where clan_id=p_clan_id and loop_timer_id=p_loop_timer_id
  and step_number=p_step_number for update;
 if not found then raise exception 'Loop row not found' using errcode='P0002'; end if;
 if timer.status<>'ACTIVE' or selected_step.acknowledged_at is not null
  or selected_step.alert_at is null or selected_step.alert_at>now() then
  raise exception 'Loop row is not due' using errcode='22023';
 end if;

 insert into public.loop_checkpoints(
  clan_id,loop_timer_id,loop_number,scheduled_for,recorded_by
 ) values(
  p_clan_id,timer.id,selected_step.step_number,selected_step.alert_at,actor
 );

 update public.loop_timer_steps set acknowledged_at=now(),acknowledged_by=actor
 where clan_id=p_clan_id and loop_timer_id=timer.id
  and step_number=selected_step.step_number;

 select * into next_step from public.loop_timer_steps
 where clan_id=p_clan_id and loop_timer_id=timer.id
  and acknowledged_at is null
 order by alert_at,step_number
 limit 1;

 if not found then
  update public.loop_timers set
   status='COMPLETED',current_loop=loop_count,next_alert_at=null
  where id=timer.id and clan_id=p_clan_id;
  return 'COMPLETED';
 end if;

 update public.loop_timers set
  current_loop=next_step.step_number,
  timer_type=next_step.timer_type,
  countdown_seconds=next_step.countdown_seconds,
  clock_time=next_step.clock_time,
  siren_enabled=next_step.siren_enabled,
  next_alert_at=next_step.alert_at
 where id=timer.id and clan_id=p_clan_id;
 return 'ACTIVE';
end
$$;

create or replace function public.acknowledge_loop_timer(
 p_clan_id uuid,p_loop_timer_id uuid
) returns text
language plpgsql security definer set search_path = ''
as $$
declare due_step integer;
begin
 select step_number into due_step
 from public.loop_timer_steps
 where clan_id=p_clan_id and loop_timer_id=p_loop_timer_id
  and acknowledged_at is null and alert_at<=now()
 order by alert_at,step_number
 limit 1;
 if due_step is null then
  raise exception 'Loop is not due' using errcode='22023';
 end if;
 return public.acknowledge_loop_timer_step(
  p_clan_id,p_loop_timer_id,due_step
 );
end
$$;

create or replace function public.create_loop_timer_with_steps(
 p_clan_id uuid,
 p_name text,
 p_owner_type text,
 p_member_id uuid,
 p_steps jsonb
) returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
 new_id uuid;
 item jsonb;
 step_count integer;
begin
 step_count:=case when jsonb_typeof(p_steps)='array'
  then jsonb_array_length(p_steps) else 0 end;
 if step_count not between 1 and 100 then
  raise exception 'Invalid Loop rows' using errcode='22023';
 end if;
 new_id:=public.create_loop_topic(
  p_clan_id,p_name,p_owner_type,p_member_id
 );
 for item in select value from jsonb_array_elements(p_steps)
 loop
  perform public.add_loop_timer_step_with_location(
   p_clan_id,
   new_id,
   item->>'location',
   item->>'timerType',
   nullif(item->>'countdownSeconds','')::integer,
   nullif(item->>'clockTime','')::time,
   coalesce((item->>'sirenEnabled')::boolean,false),
   coalesce((item->>'soundEnabled')::boolean,false)
  );
 end loop;
 return new_id;
end
$$;

revoke all on function public.acknowledge_loop_timer_step(
 uuid,uuid,integer
) from public,anon;
grant execute on function public.acknowledge_loop_timer_step(
 uuid,uuid,integer
) to authenticated;
