-- Phase 5: permission-checked Asset and Warehouse management APIs.
create function public.create_warehouse(
 p_clan_id uuid,p_name text,p_description text default null
) returns uuid
language plpgsql security definer set search_path = ''
as $$
declare clean_name text := btrim(p_name); new_id uuid;
begin
 if not public.has_clan_permission(p_clan_id,'warehouse.create') then
  raise exception 'Not authorized' using errcode = '42501';
 end if;
 perform 1 from public.clans where id=p_clan_id and status='ACTIVE' for update;
 if not found then raise exception 'Not authorized' using errcode = '42501'; end if;
 if length(clean_name) not between 1 and 100 or length(coalesce(p_description,'')) > 500 then
  raise exception 'Invalid warehouse details' using errcode = '22023';
 end if;
 insert into public.warehouses(clan_id,name,description,created_by)
 values(p_clan_id,clean_name,nullif(btrim(p_description),''),auth.uid()) returning id into new_id;
 return new_id;
end
$$;

create function public.update_warehouse_details(
 p_clan_id uuid,p_warehouse_id uuid,p_name text,p_description text default null
) returns uuid
language plpgsql security definer set search_path = ''
as $$
declare clean_name text := btrim(p_name);
begin
 if not public.has_clan_permission(p_clan_id,'warehouse.edit') then
  raise exception 'Not authorized' using errcode = '42501';
 end if;
 perform 1 from public.clans where id=p_clan_id and status='ACTIVE' for update;
 if not found then raise exception 'Not authorized' using errcode = '42501'; end if;
 if length(clean_name) not between 1 and 100 or length(coalesce(p_description,'')) > 500 then
  raise exception 'Invalid warehouse details' using errcode = '22023';
 end if;
 update public.warehouses set name=clean_name,description=nullif(btrim(p_description),'')
 where id=p_warehouse_id and clan_id=p_clan_id and is_active;
 if not found then raise exception 'Warehouse not found' using errcode = 'P0002'; end if;
 return p_warehouse_id;
end
$$;

create function public.set_default_warehouse(p_clan_id uuid,p_warehouse_id uuid) returns uuid
language plpgsql security definer set search_path = ''
as $$
begin
 if not public.has_clan_permission(p_clan_id,'warehouse.edit') then
  raise exception 'Not authorized' using errcode = '42501';
 end if;
 perform 1 from public.clans where id=p_clan_id and status='ACTIVE' for update;
 if not found then raise exception 'Not authorized' using errcode = '42501'; end if;
 perform 1 from public.warehouses where id=p_warehouse_id and clan_id=p_clan_id and is_active for update;
 if not found then raise exception 'Warehouse not found' using errcode = 'P0002'; end if;
 update public.warehouses set is_default=false where clan_id=p_clan_id and is_default;
 update public.warehouses set is_default=true where id=p_warehouse_id and clan_id=p_clan_id;
 return p_warehouse_id;
end
$$;

create function public.deactivate_warehouse(p_clan_id uuid,p_warehouse_id uuid) returns uuid
language plpgsql security definer set search_path = ''
as $$
declare target public.warehouses;
begin
 if not public.has_clan_permission(p_clan_id,'warehouse.edit') then
  raise exception 'Not authorized' using errcode = '42501';
 end if;
 perform 1 from public.clans where id=p_clan_id and status='ACTIVE' for update;
 if not found then raise exception 'Not authorized' using errcode = '42501'; end if;
 select * into target from public.warehouses
 where id=p_warehouse_id and clan_id=p_clan_id and is_active for update;
 if not found then raise exception 'Warehouse not found' using errcode = 'P0002'; end if;
 if target.is_default then
  raise exception 'Default warehouse cannot be deactivated' using errcode = '23514';
 end if;
 if exists(select 1 from public.warehouse_asset_balances where clan_id=p_clan_id and warehouse_id=p_warehouse_id and balance<>0) then
  raise exception 'Warehouse has a balance' using errcode = '23514';
 end if;
 update public.warehouses set is_active=false where id=p_warehouse_id;
 return p_warehouse_id;
end
$$;

create function public.create_asset(
 p_clan_id uuid,p_code text,p_name text,p_asset_type text,p_unit text,
 p_decimal_places integer default 0,p_allow_negative boolean default false,p_image_url text default null
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
  or p_decimal_places not between 0 and 4 or length(coalesce(p_image_url,'')) > 2048 then
  raise exception 'Invalid asset details' using errcode = '22023';
 end if;
 insert into public.assets(clan_id,code,name,asset_type,unit,image_url,decimal_places,allow_negative,created_by)
 values(p_clan_id,btrim(p_code),btrim(p_name),p_asset_type,btrim(p_unit),nullif(btrim(p_image_url),''),p_decimal_places,p_allow_negative,auth.uid())
 returning id into new_id;
 return new_id;
end
$$;

create function public.update_asset_details(
 p_clan_id uuid,p_asset_id uuid,p_name text,p_image_url text default null
) returns uuid
language plpgsql security definer set search_path = ''
as $$
begin
 if not public.has_clan_permission(p_clan_id,'asset.manage') then
  raise exception 'Not authorized' using errcode = '42501';
 end if;
 perform 1 from public.clans where id=p_clan_id and status='ACTIVE' for update;
 if not found then raise exception 'Not authorized' using errcode = '42501'; end if;
 if length(btrim(p_name)) not between 1 and 100 or length(coalesce(p_image_url,'')) > 2048 then
  raise exception 'Invalid asset details' using errcode = '22023';
 end if;
 update public.assets set name=btrim(p_name),image_url=nullif(btrim(p_image_url),'')
 where id=p_asset_id and clan_id=p_clan_id and is_active;
 if not found then raise exception 'Asset not found' using errcode = 'P0002'; end if;
 return p_asset_id;
end
$$;

create function public.deactivate_asset(p_clan_id uuid,p_asset_id uuid) returns uuid
language plpgsql security definer set search_path = ''
as $$
begin
 if not public.has_clan_permission(p_clan_id,'asset.manage') then
  raise exception 'Not authorized' using errcode = '42501';
 end if;
 perform 1 from public.clans where id=p_clan_id and status='ACTIVE' for update;
 if not found then raise exception 'Not authorized' using errcode = '42501'; end if;
 perform 1 from public.assets where id=p_asset_id and clan_id=p_clan_id and is_active for update;
 if not found then raise exception 'Asset not found' using errcode = 'P0002'; end if;
 if exists(select 1 from public.warehouse_asset_balances where clan_id=p_clan_id and asset_id=p_asset_id and balance<>0) then
  raise exception 'Asset has a balance' using errcode = '23514';
 end if;
 update public.assets set is_active=false where id=p_asset_id;
 return p_asset_id;
end
$$;

revoke all on function public.create_warehouse(uuid,text,text),public.update_warehouse_details(uuid,uuid,text,text),
 public.set_default_warehouse(uuid,uuid),public.deactivate_warehouse(uuid,uuid),
 public.create_asset(uuid,text,text,text,text,integer,boolean,text),
 public.update_asset_details(uuid,uuid,text,text),public.deactivate_asset(uuid,uuid)
from public,anon;
grant execute on function public.create_warehouse(uuid,text,text),public.update_warehouse_details(uuid,uuid,text,text),
 public.set_default_warehouse(uuid,uuid),public.deactivate_warehouse(uuid,uuid),
 public.create_asset(uuid,text,text,text,text,integer,boolean,text),
 public.update_asset_details(uuid,uuid,text,text),public.deactivate_asset(uuid,uuid)
to authenticated;
