-- Phase 2: integrity guards, append-only audit, atomic clan creation and posting.
create function private.touch_updated_at() returns trigger language plpgsql set search_path = '' as $$
begin new.updated_at := now(); return new; end $$;
create function private.write_audit() returns trigger language plpgsql security definer set search_path = '' as $$
declare before_row jsonb; after_row jsonb; row_data jsonb; tenant uuid; entity uuid;
begin
 if tg_op <> 'INSERT' then before_row := to_jsonb(old) - 'invite_code'; end if;
 if tg_op <> 'DELETE' then after_row := to_jsonb(new) - 'invite_code'; end if;
 row_data := coalesce(after_row,before_row);
 tenant := case when tg_table_name = 'clans' then (row_data->>'id')::uuid else (row_data->>'clan_id')::uuid end;
 entity := coalesce(row_data->>'id',row_data->>'role_id')::uuid;
 insert into public.audit_logs(clan_id,user_id,action,entity_type,entity_id,before_data,after_data)
 values(tenant,auth.uid(),tg_op,tg_table_name,entity,before_row,after_row);
 return coalesce(new,old);
end $$;
create function private.prevent_audit_change() returns trigger language plpgsql set search_path = '' as $$
begin raise exception 'Audit records are append-only' using errcode = '42501'; end $$;
create trigger audit_immutable before update or delete on public.audit_logs for each row execute function private.prevent_audit_change();

create function private.guard_transaction() returns trigger language plpgsql set search_path = '' as $$
begin
 if tg_op <> 'INSERT' and old.status in ('POSTED','VOIDED','REJECTED') then
  raise exception 'Final transactions are immutable' using errcode = '42501';
 end if;
 if tg_op = 'UPDATE' and
  (new.id,new.clan_id,new.created_by,new.client_request_id,new.transaction_type,new.transaction_no)
   is distinct from
  (old.id,old.clan_id,old.created_by,old.client_request_id,old.transaction_type,old.transaction_no) then
  raise exception 'Transaction identity is immutable' using errcode = '42501';
 end if;
 if current_user in ('authenticated','anon','service_role') then
  if tg_op <> 'DELETE' and (new.status <> 'DRAFT' or new.approved_by is not null or new.voided_by is not null or new.reversal_transaction_id is not null) then
   raise exception 'Lifecycle changes require a database function' using errcode = '42501';
  end if;
 end if;
 return coalesce(new,old);
end $$;
create trigger transactions_guard before insert or update or delete on public.transactions for each row execute function private.guard_transaction();

create function private.guard_items() returns trigger language plpgsql security definer set search_path = '' as $$
declare t public.transactions; item public.transaction_items;
begin
 item := case when tg_op = 'DELETE' then old else new end;
 if tg_op = 'UPDATE' and (new.id,new.clan_id,new.transaction_id) is distinct from (old.id,old.clan_id,old.transaction_id) then
  raise exception 'Item parent is immutable' using errcode = '42501';
 end if;
 select * into t from public.transactions where id = item.transaction_id and clan_id = item.clan_id for update;
 if not found or t.status <> 'DRAFT' then raise exception 'Only draft items may change' using errcode = '42501'; end if;
 if tg_op <> 'DELETE' then
  if (t.transaction_type = 'DEPOSIT' and (item.from_warehouse_id is not null or item.to_warehouse_id is null))
   or (t.transaction_type = 'WITHDRAW' and (item.from_warehouse_id is null or item.to_warehouse_id is not null))
   or (t.transaction_type = 'TRANSFER' and (item.from_warehouse_id is null or item.to_warehouse_id is null))
   or (t.transaction_type = 'ADJUSTMENT' and (item.from_warehouse_id is null) = (item.to_warehouse_id is null)) then
    raise exception 'Invalid warehouse direction' using errcode = '23514';
  end if;
 end if;
 return coalesce(new,old);
end $$;
create trigger items_guard before insert or update or delete on public.transaction_items for each row execute function private.guard_items();

create function private.require_default_warehouse() returns trigger language plpgsql security definer set search_path = '' as $$
declare tenant uuid;
begin
 tenant := (coalesce(to_jsonb(new),to_jsonb(old))->>(case when tg_table_name = 'clans' then 'id' else 'clan_id' end))::uuid;
 if exists(select 1 from public.clans where id = tenant) and
   (select count(*) from public.warehouses where clan_id = tenant and is_default and is_active) <> 1 then
  raise exception 'Clan must have exactly one active default warehouse' using errcode = '23514';
 end if;
 return null;
end $$;
create constraint trigger warehouses_default_required after insert or update or delete on public.warehouses
 deferrable initially deferred for each row execute function private.require_default_warehouse();
