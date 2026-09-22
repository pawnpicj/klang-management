-- Custom roles and their permissions are written atomically.
create function public.create_custom_role(
 p_clan_id uuid,
 p_name text,
 p_permission_codes text[] default '{}'
) returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare clean_name text := btrim(p_name); new_role_id uuid;
begin
 if not public.has_clan_permission(p_clan_id, 'member.manage') then
  raise exception 'Not authorized' using errcode = '42501';
 end if;
 perform 1 from public.clans where id = p_clan_id and status = 'ACTIVE' for update;
 if not found then raise exception 'Not authorized' using errcode = '42501'; end if;
 if length(clean_name) not between 1 and 80 then
  raise exception 'Invalid role name' using errcode = '22023';
 end if;
 if exists (
  select 1
  from unnest(coalesce(p_permission_codes, '{}'::text[])) selected(permission_code)
  where not exists(select 1 from public.permissions p where p.code = selected.permission_code)
 ) then raise exception 'Invalid permission' using errcode = '22023'; end if;

 insert into public.clan_roles(clan_id,name,is_system_role)
 values(p_clan_id,clean_name,false) returning id into new_role_id;
 insert into public.role_permissions(clan_id,role_id,permission_code)
 select p_clan_id,new_role_id,code
 from (select distinct unnest(coalesce(p_permission_codes, '{}'::text[])) code) selected;
 return new_role_id;
end
$$;

create function public.update_custom_role(
 p_clan_id uuid,
 p_role_id uuid,
 p_name text,
 p_permission_codes text[] default '{}'
) returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare clean_name text := btrim(p_name);
begin
 if not public.has_clan_permission(p_clan_id, 'member.manage') then
  raise exception 'Not authorized' using errcode = '42501';
 end if;
 perform 1 from public.clans where id = p_clan_id and status = 'ACTIVE' for update;
 if not found then raise exception 'Not authorized' using errcode = '42501'; end if;
 if length(clean_name) not between 1 and 80 then
  raise exception 'Invalid role name' using errcode = '22023';
 end if;
 if exists (
  select 1
  from unnest(coalesce(p_permission_codes, '{}'::text[])) selected(permission_code)
  where not exists(select 1 from public.permissions p where p.code = selected.permission_code)
 ) then raise exception 'Invalid permission' using errcode = '22023'; end if;

 update public.clan_roles set name = clean_name
 where id = p_role_id and clan_id = p_clan_id and not is_system_role;
 if not found then raise exception 'Custom role not found' using errcode = 'P0002'; end if;
 delete from public.role_permissions where clan_id = p_clan_id and role_id = p_role_id;
 insert into public.role_permissions(clan_id,role_id,permission_code)
 select p_clan_id,p_role_id,code
 from (select distinct unnest(coalesce(p_permission_codes, '{}'::text[])) code) selected;
 return p_role_id;
end
$$;

create function public.delete_custom_role(p_clan_id uuid,p_role_id uuid) returns uuid
language plpgsql
security definer
set search_path = ''
as $$
begin
 if not public.has_clan_permission(p_clan_id, 'member.manage') then
  raise exception 'Not authorized' using errcode = '42501';
 end if;
 perform 1 from public.clans where id = p_clan_id and status = 'ACTIVE' for update;
 if not found then raise exception 'Not authorized' using errcode = '42501'; end if;
 delete from public.clan_roles
 where id = p_role_id and clan_id = p_clan_id and not is_system_role;
 if not found then raise exception 'Custom role not found' using errcode = 'P0002'; end if;
 return p_role_id;
end
$$;

revoke all on function public.create_custom_role(uuid,text,text[]),
 public.update_custom_role(uuid,uuid,text,text[]),
 public.delete_custom_role(uuid,uuid)
from public, anon;
grant execute on function public.create_custom_role(uuid,text,text[]),
 public.update_custom_role(uuid,uuid,text,text[]),
 public.delete_custom_role(uuid,uuid)
to authenticated;
