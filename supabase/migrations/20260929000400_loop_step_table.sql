-- Allow each Loop topic to contain an ordered table of independently configured steps.
create table public.loop_timer_steps (
 id uuid primary key default gen_random_uuid(),
 clan_id uuid not null references public.clans(id),
 loop_timer_id uuid not null,
 step_number integer not null check (step_number between 1 and 100),
 timer_type text not null check (timer_type in ('COUNTDOWN','CLOCK')),
 countdown_seconds integer check (countdown_seconds between 1 and 86400),
 clock_time time without time zone,
 siren_enabled boolean not null default true,
 created_at timestamptz not null default now(),
 foreign key (clan_id, loop_timer_id) references public.loop_timers(clan_id, id) on delete cascade,
 unique (clan_id, loop_timer_id, step_number),
 check ((timer_type='COUNTDOWN' and countdown_seconds is not null and clock_time is null)
     or (timer_type='CLOCK' and countdown_seconds is null and clock_time is not null))
);

insert into public.loop_timer_steps(
 clan_id,loop_timer_id,step_number,timer_type,countdown_seconds,clock_time,siren_enabled
)
select timer.clan_id,timer.id,series.step_number,timer.timer_type,
 timer.countdown_seconds,timer.clock_time,timer.siren_enabled
from public.loop_timers timer
cross join lateral generate_series(1,timer.loop_count) series(step_number);

create index loop_timer_steps_order on public.loop_timer_steps(clan_id,loop_timer_id,step_number);
alter table public.loop_timer_steps enable row level security;
alter table public.loop_timer_steps force row level security;
create policy loop_timer_steps_read on public.loop_timer_steps
 for select to authenticated using (public.has_clan_permission(clan_id, 'loop.view'));
grant select on public.loop_timer_steps to authenticated;
create trigger audit_mutations after insert or update or delete on public.loop_timer_steps
 for each row execute function private.write_audit();

create function public.create_loop_timer_with_steps(
 p_clan_id uuid,
 p_name text,
 p_owner_type text,
 p_member_id uuid,
 p_steps jsonb
) returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
 actor uuid := auth.uid();
 new_id uuid;
 item jsonb;
 item_number integer;
 first_item jsonb;
 first_type text;
 first_countdown integer;
 first_clock time without time zone;
 first_siren boolean;
 target timestamptz;
 step_count integer;
begin
 if actor is null or not public.has_clan_permission(p_clan_id, 'loop.manage') then
  raise exception 'Not authorized' using errcode = '42501';
 end if;
 perform 1 from public.clans where id=p_clan_id and status='ACTIVE' for update;
 if not found then raise exception 'Not authorized' using errcode = '42501'; end if;
 step_count := case when jsonb_typeof(p_steps)='array' then jsonb_array_length(p_steps) else 0 end;
 if length(btrim(p_name)) not between 1 and 100 or step_count not between 1 and 100
  or p_owner_type not in ('CLAN','MEMBER')
  or (p_owner_type='CLAN' and p_member_id is not null)
  or (p_owner_type='MEMBER' and p_member_id is null) then
  raise exception 'Invalid Loop topic' using errcode = '22023';
 end if;
 if p_member_id is not null and not exists(
  select 1 from public.clan_members where id=p_member_id and clan_id=p_clan_id and status='ACTIVE'
 ) then raise exception 'Member not found' using errcode = 'P0002'; end if;

 for item,item_number in
  select value,ordinality::integer from jsonb_array_elements(p_steps) with ordinality
 loop
  if item->>'timerType' not in ('COUNTDOWN','CLOCK')
   or (item->>'timerType'='COUNTDOWN' and
       (coalesce((item->>'countdownSeconds')::integer,0) not between 1 and 86400
        or nullif(item->>'clockTime','') is not null))
   or (item->>'timerType'='CLOCK' and
       (nullif(item->>'countdownSeconds','') is not null
        or nullif(item->>'clockTime','') is null)) then
   raise exception 'Invalid Loop step %',item_number using errcode = '22023';
  end if;
 end loop;

 first_item := p_steps->0;
 first_type := first_item->>'timerType';
 first_countdown := nullif(first_item->>'countdownSeconds','')::integer;
 first_clock := nullif(first_item->>'clockTime','')::time;
 first_siren := coalesce((first_item->>'sirenEnabled')::boolean,false);
 if first_type='COUNTDOWN' then
  target := now()+make_interval(secs=>first_countdown);
 else
  target := (((now() at time zone 'Asia/Bangkok')::date+first_clock) at time zone 'Asia/Bangkok');
  if target<=now() then target:=target+interval '1 day'; end if;
 end if;

 insert into public.loop_timers(
  clan_id,name,owner_type,member_id,loop_count,timer_type,countdown_seconds,
  clock_time,siren_enabled,next_alert_at,created_by
 ) values(
  p_clan_id,btrim(p_name),p_owner_type,p_member_id,step_count,first_type,
  first_countdown,first_clock,first_siren,target,actor
 ) returning id into new_id;

 insert into public.loop_timer_steps(
  clan_id,loop_timer_id,step_number,timer_type,countdown_seconds,clock_time,siren_enabled
 )
 select p_clan_id,new_id,ordinality::integer,value->>'timerType',
  nullif(value->>'countdownSeconds','')::integer,
  nullif(value->>'clockTime','')::time,
  coalesce((value->>'sirenEnabled')::boolean,false)
 from jsonb_array_elements(p_steps) with ordinality;
 return new_id;