create constraint trigger clans_default_required after insert on public.clans
 deferrable initially deferred for each row execute function private.require_default_warehouse();

create function private.require_leader() returns trigger language plpgsql security definer set search_path = '' as $$
declare tenant uuid;
begin
 tenant := (coalesce(to_jsonb(new),to_jsonb(old))->>(case when tg_table_name = 'clans' then 'id' else 'clan_id' end))::uuid;
 if exists(select 1 from public.clans where id = tenant) and not exists (
  select 1 from public.clan_members m join public.clan_roles r on r.id = m.role_id and r.clan_id = m.clan_id
  where m.clan_id = tenant and m.status = 'ACTIVE' and r.is_system_role and r.name::text = 'Leader'
 ) then raise exception 'Clan must retain an active Leader' using errcode = '23514'; end if;
 return null;
end $$;
create constraint trigger members_leader_required after insert or update or delete on public.clan_members
 deferrable initially deferred for each row execute function private.require_leader();
create constraint trigger clans_leader_required after insert on public.clans
 deferrable initially deferred for each row execute function private.require_leader();

-- Serialize membership/permission changes with posting, and freeze tenant identities.
create function private.guard_tenant_update() returns trigger language plpgsql security definer set search_path = '' as $$
begin
 if new.clan_id <> old.clan_id or (to_jsonb(new)->>'id') is distinct from (to_jsonb(old)->>'id') then
  raise exception 'Tenant identity is immutable' using errcode = '42501';
 end if;
 perform 1 from public.clans where id = old.clan_id for update;
 return new;
end $$;
do $$
declare tab text;
begin
 foreach tab in array array['profiles','clans','clan_roles','clan_members','warehouses','assets','transactions'] loop
  execute format('create trigger touch_updated before update on public.%I for each row execute function private.touch_updated_at()',tab);
 end loop;
 foreach tab in array array['profiles','clans','clan_roles','role_permissions','clan_members','clan_invites','warehouses','assets','transactions','transaction_items','attachments'] loop
  execute format('create trigger audit_mutations after insert or update or delete on public.%I for each row execute function private.write_audit()',tab);
 end loop;
 foreach tab in array array['clan_roles','clan_members','warehouses','assets'] loop
  execute format('create trigger tenant_identity before update on public.%I for each row execute function private.guard_tenant_update()',tab);
 end loop;
end $$;

create function public.create_clan(p_name text, p_slug text, p_type text, p_character_name text)
 returns uuid language plpgsql security definer set search_path = '' as $$
declare tenant uuid; actor uuid := auth.uid(); leader_role uuid;
begin
 if actor is null or not exists(select 1 from public.profiles where id = actor and status = 'ACTIVE') then
  raise exception 'Not authorized' using errcode = '42501';
 end if;
 insert into public.clans(name,slug,type,created_by) values(btrim(p_name),p_slug,p_type,actor) returning id into tenant;
 insert into public.clan_roles(clan_id,name,is_system_role)
 select tenant,r,true from unnest(array['Member','Depositor','Treasurer','Approver','Leader']) r;
 insert into public.role_permissions(clan_id,role_id,permission_code)
 select tenant,r.id,d.permission_code from public.clan_roles r
 join private.default_role_permissions d on d.role_name = r.name::text where r.clan_id = tenant;
 select id into leader_role from public.clan_roles where clan_id = tenant and name::text = 'Leader';
 insert into public.clan_members(clan_id,user_id,role_id,character_name,status,joined_at)
 values(tenant,actor,leader_role,btrim(p_character_name),'ACTIVE',now());
 insert into public.warehouses(clan_id,name,is_default,created_by) values(tenant,'Main Warehouse',true,actor);
 return tenant;
end $$;

-- security_invoker preserves the caller's RLS; no stored mutable balance.
create view public.warehouse_asset_balances with (security_invoker = true) as
 select i.clan_id, flow.warehouse_id, i.asset_id, sum(flow.delta)::numeric(20,4) as balance
 from public.transaction_items i
 join public.transactions t on t.clan_id = i.clan_id and t.id = i.transaction_id
 cross join lateral (values (i.to_warehouse_id,i.quantity),(i.from_warehouse_id,-i.quantity)) flow(warehouse_id,delta)
 where t.status = 'POSTED' and flow.warehouse_id is not null
 group by i.clan_id,flow.warehouse_id,i.asset_id;
revoke all on public.warehouse_asset_balances from public,anon,authenticated;
grant select on public.warehouse_asset_balances to authenticated;

create function public.post_transaction(p_transaction_id uuid) returns uuid
 language plpgsql security definer set search_path = '' as $$
