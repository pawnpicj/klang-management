alter table public.clans add column members_preview_public boolean not null default false;
create function public.set_member_preview_public(p_clan_id uuid,p_enabled boolean)
returns void language plpgsql security definer set search_path='' as $$
begin
 if not public.has_clan_permission(p_clan_id,'clan.manage') then raise exception 'Not authorized' using errcode='42501'; end if;
 if p_enabled is null then raise exception 'Invalid setting' using errcode='22023'; end if;
 update public.clans set members_preview_public=p_enabled,updated_at=now() where id=p_clan_id and status='ACTIVE';
 if not found then raise exception 'Clan not found' using errcode='P0002'; end if;
end $$;
revoke all on function public.set_member_preview_public(uuid,boolean) from public,anon;
grant execute on function public.set_member_preview_public(uuid,boolean) to authenticated;
create function public.list_public_member_clans()
returns table(slug text,name text) language sql stable security definer set search_path='' as $$
 select c.slug,c.name from public.clans c where c.members_preview_public and c.status='ACTIVE' order by c.name,c.slug;
$$;
create function public.get_public_member_preview(p_clan_slug text)
returns table(character_name text,social_links jsonb,equipment jsonb)
language sql stable security definer set search_path='' as $$
 select m.character_name,m.social_links,
 coalesce((select jsonb_agg(jsonb_build_object('category',item->>'category','name',item->>'name') order by ordinal)
 from jsonb_array_elements(m.equipment) with ordinality as items(item,ordinal)),'[]'::jsonb)
 from public.clans c join public.clan_members m on m.clan_id=c.id
 where c.slug=p_clan_slug and c.members_preview_public and c.status='ACTIVE' and m.status='ACTIVE'
 order by m.joined_at,m.id;
$$;
revoke all on function public.list_public_member_clans() from public;
revoke all on function public.get_public_member_preview(text) from public;
grant execute on function public.list_public_member_clans() to anon,authenticated;
grant execute on function public.get_public_member_preview(text) to anon,authenticated;