end
$$;

create or replace function public.create_loop_timer(
 p_clan_id uuid,p_name text,p_owner_type text,p_member_id uuid,p_loop_count integer,
 p_timer_type text,p_countdown_seconds integer,p_clock_time time without time zone,p_siren_enabled boolean
) returns uuid
language plpgsql security definer set search_path = ''
as $$
declare steps jsonb;
begin
 select jsonb_agg(jsonb_build_object(
  'timerType',p_timer_type,
  'countdownSeconds',p_countdown_seconds,
  'clockTime',case when p_clock_time is null then null else to_char(p_clock_time,'HH24:MI') end,
  'sirenEnabled',coalesce(p_siren_enabled,false)
 )) into steps from generate_series(1,p_loop_count);
 return public.create_loop_timer_with_steps(p_clan_id,p_name,p_owner_type,p_member_id,steps);
end
$$;

create or replace function public.acknowledge_loop_timer(
 p_clan_id uuid,p_loop_timer_id uuid
) returns text
language plpgsql security definer set search_path = ''
as $$
declare
 actor uuid := auth.uid();
 timer public.loop_timers;
 next_step public.loop_timer_steps;
 target timestamptz;
begin
 if actor is null or not public.has_clan_permission(p_clan_id, 'loop.manage') then
  raise exception 'Not authorized' using errcode = '42501';
 end if;
 perform 1 from public.clans where id=p_clan_id and status='ACTIVE' for update;
 if not found then raise exception 'Not authorized' using errcode = '42501'; end if;
 select * into timer from public.loop_timers where id=p_loop_timer_id and clan_id=p_clan_id for update;
 if not found then raise exception 'Loop not found' using errcode = 'P0002'; end if;
 if timer.status<>'ACTIVE' or timer.next_alert_at>now() then
  raise exception 'Loop is not due' using errcode = '22023';
 end if;

 insert into public.loop_checkpoints(clan_id,loop_timer_id,loop_number,scheduled_for,recorded_by)
 values(p_clan_id,timer.id,timer.current_loop,timer.next_alert_at,actor);

 if timer.current_loop>=timer.loop_count then
  update public.loop_timers set status='COMPLETED',next_alert_at=null
  where id=timer.id and clan_id=p_clan_id;
  return 'COMPLETED';
 end if;

 select * into next_step from public.loop_timer_steps
 where clan_id=p_clan_id and loop_timer_id=timer.id and step_number=timer.current_loop+1;
 if not found then raise exception 'Next Loop step not found' using errcode = 'P0002'; end if;
 if next_step.timer_type='COUNTDOWN' then
  target:=now()+make_interval(secs=>next_step.countdown_seconds);
 else
  target:=(((now() at time zone 'Asia/Bangkok')::date+next_step.clock_time) at time zone 'Asia/Bangkok');
  if target<=now() then target:=target+interval '1 day'; end if;
 end if;
 update public.loop_timers set
  current_loop=timer.current_loop+1,
  timer_type=next_step.timer_type,
  countdown_seconds=next_step.countdown_seconds,
  clock_time=next_step.clock_time,
  siren_enabled=next_step.siren_enabled,
  next_alert_at=target
 where id=timer.id and clan_id=p_clan_id;
 return 'ACTIVE';
end
$$;

revoke all on function public.create_loop_timer_with_steps(uuid,text,text,uuid,jsonb) from public,anon;
grant execute on function public.create_loop_timer_with_steps(uuid,text,text,uuid,jsonb) to authenticated;
