-- Timed Loop/checkpoint tracking for clan-wide and individual member schedules.
insert into public.permissions(code, description) values
 ('loop.view', 'View timed loops and checkpoints'),
 ('loop.manage', 'Create, acknowledge, and cancel timed loops')
on conflict (code) do update set description = excluded.description;

insert into private.default_role_permissions(role_name, permission_code)
select role_name, permission_code
from (values
 ('Member', 'loop.view'),
 ('Depositor', 'loop.view'),
 ('Treasurer', 'loop.view'),
 ('Approver', 'loop.view'),
 ('Leader', 'loop.view'),
 ('Leader', 'loop.manage'),
 ('Manager', 'loop.view'),
 ('Manager', 'loop.manage')
) selected(role_name, permission_code)
on conflict do nothing;

insert into public.role_permissions(clan_id, role_id, permission_code)
select r.clan_id, r.id, selected.permission_code
from public.clan_roles r
join (values
 ('Member', 'loop.view'),
 ('Depositor', 'loop.view'),
 ('Treasurer', 'loop.view'),
 ('Approver', 'loop.view'),
 ('Leader', 'loop.view'),
 ('Leader', 'loop.manage'),
 ('Manager', 'loop.view'),
 ('Manager', 'loop.manage')
) selected(role_name, permission_code) on selected.role_name = r.name::text
where r.is_system_role
on conflict do nothing;

create table public.loop_timers (
 id uuid primary key default gen_random_uuid(),
 clan_id uuid not null references public.clans(id),
 name text not null check (length(btrim(name)) between 1 and 100),
 owner_type text not null check (owner_type in ('CLAN','MEMBER')),
 member_id uuid,
 loop_count integer not null check (loop_count between 1 and 100),
 current_loop integer not null default 1 check (current_loop between 1 and 100),
 timer_type text not null check (timer_type in ('COUNTDOWN','CLOCK')),
 countdown_seconds integer check (countdown_seconds between 1 and 86400),
 clock_time time without time zone,
 siren_enabled boolean not null default true,
 status text not null default 'ACTIVE' check (status in ('ACTIVE','COMPLETED','CANCELLED')),
 next_alert_at timestamptz,
 created_by uuid not null references public.profiles(id),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 unique (clan_id, id),
 foreign key (clan_id, member_id) references public.clan_members(clan_id, id),
 check ((owner_type='CLAN' and member_id is null) or (owner_type='MEMBER' and member_id is not null)),
 check ((timer_type='COUNTDOWN' and countdown_seconds is not null and clock_time is null)
     or (timer_type='CLOCK' and countdown_seconds is null and clock_time is not null)),
 check (current_loop <= loop_count),
 check ((status='ACTIVE' and next_alert_at is not null) or (status<>'ACTIVE' and next_alert_at is null))
);

create table public.loop_checkpoints (
 id uuid primary key default gen_random_uuid(),
 clan_id uuid not null references public.clans(id),
 loop_timer_id uuid not null,
 loop_number integer not null check (loop_number between 1 and 100),
 scheduled_for timestamptz not null,
 recorded_at timestamptz not null default now(),
 recorded_by uuid not null references public.profiles(id),
 created_at timestamptz not null default now(),
 foreign key (clan_id, loop_timer_id) references public.loop_timers(clan_id, id),
 unique (clan_id, loop_timer_id, loop_number)
);

create index loop_timers_active on public.loop_timers(clan_id, status, next_alert_at);
create index loop_timers_member on public.loop_timers(clan_id, member_id, status);
create index loop_checkpoints_history on public.loop_checkpoints(clan_id, loop_timer_id, loop_number);

alter table public.loop_timers enable row level security;
alter table public.loop_timers force row level security;
alter table public.loop_checkpoints enable row level security;
alter table public.loop_checkpoints force row level security;

create policy loop_timers_read on public.loop_timers
 for select to authenticated using (public.has_clan_permission(clan_id, 'loop.view'));
create policy loop_checkpoints_read on public.loop_checkpoints
 for select to authenticated using (public.has_clan_permission(clan_id, 'loop.view'));
grant select on public.loop_timers, public.loop_checkpoints to authenticated;

create trigger touch_updated before update on public.loop_timers
 for each row execute function private.touch_updated_at();
create trigger audit_mutations after insert or update or delete on public.loop_timers
 for each row execute function private.write_audit();
create trigger audit_mutations after insert or update or delete on public.loop_checkpoints
 for each row execute function private.write_audit();

create function public.create_loop_timer(
 p_clan_id uuid,
 p_name text,
 p_owner_type text,
 p_member_id uuid,
 p_loop_count integer,
 p_timer_type text,
 p_countdown_seconds integer,
 p_clock_time time without time zone,
 p_siren_enabled boolean
) returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
 actor uuid := auth.uid();
 new_id uuid;
 target timestamptz;
