alter table public.clans
 add column facebook_url text,
 add column tiktok_url text,
 add constraint clans_facebook_url check (facebook_url is null or (length(facebook_url)<=1000 and facebook_url ~ '^https://(facebook\.com|www\.facebook\.com|m\.facebook\.com|web\.facebook\.com|fb\.me)/[^[:space:]\\]+$')),
 add constraint clans_tiktok_url check (tiktok_url is null or (length(tiktok_url)<=1000 and tiktok_url ~ '^https://(tiktok\.com|www\.tiktok\.com|m\.tiktok\.com|vm\.tiktok\.com|vt\.tiktok\.com)/[^[:space:]\\]+$'));
create function public.update_clan_details_with_social_links(
 p_clan_id uuid,p_name text,p_type text,p_note text,p_rules text,
 p_discord_url text,p_line_url text,p_telegram_url text,p_facebook_url text,p_tiktok_url text
) returns uuid language plpgsql security definer set search_path='' as $$
begin
 perform public.update_clan_details_with_social(p_clan_id,p_name,p_type,p_note,p_rules,p_discord_url,p_line_url,p_telegram_url);
 update public.clans set facebook_url=nullif(btrim(coalesce(p_facebook_url,'')),''),
  tiktok_url=nullif(btrim(coalesce(p_tiktok_url,'')),''),updated_at=now()
 where id=p_clan_id;
 return p_clan_id;
end $$;
revoke all on function public.update_clan_details_with_social_links(uuid,text,text,text,text,text,text,text,text,text) from public,anon;
grant execute on function public.update_clan_details_with_social_links(uuid,text,text,text,text,text,text,text,text,text) to authenticated;
