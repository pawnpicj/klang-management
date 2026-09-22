-- Change a member's role through one permission-checked, tenant-scoped API.
create function public.update_clan_member_role(
 p_clan_id uuid,
 p_member_id uuid,
 p_role_id uuid
) returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare existing_role_id uuid;
begin
 if not public.has_clan_permission(p_clan_id, 'member.manage') then
  raise exception 'Not authorized' using errcode = '42501';
 end if;

 -- Serialize role changes so two managers cannot demote each other concurrently.
 perform 1 from public.clans
 where id = p_clan_id and status = 'ACTIVE' for update;
 if not found then
  raise exception 'Not authorized' using errcode = '42501';
 end if;

 perform 1 from public.clan_roles
 where id = p_role_id and clan_id = p_clan_id;
 if not found then
  raise exception 'Role not found' using errcode = 'P0002';
 end if;

 select role_id into existing_role_id
 from public.clan_members
 where id = p_member_id and clan_id = p_clan_id and status = 'ACTIVE'
 for update;
 if not found then
  raise exception 'Member not found' using errcode = 'P0002';
 end if;

 if existing_role_id <> p_role_id then
  update public.clan_members set role_id = p_role_id
  where id = p_member_id and clan_id = p_clan_id;
 end if;

 return p_member_id;
end
$$;

revoke all on function public.update_clan_member_role(uuid,uuid,uuid)
from public, anon;
grant execute on function public.update_clan_member_role(uuid,uuid,uuid)
to authenticated;
