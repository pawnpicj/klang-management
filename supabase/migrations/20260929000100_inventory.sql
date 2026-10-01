-- Simple inventory: permissions, low-stock thresholds, delivery inflows, and safe balance adjustments.
alter table public.assets
  add column low_stock_threshold numeric(20,4) not null default 0
  check (low_stock_threshold >= 0 and low_stock_threshold <> 'NaN'::numeric);

alter table public.member_deliveries
  add column warehouse_id uuid;

update public.member_deliveries d
set warehouse_id = w.id
from public.warehouses w
where w.clan_id = d.clan_id and w.is_default and w.is_active;

alter table public.member_deliveries
  alter column warehouse_id set not null,
  add constraint member_deliveries_clan_warehouse_fkey
    foreign key (clan_id, warehouse_id) references public.warehouses(clan_id, id);

create index member_deliveries_warehouse
  on public.member_deliveries(clan_id, warehouse_id, delivery_date, asset_id);

insert into public.permissions(code, description) values
 ('inventory.view', 'View inventory balances and history'),
 ('inventory.manage', 'Adjust inventory balances')
on conflict (code) do update set description = excluded.description;

insert into private.default_role_permissions(role_name, permission_code)
select role_name, permission_code
from (values
 ('Member', 'inventory.view'),
 ('Depositor', 'inventory.view'),
 ('Treasurer', 'inventory.view'),
 ('Treasurer', 'inventory.manage'),
 ('Approver', 'inventory.view'),
 ('Leader', 'inventory.view'),
 ('Leader', 'inventory.manage'),
 ('Manager', 'inventory.view'),
 ('Manager', 'inventory.manage')
) selected(role_name, permission_code)
on conflict do nothing;

insert into public.role_permissions(clan_id, role_id, permission_code)
select r.clan_id, r.id, selected.permission_code
from public.clan_roles r
join (values
 ('Member', 'inventory.view'),
 ('Depositor', 'inventory.view'),
 ('Treasurer', 'inventory.view'),
 ('Treasurer', 'inventory.manage'),
 ('Approver', 'inventory.view'),
 ('Leader', 'inventory.view'),
 ('Leader', 'inventory.manage'),
 ('Manager', 'inventory.view'),
 ('Manager', 'inventory.manage')
) selected(role_name, permission_code) on selected.role_name = r.name::text
where r.is_system_role
on conflict do nothing;

create policy inventory_assets_read on public.assets
 for select to authenticated using (public.has_clan_permission(clan_id, 'inventory.view'));
create policy inventory_warehouses_read on public.warehouses
 for select to authenticated using (public.has_clan_permission(clan_id, 'inventory.view'));
create policy inventory_transactions_read on public.transactions
 for select to authenticated using (public.has_clan_permission(clan_id, 'inventory.view'));
create policy inventory_items_read on public.transaction_items
 for select to authenticated using (public.has_clan_permission(clan_id, 'inventory.view'));
create policy inventory_deliveries_read on public.member_deliveries
 for select to authenticated using (public.has_clan_permission(clan_id, 'inventory.view'));

create or replace view public.warehouse_asset_balances with (security_invoker = true) as
 with movements as (
  select i.clan_id, flow.warehouse_id, i.asset_id, flow.delta
  from public.transaction_items i
  join public.transactions t on t.clan_id = i.clan_id and t.id = i.transaction_id
  cross join lateral (
   values (i.to_warehouse_id, i.quantity), (i.from_warehouse_id, -i.quantity)
  ) flow(warehouse_id, delta)
  where t.status = 'POSTED' and flow.warehouse_id is not null
  union all
  select d.clan_id, d.warehouse_id, d.asset_id, d.quantity
  from public.member_deliveries d
 )
 select clan_id, warehouse_id, asset_id, sum(delta)::numeric(20,4) as balance
 from movements
 group by clan_id, warehouse_id, asset_id;

create or replace function public.record_member_delivery(
 p_clan_id uuid,p_member_id uuid,p_asset_id uuid,p_delivery_date date,p_quantity numeric
) returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
 new_id uuid;
 tracking_start date;
 member_start date;
 asset_start date;
 asset_decimals integer;
 target_warehouse uuid;
