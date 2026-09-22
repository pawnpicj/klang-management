-- Roster members may exist before they create an application account.
alter table public.clan_members alter column user_id drop not null;

create function public.add_clan_member(
 p_clan_id uuid,
 p_character_name text
) returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
 actor uuid := auth.uid();
 member_role uuid;
 new_member uuid;
 clean_name text := btrim(p_character_name);
begin
 if actor is null or not public.has_clan_permission(p_clan_id, 'member.manage') then
  raise exception 'Not authorized' using errcode = '42501';
 end if;
 if length(clean_name) not between 1 and 100 then
  raise exception 'Invalid character name' using errcode = '22023';
 end if;

 -- Serialize roster additions so the case-insensitive duplicate check is safe.
 perform 1 from public.clans where id = p_clan_id and status = 'ACTIVE' for update;
 if not found then
  raise exception 'Not authorized' using errcode = '42501';
 end if;
 if exists (
  select 1 from public.clan_members
  where clan_id = p_clan_id
   and status = 'ACTIVE'
   and lower(btrim(character_name)) = lower(clean_name)
 ) then
  raise exception 'Member already exists' using errcode = '23505';
 end if;

 select id into member_role
 from public.clan_roles
 where clan_id = p_clan_id and is_system_role and name::text = 'Member';
 if member_role is null then
  raise exception 'Default Member role is missing' using errcode = '23514';
 end if;

 insert into public.clan_members(
  clan_id, user_id, role_id, character_name, status, joined_at
 ) values (
  p_clan_id, null, member_role, clean_name, 'ACTIVE', now()
 ) returning id into new_member;

 return new_member;
end
$$;

revoke all on function public.add_clan_member(uuid, text) from public, anon;
grant execute on function public.add_clan_member(uuid, text) to authenticated;
