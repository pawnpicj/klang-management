-- Store descriptive Note and Rule content for each Clan/Gang.
alter table public.clans
 add column note text,
 add column rules text,
 add constraint clans_note_length check (note is null or char_length(note) <= 2000),
 add constraint clans_rules_length check (rules is null or char_length(rules) <= 10000);

create function public.update_clan_details_with_content(
 p_clan_id uuid,
 p_name text,
 p_type text,
 p_note text,
 p_rules text
) returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
 clean_name text := btrim(p_name);
 clean_note text := nullif(btrim(coalesce(p_note, '')), '');
 clean_rules text := nullif(btrim(coalesce(p_rules, '')), '');
begin
 if not public.has_clan_permission(p_clan_id, 'clan.manage') then
  raise exception 'Not authorized' using errcode = '42501';
 end if;
 if length(clean_name) not between 1 and 100
  or p_type not in ('CLAN','GANG')
  or length(coalesce(clean_note, '')) > 2000
  or length(coalesce(clean_rules, '')) > 10000 then
  raise exception 'Invalid Clan details' using errcode = '22023';
 end if;

 update public.clans
 set name = clean_name,
     type = p_type,
     note = clean_note,
     rules = clean_rules,
     updated_at = now()
 where id = p_clan_id and status = 'ACTIVE';
 if not found then
  raise exception 'Not authorized' using errcode = '42501';
 end if;
 return p_clan_id;
end
$$;

revoke all on function public.update_clan_details_with_content(uuid,text,text,text,text)
 from public, anon;
grant execute on function public.update_clan_details_with_content(uuid,text,text,text,text)
 to authenticated;