begin
 if actor is null or not public.has_clan_permission(p_clan_id, 'loop.manage') then
  raise exception 'Not authorized' using errcode = '42501';
 end if;
 perform 1 from public.clans where id=p_clan_id and status='ACTIVE' for update;
 if not found then raise exception 'Not authorized' using errcode = '42501'; end if;
 if length(btrim(p_name)) not between 1 and 100 or p_loop_count not between 1 and 100
  or p_owner_type not in ('CLAN','MEMBER') or p_timer_type not in ('COUNTDOWN','CLOCK')
  or (p_owner_type='CLAN' and p_member_id is not null)
  or (p_owner_type='MEMBER' and p_member_id is null)
  or (p_timer_type='COUNTDOWN' and (p_countdown_seconds not between 1 and 86400 or p_clock_time is not null))
  or (p_timer_type='CLOCK' and (p_countdown_seconds is not null or p_clock_time is null)) then
  raise exception 'Invalid loop timer' using errcode = '22023';
 end if;
 if p_member_id is not null and not exists(
  select 1 from public.clan_members
  where id=p_member_id and clan_id=p_clan_id and status='ACTIVE'
 ) then raise exception 'Member not found' using errcode = 'P0002'; end if;

 if p_timer_type='COUNTDOWN' then
  target := now() + make_interval(secs => p_countdown_seconds);
 else
  target := (((now() at time zone 'Asia/Bangkok')::date + p_clock_time) at time zone 'Asia/Bangkok');
  if target <= now() then target := target + interval '1 day'; end if;
 end if;

 insert into public.loop_timers(
  clan_id,name,owner_type,member_id,loop_count,timer_type,countdown_seconds,
  clock_time,siren_enabled,next_alert_at,created_by
 ) values(
  p_clan_id,btrim(p_name),p_owner_type,p_member_id,p_loop_count,p_timer_type,
  p_countdown_seconds,p_clock_time,coalesce(p_siren_enabled,false),target,actor
 ) returning id into new_id;
 return new_id;
end
$$;

create function public.acknowledge_loop_timer(
 p_clan_id uuid,p_loop_timer_id uuid
) returns text
language plpgsql security definer set search_path = ''
as $$
declare
 actor uuid := auth.uid();
 timer public.loop_timers;
begin
 if actor is null or not public.has_clan_permission(p_clan_id, 'loop.manage') then
  raise exception 'Not authorized' using errcode = '42501';
 end if;
 perform 1 from public.clans where id=p_clan_id and status='ACTIVE' for update;
 if not found then raise exception 'Not authorized' using errcode = '42501'; end if;
 select * into timer from public.loop_timers
 where id=p_loop_timer_id and clan_id=p_clan_id for update;
 if not found then raise exception 'Loop not found' using errcode = 'P0002'; end if;
 if timer.status<>'ACTIVE' or timer.next_alert_at>now() then
  raise exception 'Loop is not due' using errcode = '22023';
 end if;

 insert into public.loop_checkpoints(
  clan_id,loop_timer_id,loop_number,scheduled_for,recorded_by
 ) values(p_clan_id,timer.id,timer.current_loop,timer.next_alert_at,actor);

 if timer.current_loop >= timer.loop_count then
  update public.loop_timers
  set status='COMPLETED',next_alert_at=null
  where id=timer.id and clan_id=p_clan_id;
  return 'COMPLETED';
 end if;

 update public.loop_timers
 set current_loop=timer.current_loop+1,
     next_alert_at=case
      when timer.timer_type='COUNTDOWN'
       then now()+make_interval(secs=>timer.countdown_seconds)
      else timer.next_alert_at+interval '1 day'
     end
 where id=timer.id and clan_id=p_clan_id;
 return 'ACTIVE';
end
$$;

create function public.cancel_loop_timer(
 p_clan_id uuid,p_loop_timer_id uuid
) returns uuid
language plpgsql security definer set search_path = ''
as $$
begin
 if not public.has_clan_permission(p_clan_id, 'loop.manage') then
  raise exception 'Not authorized' using errcode = '42501';
 end if;
 update public.loop_timers set status='CANCELLED',next_alert_at=null
 where id=p_loop_timer_id and clan_id=p_clan_id and status='ACTIVE';
 if not found then raise exception 'Active Loop not found' using errcode = 'P0002'; end if;
 return p_loop_timer_id;
end
$$;

revoke all on function public.create_loop_timer(uuid,text,text,uuid,integer,text,integer,time without time zone,boolean),
 public.acknowledge_loop_timer(uuid,uuid), public.cancel_loop_timer(uuid,uuid)
 from public,anon;
grant execute on function public.create_loop_timer(uuid,text,text,uuid,integer,text,integer,time without time zone,boolean),
 public.acknowledge_loop_timer(uuid,uuid), public.cancel_loop_timer(uuid,uuid)
 to authenticated;