begin
 if not public.has_clan_permission(p_clan_id,'member.manage') then
  raise exception 'Not authorized' using errcode = '42501';
 end if;
 select delivery_tracking_started_on into tracking_start
 from public.clans where id=p_clan_id and status='ACTIVE' for update;
 if not found then raise exception 'Not authorized' using errcode = '42501'; end if;

 select delivery_started_on into member_start
 from public.clan_members
 where id=p_member_id and clan_id=p_clan_id and status='ACTIVE';
 if not found then raise exception 'Member not found' using errcode = 'P0002'; end if;

 select created_at::date,decimal_places into asset_start,asset_decimals
 from public.assets
 where id=p_asset_id and clan_id=p_clan_id and is_active;
 if not found then raise exception 'Asset not found' using errcode = 'P0002'; end if;

 select id into target_warehouse from public.warehouses
 where clan_id=p_clan_id and is_default and is_active;
 if target_warehouse is null then
  raise exception 'Default warehouse not found' using errcode = 'P0002';
 end if;

 if p_delivery_date < greatest(tracking_start,member_start,asset_start)
  or p_delivery_date > (now() at time zone 'Asia/Bangkok')::date or p_quantity <= 0
  or p_quantity = 'NaN'::numeric or p_quantity <> round(p_quantity,asset_decimals) then
  raise exception 'Invalid delivery details' using errcode = '22023';
 end if;

 insert into public.member_deliveries(
  clan_id,member_id,asset_id,warehouse_id,delivery_date,quantity,recorded_by
 ) values(
  p_clan_id,p_member_id,p_asset_id,target_warehouse,p_delivery_date,p_quantity,auth.uid()
 ) returning id into new_id;
 return new_id;
end
$$;

create function public.adjust_inventory(
 p_clan_id uuid,
 p_warehouse_id uuid,
 p_asset_id uuid,
 p_mode text,
 p_quantity numeric,
 p_transaction_date date,
 p_note text,
 p_client_request_id uuid
) returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
 actor uuid := auth.uid();
 current_balance numeric(20,4) := 0;
 delta numeric(20,4);
 asset_decimals integer;
 asset_allows_negative boolean;
 transaction_id uuid;
begin
 if actor is null or not public.has_clan_permission(p_clan_id, 'inventory.manage') then
  raise exception 'Not authorized' using errcode = '42501';
 end if;
 perform 1 from public.clans where id=p_clan_id and status='ACTIVE' for update;
 if not found then raise exception 'Not authorized' using errcode = '42501'; end if;

 select decimal_places,allow_negative into asset_decimals,asset_allows_negative
 from public.assets where id=p_asset_id and clan_id=p_clan_id and is_active for update;
 if not found then raise exception 'Asset not found' using errcode = 'P0002'; end if;
 perform 1 from public.warehouses
 where id=p_warehouse_id and clan_id=p_clan_id and is_active for update;
 if not found then raise exception 'Warehouse not found' using errcode = 'P0002'; end if;

 if p_mode not in ('ADD','REMOVE','SET') or p_quantity < 0 or p_quantity = 'NaN'::numeric
  or p_quantity <> round(p_quantity,asset_decimals)
  or p_transaction_date is null
  or p_transaction_date > (now() at time zone 'Asia/Bangkok')::date
  or length(coalesce(p_note,'')) > 1000
  or (p_mode in ('ADD','REMOVE') and p_quantity <= 0)
  or (p_mode='SET' and length(btrim(coalesce(p_note,''))) = 0) then
  raise exception 'Invalid inventory adjustment' using errcode = '22023';
 end if;

 select id into transaction_id from public.transactions
 where clan_id=p_clan_id and client_request_id=p_client_request_id and created_by=actor;
 if found then return transaction_id; end if;

 select coalesce(balance,0) into current_balance
 from public.warehouse_asset_balances
 where clan_id=p_clan_id and warehouse_id=p_warehouse_id and asset_id=p_asset_id;

 delta := case p_mode
  when 'ADD' then p_quantity
  when 'REMOVE' then -p_quantity
  else p_quantity-current_balance
 end;
 if delta = 0 then raise exception 'Inventory balance is unchanged' using errcode = '22023'; end if;
 if not asset_allows_negative and current_balance+delta < 0 then
  raise exception 'Insufficient inventory balance' using errcode = '23514';
 end if;

 insert into public.transactions(
  clan_id,transaction_type,transaction_date,status,note,client_request_id,created_by
 ) values(
  p_clan_id,'ADJUSTMENT',p_transaction_date,'DRAFT',
  concat('Inventory: ',p_mode,case when nullif(btrim(coalesce(p_note,'')),'') is null then '' else ' · '||btrim(p_note) end),
  p_client_request_id,actor
 ) returning id into transaction_id;

 insert into public.transaction_items(
  clan_id,transaction_id,asset_id,quantity,from_warehouse_id,to_warehouse_id,note
 ) values(
  p_clan_id,transaction_id,p_asset_id,abs(delta),
  case when delta < 0 then p_warehouse_id end,
  case when delta > 0 then p_warehouse_id end,
  nullif(btrim(p_note),'')
 );

 update public.transactions
 set status='POSTED',approved_by=actor,approved_at=now()
 where id=transaction_id and clan_id=p_clan_id;
 return transaction_id;
