-- Personal records only: these values never mutate Inventory stock.
create function private.valid_member_social_links(value jsonb) returns boolean
 language sql immutable set search_path='' as $$
 select case when jsonb_typeof(value) is distinct from 'object' then false else
  not exists(select 1 from jsonb_each(value) entry where
   jsonb_typeof(entry.value) <> 'string' or length(entry.value #>> '{}') > 1000 or
   not coalesce((entry.value #>> '{}') ~ case entry.key
    when 'discordUrl' then '^https://(discord\.gg|discord\.com)/[^[:space:]\\]+$'
    when 'lineUrl' then '^https://(line\.me|lin\.ee)/[^[:space:]\\]+$'
    when 'telegramUrl' then '^https://(t\.me|telegram\.me)/[^[:space:]\\]+$'
    when 'facebookUrl' then '^https://(facebook\.com|www\.facebook\.com|m\.facebook\.com|web\.facebook\.com|fb\.me)/[^[:space:]\\]+$'
    when 'tiktokUrl' then '^https://(tiktok\.com|www\.tiktok\.com|m\.tiktok\.com|vm\.tiktok\.com|vt\.tiktok\.com)/[^[:space:]\\]+$'
   end,false)) end;
$$;
create function private.valid_member_equipment(value jsonb) returns boolean
 language sql immutable set search_path='' as $$
 select case when jsonb_typeof(value) is distinct from 'array' then false
  when jsonb_array_length(value)>100 then false else
  not exists(select 1 from jsonb_array_elements(value) item where
   jsonb_typeof(item) is distinct from 'object' or
   coalesce(item->>'category','') not in ('WEAPON','MEDICINE','GRENADE') or
   jsonb_typeof(item->'name') is distinct from 'string' or length(btrim(coalesce(item->>'name',''))) not between 1 and 100 or
   jsonb_typeof(item->'quantity') is distinct from 'number' or
   not coalesce((item->>'quantity') ~ '^[1-9][0-9]{0,5}$|^1000000$',false)) end;
$$;
alter table public.clan_members
 add column social_links jsonb not null default '{}'::jsonb,
 add column equipment jsonb not null default '[]'::jsonb,
 add constraint clan_members_social_links_valid check(private.valid_member_social_links(social_links)),
 add constraint clan_members_equipment_valid check(private.valid_member_equipment(equipment));
create function public.update_clan_member_profile(
 p_clan_id uuid,p_member_id uuid,p_character_name text,p_role_id uuid,p_delivery_started_on date,
 p_social_links jsonb,p_equipment jsonb
) returns uuid language plpgsql security definer set search_path='' as $$
begin
 if not public.has_clan_permission(p_clan_id,'member.manage') then
  raise exception 'Not authorized' using errcode='42501';
 end if;
 if not private.valid_member_social_links(p_social_links) or not private.valid_member_equipment(p_equipment) then
  raise exception 'Invalid member profile' using errcode='22023';
 end if;
 perform public.update_clan_member_details(p_clan_id,p_member_id,p_character_name,p_role_id,p_delivery_started_on);
 update public.clan_members set social_links=p_social_links,equipment=p_equipment,updated_at=now()
 where id=p_member_id and clan_id=p_clan_id and status='ACTIVE';
 return p_member_id;
end $$;
revoke all on function public.update_clan_member_profile(uuid,uuid,text,uuid,date,jsonb,jsonb) from public,anon;
grant execute on function public.update_clan_member_profile(uuid,uuid,text,uuid,date,jsonb,jsonb) to authenticated;
