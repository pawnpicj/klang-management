-- Clan communication links; existing clan.manage authorization remains in force.
alter table public.clans
 add column discord_url text,
 add column line_url text,
 add column telegram_url text,
 add constraint clans_discord_url check (discord_url is null or (length(discord_url)<=1000 and discord_url ~ '^https://(discord\.gg|discord\.com)/[^[:space:]\\]+$')),
 add constraint clans_line_url check (line_url is null or (length(line_url)<=1000 and line_url ~ '^https://(line\.me|lin\.ee)/[^[:space:]\\]+$')),
 add constraint clans_telegram_url check (telegram_url is null or (length(telegram_url)<=1000 and telegram_url ~ '^https://(t\.me|telegram\.me)/[^[:space:]\\]+$'));

create function public.update_clan_details_with_social(
 p_clan_id uuid, p_name text, p_type text, p_note text, p_rules text,
 p_discord_url text, p_line_url text, p_telegram_url text
) returns uuid language plpgsql security definer set search_path='' as $$
begin
 -- Both updates are atomic. The existing function checks clan.manage and ACTIVE status.
 perform public.update_clan_details_with_content(p_clan_id,p_name,p_type,p_note,p_rules);
 update public.clans set
  discord_url=nullif(btrim(coalesce(p_discord_url,'')),''),
  line_url=nullif(btrim(coalesce(p_line_url,'')),''),
  telegram_url=nullif(btrim(coalesce(p_telegram_url,'')),''),
  updated_at=now()
 where id=p_clan_id;
 return p_clan_id;
end $$;
revoke all on function public.update_clan_details_with_social(uuid,text,text,text,text,text,text,text) from public,anon;
grant execute on function public.update_clan_details_with_social(uuid,text,text,text,text,text,text,text) to authenticated;