declare t public.transactions; tenant uuid; actor uuid := auth.uid(); was_pending boolean;
begin
 -- Do not expose another tenant's transaction existence via different errors.
 select clan_id into tenant from public.transactions where id = p_transaction_id;
 if actor is null or tenant is null or not public.is_clan_member(tenant) then
  raise exception 'Not authorized' using errcode = '42501';
 end if;
 -- All posts in one clan serialize, so separate withdrawals cannot spend the same funds.
 perform 1 from public.clans where id = tenant for update;
 select * into t from public.transactions where id = p_transaction_id and clan_id = tenant for update;
 if not public.is_clan_member(tenant) or not (
  (t.status = 'PENDING' and public.has_clan_permission(tenant,'transaction.approve')) or
  (t.status <> 'PENDING' and public.can_write_transaction(tenant,t.transaction_type)) or
  (t.status = 'POSTED' and t.approved_by = actor and public.has_clan_permission(tenant,'transaction.approve'))
 ) then raise exception 'Not authorized' using errcode = '42501'; end if;
 if t.status = 'POSTED' then return t.id; end if;
 if t.status not in ('DRAFT','PENDING') or t.transaction_type = 'REVERSAL' then
  raise exception 'Unsupported transaction state' using errcode = '23514';
 end if;
 if not exists(select 1 from public.transaction_items where transaction_id = t.id and clan_id = tenant) then
  raise exception 'Transaction must contain items' using errcode = '23514';
 end if;
 if t.contributor_member_id is not null and not exists(
  select 1 from public.clan_members where id = t.contributor_member_id and clan_id = tenant and status = 'ACTIVE'
 ) then raise exception 'Contributor is not active' using errcode = '23514'; end if;

 perform 1 from public.assets a where a.clan_id = tenant and a.id in
  (select asset_id from public.transaction_items where transaction_id = t.id) order by a.id for update;
 perform 1 from public.warehouses w where w.clan_id = tenant and w.id in
  (select from_warehouse_id from public.transaction_items where transaction_id = t.id
   union select to_warehouse_id from public.transaction_items where transaction_id = t.id) order by w.id for update;

 if exists(
  select 1 from public.transaction_items i
  join public.assets a on a.clan_id = i.clan_id and a.id = i.asset_id
  left join public.warehouses fw on fw.clan_id = i.clan_id and fw.id = i.from_warehouse_id
  left join public.warehouses tw on tw.clan_id = i.clan_id and tw.id = i.to_warehouse_id
  where i.transaction_id = t.id and (
   not a.is_active or i.quantity <> round(i.quantity,a.decimal_places)
   or (fw.id is not null and not fw.is_active) or (tw.id is not null and not tw.is_active)
   or (t.transaction_type = 'DEPOSIT' and (fw.id is not null or tw.id is null or not tw.is_default))
   or (t.transaction_type = 'WITHDRAW' and (fw.id is null or tw.id is not null))
   or (t.transaction_type = 'TRANSFER' and (fw.id is null or tw.id is null or fw.id = tw.id))
   or (t.transaction_type = 'ADJUSTMENT' and (fw.id is null) = (tw.id is null))
  )
 ) then raise exception 'Invalid asset, precision or warehouse' using errcode = '23514'; end if;

 if exists(
  with deltas as (
   select i.asset_id,f.warehouse_id,sum(f.delta) as delta from public.transaction_items i
   cross join lateral (values(i.to_warehouse_id,i.quantity),(i.from_warehouse_id,-i.quantity)) f(warehouse_id,delta)
   where i.transaction_id = t.id and f.warehouse_id is not null group by i.asset_id,f.warehouse_id
  )
  select 1 from deltas d join public.assets a on a.id = d.asset_id and a.clan_id = tenant
  left join public.warehouse_asset_balances b on b.clan_id = tenant and b.asset_id = d.asset_id and b.warehouse_id = d.warehouse_id
  where not a.allow_negative and coalesce(b.balance,0) + d.delta < 0
 ) then raise exception 'Insufficient balance' using errcode = '23514'; end if;

 was_pending := t.status = 'PENDING';
 update public.transactions set status = 'POSTED',
  approved_by = case when was_pending then actor else approved_by end,
  approved_at = case when was_pending then now() else approved_at end
 where id = t.id;
 return t.id;
end $$;
revoke all on all functions in schema private from public,anon,authenticated;
revoke all on function public.create_clan(text,text,text,text),public.post_transaction(uuid) from public,anon;
grant execute on function public.create_clan(text,text,text,text),public.post_transaction(uuid) to authenticated;
