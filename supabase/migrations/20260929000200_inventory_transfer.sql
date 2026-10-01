-- Transfer stock between active warehouses through the simplified Inventory UI.
create function public.transfer_inventory(
 p_clan_id uuid,
 p_from_warehouse_id uuid,
 p_to_warehouse_id uuid,
 p_asset_id uuid,
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
 where id in (p_from_warehouse_id,p_to_warehouse_id)
  and clan_id=p_clan_id and is_active
 order by id for update;
 if (select count(*) from public.warehouses
     where id in (p_from_warehouse_id,p_to_warehouse_id)
      and clan_id=p_clan_id and is_active) <> 2
  or p_from_warehouse_id=p_to_warehouse_id then
  raise exception 'Invalid warehouses' using errcode = '22023';
 end if;

 if p_quantity <= 0 or p_quantity = 'NaN'::numeric
  or p_quantity <> round(p_quantity,asset_decimals)
  or p_transaction_date is null
  or p_transaction_date > (now() at time zone 'Asia/Bangkok')::date
  or length(coalesce(p_note,'')) > 1000 then
  raise exception 'Invalid inventory transfer' using errcode = '22023';
 end if;

 select id into transaction_id from public.transactions
 where clan_id=p_clan_id and client_request_id=p_client_request_id and created_by=actor;
 if found then return transaction_id; end if;

 select coalesce(balance,0) into current_balance
 from public.warehouse_asset_balances
 where clan_id=p_clan_id and warehouse_id=p_from_warehouse_id and asset_id=p_asset_id;
 if not asset_allows_negative and current_balance-p_quantity < 0 then
  raise exception 'Insufficient inventory balance' using errcode = '23514';
 end if;

 insert into public.transactions(
  clan_id,transaction_type,transaction_date,status,note,client_request_id,created_by
 ) values(
  p_clan_id,'TRANSFER',p_transaction_date,'DRAFT',
  concat('Inventory: TRANSFER',case when nullif(btrim(coalesce(p_note,'')),'') is null then '' else ' · '||btrim(p_note) end),
  p_client_request_id,actor
 ) returning id into transaction_id;

 insert into public.transaction_items(
  clan_id,transaction_id,asset_id,quantity,from_warehouse_id,to_warehouse_id,note
 ) values(
  p_clan_id,transaction_id,p_asset_id,p_quantity,
  p_from_warehouse_id,p_to_warehouse_id,nullif(btrim(p_note),'')
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

revoke all on function public.transfer_inventory(uuid,uuid,uuid,uuid,numeric,date,text,uuid)
 from public,anon;
grant execute on function public.transfer_inventory(uuid,uuid,uuid,uuid,numeric,date,text,uuid)
 to authenticated;
