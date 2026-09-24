-- Add a target quantity to each asset and expose it through management RPCs.
alter table public.assets
  add column required_quantity numeric(20,4) not null default 0
  check (required_quantity >= 0 and required_quantity <> 'NaN'::numeric);

create function public.create_asset_with_required_quantity(
 p_clan_id uuid,p_code text,p_name text,p_asset_type text,p_unit text,
 p_required_quantity numeric default 0,p_decimal_places integer default 0,
 p_allow_negative boolean default false,p_image_url text default null
) returns uuid
language plpgsql security definer set search_path = ''
as $$
declare new_id uuid;
begin
 if not public.has_clan_permission(p_clan_id,'asset.manage') then
  raise exception 'Not authorized' using errcode = '42501';
 end if;
 perform 1 from public.clans where id=p_clan_id and status='ACTIVE' for update;
 if not found then raise exception 'Not authorized' using errcode = '42501'; end if;
 if length(btrim(p_code)) not between 1 and 50 or length(btrim(p_name)) not between 1 and 100
  or p_asset_type not in ('CURRENCY','ITEM') or length(btrim(p_unit)) not between 1 and 30
  or p_required_quantity < 0 or p_required_quantity = 'NaN'::numeric
  or p_decimal_places not between 0 and 4 or length(coalesce(p_image_url,'')) > 2048 then
  raise exception 'Invalid asset details' using errcode = '22023';
 end if;
 insert into public.assets(clan_id,code,name,asset_type,unit,required_quantity,image_url,decimal_places,allow_negative,created_by)
 values(p_clan_id,btrim(p_code),btrim(p_name),p_asset_type,btrim(p_unit),p_required_quantity,nullif(btrim(p_image_url),''),p_decimal_places,p_allow_negative,auth.uid())
 returning id into new_id;
 return new_id;
end
$$;

create function public.update_asset_details_with_required_quantity(
 p_clan_id uuid,p_asset_id uuid,p_name text,p_required_quantity numeric,
 p_image_url text default null
) returns uuid
language plpgsql security definer set search_path = ''
as $$
begin
 if not public.has_clan_permission(p_clan_id,'asset.manage') then
  raise exception 'Not authorized' using errcode = '42501';
 end if;
 perform 1 from public.clans where id=p_clan_id and status='ACTIVE' for update;
 if not found then raise exception 'Not authorized' using errcode = '42501'; end if;
 if length(btrim(p_name)) not between 1 and 100 or p_required_quantity < 0
  or p_required_quantity = 'NaN'::numeric or length(coalesce(p_image_url,'')) > 2048 then
  raise exception 'Invalid asset details' using errcode = '22023';
 end if;
 update public.assets
 set name=btrim(p_name),required_quantity=p_required_quantity,image_url=nullif(btrim(p_image_url),'')
 where id=p_asset_id and clan_id=p_clan_id and is_active;
 if not found then raise exception 'Asset not found' using errcode = 'P0002'; end if;
 return p_asset_id;
end
$$;

revoke all on function public.create_asset_with_required_quantity(uuid,text,text,text,text,numeric,integer,boolean,text),
 public.update_asset_details_with_required_quantity(uuid,uuid,text,numeric,text) from public,anon;
grant execute on function public.create_asset_with_required_quantity(uuid,text,text,text,text,numeric,integer,boolean,text),
 public.update_asset_details_with_required_quantity(uuid,uuid,text,numeric,text) to authenticated;