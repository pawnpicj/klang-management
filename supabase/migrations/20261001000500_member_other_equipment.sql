create or replace function private.valid_member_equipment(value jsonb) returns boolean
 language sql immutable set search_path='' as $$
 select case when jsonb_typeof(value) is distinct from 'array' then false
  when jsonb_array_length(value)>100 then false else
  not exists(select 1 from jsonb_array_elements(value) item where
   jsonb_typeof(item) is distinct from 'object' or
   coalesce(item->>'category','') not in ('WEAPON','MEDICINE','GRENADE','OTHER') or
   jsonb_typeof(item->'name') is distinct from 'string' or length(btrim(coalesce(item->>'name',''))) not between 1 and 100 or
   jsonb_typeof(item->'quantity') is distinct from 'number' or
   not coalesce((item->>'quantity') ~ '^[1-9][0-9]{0,5}$|^1000000$',false)) end;
$$;
