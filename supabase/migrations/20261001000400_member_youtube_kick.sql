-- Personal records only: these values never mutate Inventory stock.
create or replace function private.valid_member_social_links(value jsonb) returns boolean
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
    when 'youtubeUrl' then '^https://(youtube\.com|www\.youtube\.com|m\.youtube\.com|youtu\.be)/[^[:space:]\\]+$'
    when 'kickUrl' then '^https://(kick\.com|www\.kick\.com)/[^[:space:]\\]+$'
   end,false)) end;
$$;
