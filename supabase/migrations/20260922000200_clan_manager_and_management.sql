-- The account that creates a Clan/Gang manages the system but is not
-- necessarily the in-game Leader.
drop trigger members_leader_required on public.clan_members;
drop trigger clans_leader_required on public.clans;
drop function private.require_leader();

insert into private.default_role_permissions(role_name, permission_code)
select 'Manager', code from public.permissions
on conflict do nothing;

insert into public.clan_roles(clan_id, name, is_system_role)
select id, 'Manager', true from public.clans
on conflict (clan_id, name) do nothing;

insert into public.role_permissions(clan_id, role_id, permission_code)
select r.clan_id, r.id, p.code
from public.clan_roles r
cross join public.permissions p
where r.is_system_role and r.name::text = 'Manager'
on conflict do nothing;

update public.clan_members m
set role_id = manager.id
from public.clan_roles old_role, public.clan_roles manager
where old_role.id = m.role_id
 and old_role.clan_id = m.clan_id
 and old_role.is_system_role
 and old_role.name::text = 'Leader'
 and manager.clan_id = m.clan_id
 and manager.is_system_role
 and manager.name::text = 'Manager';

create function private.require_manager() returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare tenant uuid;
begin
 tenant := (coalesce(to_jsonb(new),to_jsonb(old))->>(
  case when tg_table_name = 'clans' then 'id' else 'clan_id' end
 ))::uuid;
 if exists(select 1 from public.clans where id = tenant and status = 'ACTIVE')
  and not exists (
   select 1
   from public.clan_members m
   join public.clan_roles r
    on r.id = m.role_id and r.clan_id = m.clan_id
   where m.clan_id = tenant
    and m.status = 'ACTIVE'
    and r.is_system_role
    and r.name::text = 'Manager'
  ) then
  raise exception 'Clan must retain an active Manager' using errcode = '23514';
 end if;
 return null;
end
$$;

create constraint trigger members_manager_required
after insert or update or delete on public.clan_members
deferrable initially deferred
for each row execute function private.require_manager();

create constraint trigger clans_manager_required
after insert on public.clans
deferrable initially deferred
for each row execute function private.require_manager();

create or replace function public.create_clan(
 p_name text,
 p_slug text,
 p_type text,
 p_character_name text
) returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare tenant uuid; actor uuid := auth.uid(); manager_role uuid;
begin
 if actor is null or not exists(
  select 1 from public.profiles where id = actor and status = 'ACTIVE'
 ) then
  raise exception 'Not authorized' using errcode = '42501';
 end if;
 insert into public.clans(name,slug,type,created_by)
 values(btrim(p_name),p_slug,p_type,actor)
 returning id into tenant;
 insert into public.clan_roles(clan_id,name,is_system_role)
 select tenant,r,true
 from unnest(array[
  'Member','Depositor','Treasurer','Approver','Leader','Manager'
 ]) r;
 insert into public.role_permissions(clan_id,role_id,permission_code)
 select tenant,r.id,d.permission_code
 from public.clan_roles r
 join private.default_role_permissions d on d.role_name = r.name::text
 where r.clan_id = tenant;
 select id into manager_role
 from public.clan_roles
 where clan_id = tenant and is_system_role and name::text = 'Manager';
 insert into public.clan_members(
  clan_id,user_id,role_id,character_name,status,joined_at
 ) values (
  tenant,actor,manager_role,btrim(p_character_name),'ACTIVE',now()
 );
 insert into public.warehouses(clan_id,name,is_default,created_by)
 values(tenant,'Main Warehouse',true,actor);
 return tenant;
end
$$;

create function public.update_clan_details(
 p_clan_id uuid,
 p_name text,
 p_type text
) returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare clean_name text := btrim(p_name);
begin
 if not public.has_clan_permission(p_clan_id, 'clan.manage') then
  raise exception 'Not authorized' using errcode = '42501';
 end if;
 if length(clean_name) not between 1 and 100
  or p_type not in ('CLAN','GANG') then
  raise exception 'Invalid Clan details' using errcode = '22023';
 end if;
 update public.clans
 set name = clean_name, type = p_type
 where id = p_clan_id and status = 'ACTIVE';
 if not found then
  raise exception 'Not authorized' using errcode = '42501';
 end if;
 return p_clan_id;
end
$$;

create function public.archive_clan(p_clan_id uuid) returns uuid
language plpgsql
security definer
set search_path = ''
as $$
begin
 if not public.has_clan_permission(p_clan_id, 'clan.manage') then
  raise exception 'Not authorized' using errcode = '42501';
 end if;
 update public.clans set status = 'ARCHIVED'
 where id = p_clan_id and status = 'ACTIVE';
 if not found then
  raise exception 'Not authorized' using errcode = '42501';
 end if;
 return p_clan_id;
end
$$;

create function public.update_clan_member_name(
 p_clan_id uuid,
 p_member_id uuid,
 p_character_name text
) returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare clean_name text := btrim(p_character_name);
begin
 if not public.has_clan_permission(p_clan_id, 'member.manage') then
  raise exception 'Not authorized' using errcode = '42501';
 end if;
 if length(clean_name) not between 1 and 100 then
  raise exception 'Invalid character name' using errcode = '22023';
 end if;
 perform 1 from public.clans
 where id = p_clan_id and status = 'ACTIVE' for update;
 if not found then
  raise exception 'Not authorized' using errcode = '42501';
 end if;
 if exists (
  select 1 from public.clan_members
  where clan_id = p_clan_id
   and id <> p_member_id
   and status = 'ACTIVE'
   and lower(btrim(character_name)) = lower(clean_name)
 ) then
  raise exception 'Member already exists' using errcode = '23505';
 end if;
 update public.clan_members
 set character_name = clean_name
 where id = p_member_id and clan_id = p_clan_id and status = 'ACTIVE';
 if not found then
  raise exception 'Member not found' using errcode = 'P0002';
 end if;
 return p_member_id;
end
$$;

create function public.remove_clan_member(
 p_clan_id uuid,
 p_member_id uuid
) returns uuid
language plpgsql
security definer
set search_path = ''
as $$
begin
 if not public.has_clan_permission(p_clan_id, 'member.manage') then
  raise exception 'Not authorized' using errcode = '42501';
 end if;
 update public.clan_members
 set status = 'REMOVED'
 where id = p_member_id and clan_id = p_clan_id and status = 'ACTIVE';
 if not found then
  raise exception 'Member not found' using errcode = 'P0002';
 end if;
 return p_member_id;
end
$$;

revoke all on function public.update_clan_details(uuid,text,text),
 public.archive_clan(uuid),
 public.update_clan_member_name(uuid,uuid,text),
 public.remove_clan_member(uuid,uuid)
from public, anon;
grant execute on function public.update_clan_details(uuid,text,text),
 public.archive_clan(uuid),
 public.update_clan_member_name(uuid,uuid,text),
 public.remove_clan_member(uuid,uuid)
to authenticated;