exception when unique_violation then
 select id into transaction_id from public.transactions
 where clan_id=p_clan_id and client_request_id=p_client_request_id and created_by=actor;
 if transaction_id is not null then return transaction_id; end if;
 raise;
end
$$;

create function public.create_asset_with_inventory_settings(
 p_clan_id uuid,p_code text,p_name text,p_asset_type text,p_unit text,
 p_required_quantity numeric default 0,p_low_stock_threshold numeric default 0,
 p_decimal_places integer default 0,p_allow_negative boolean default false,
 p_image_url text default null
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
  or p_low_stock_threshold < 0 or p_low_stock_threshold = 'NaN'::numeric
  or p_decimal_places not between 0 and 4
  or p_required_quantity <> round(p_required_quantity,p_decimal_places)
  or p_low_stock_threshold <> round(p_low_stock_threshold,p_decimal_places)
  or length(coalesce(p_image_url,'')) > 2048 then
  raise exception 'Invalid asset details' using errcode = '22023';
 end if;
 insert into public.assets(
  clan_id,code,name,asset_type,unit,required_quantity,low_stock_threshold,
  image_url,decimal_places,allow_negative,created_by
 ) values(
  p_clan_id,btrim(p_code),btrim(p_name),p_asset_type,btrim(p_unit),
  p_required_quantity,p_low_stock_threshold,nullif(btrim(p_image_url),''),
  p_decimal_places,p_allow_negative,auth.uid()
 ) returning id into new_id;
 return new_id;
end
$$;

create function public.update_asset_with_inventory_settings(
 p_clan_id uuid,p_asset_id uuid,p_name text,p_required_quantity numeric,
 p_low_stock_threshold numeric,p_image_url text default null
) returns uuid
language plpgsql security definer set search_path = ''
as $$
declare asset_decimals integer;
begin
 if not public.has_clan_permission(p_clan_id,'asset.manage') then
  raise exception 'Not authorized' using errcode = '42501';
 end if;
 perform 1 from public.clans where id=p_clan_id and status='ACTIVE' for update;
 if not found then raise exception 'Not authorized' using errcode = '42501'; end if;
 select decimal_places into asset_decimals from public.assets
 where id=p_asset_id and clan_id=p_clan_id and is_active for update;
 if not found then raise exception 'Asset not found' using errcode = 'P0002'; end if;
 if length(btrim(p_name)) not between 1 and 100 or p_required_quantity < 0
  or p_required_quantity = 'NaN'::numeric or p_low_stock_threshold < 0
  or p_low_stock_threshold = 'NaN'::numeric
  or p_required_quantity <> round(p_required_quantity,asset_decimals)
  or p_low_stock_threshold <> round(p_low_stock_threshold,asset_decimals)
  or length(coalesce(p_image_url,'')) > 2048 then
  raise exception 'Invalid asset details' using errcode = '22023';
 end if;
 update public.assets set
  name=btrim(p_name),required_quantity=p_required_quantity,
  low_stock_threshold=p_low_stock_threshold,image_url=nullif(btrim(p_image_url),'')
 where id=p_asset_id and clan_id=p_clan_id and is_active;
 return p_asset_id;
end
$$;

revoke all on function public.adjust_inventory(uuid,uuid,uuid,text,numeric,date,text,uuid),
 public.create_asset_with_inventory_settings(uuid,text,text,text,text,numeric,numeric,integer,boolean,text),
 public.update_asset_with_inventory_settings(uuid,uuid,text,numeric,numeric,text)
 from public,anon;
grant execute on function public.adjust_inventory(uuid,uuid,uuid,text,numeric,date,text,uuid),
 public.create_asset_with_inventory_settings(uuid,text,text,text,text,numeric,numeric,integer,boolean,text),
 public.update_asset_with_inventory_settings(uuid,uuid,text,numeric,numeric,text)
 to authenticated;
