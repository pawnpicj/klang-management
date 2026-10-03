alter table public.clans add column members_preview_columns text[] not null default array['MEMBER','SOCIAL','EQUIPMENT'];
create function private.valid_member_preview_columns(value text[]) returns boolean
language sql immutable set search_path='' as $$
 select coalesce(cardinality(value) between 1 and 3 and value <@ array['MEMBER','SOCIAL','EQUIPMENT']::text[]
 and array_position(value,null) is null and cardinality(value)=(select count(distinct item) from unnest(value) item),false);
$$;
alter table public.clans add constraint clan_member_preview_columns_valid check(private.valid_member_preview_columns(members_preview_columns));
create function public.set_member_preview_settings(p_clan_id uuid,p_enabled boolean,p_columns text[])
returns void language plpgsql security definer set search_path='' as $$
begin
 if not public.has_clan_permission(p_clan_id,'clan.manage') then raise exception 'Not authorized' using errcode='42501'; end if;
 if not private.valid_member_preview_columns(p_columns) then raise exception 'Invalid columns' using errcode='22023'; end if;
 perform public.set_member_preview_public(p_clan_id,p_enabled);
 update public.clans set members_preview_columns=p_columns where id=p_clan_id;
end $$;
revoke all on function public.set_member_preview_settings(uuid,boolean,text[]) from public,anon;
grant execute on function public.set_member_preview_settings(uuid,boolean,text[]) to authenticated;
create function public.get_public_member_preview_settings(p_clan_slug text)
returns table(slug text,name text,columns text[]) language sql stable security definer set search_path='' as $$
 select c.slug,c.name,c.members_preview_columns from public.clans c where c.slug=p_clan_slug and c.members_preview_public and c.status='ACTIVE';
$$;
revoke all on function public.get_public_member_preview_settings(text) from public;
grant execute on function public.get_public_member_preview_settings(text) to anon,authenticated;
create or replace function public.get_public_member_preview(p_clan_slug text)
returns table(character_name text,social_links jsonb,equipment jsonb)
language sql stable security definer set search_path='' as $$
 select case when 'MEMBER'=any(c.members_preview_columns) then m.character_name else '' end,
 case when 'SOCIAL'=any(c.members_preview_columns) then m.social_links else '{}'::jsonb end,
 case when 'EQUIPMENT'=any(c.members_preview_columns) then coalesce((select jsonb_agg(jsonb_build_object('category',item->>'category','name',item->>'name') order by ordinal)
 from jsonb_array_elements(m.equipment) with ordinality as items(item,ordinal)),'[]'::jsonb) else '[]'::jsonb end
 from public.clans c join public.clan_members m on m.clan_id=c.id
 where c.slug=p_clan_slug and c.members_preview_public and c.status='ACTIVE' and m.status='ACTIVE'
 order by m.joined_at,m.id;
$$;
