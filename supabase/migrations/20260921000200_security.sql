-- Phase 2: permissions, tenant isolation, and safe database API grants.
insert into public.permissions(code, description) values
 ('clan.view','View clan'), ('clan.manage','Manage clan'),
 ('member.view','View members'), ('member.manage','Manage members and roles'),
 ('asset.view','View assets'), ('asset.manage','Manage assets'),
 ('warehouse.view','View warehouses'), ('warehouse.create','Create warehouses'),
 ('warehouse.edit','Edit warehouses'), ('warehouse.transfer','Transfer assets'),
 ('transaction.view','View transactions'), ('transaction.deposit','Deposit assets'),
 ('transaction.withdraw','Withdraw assets'), ('transaction.adjust','Adjust balances'),
 ('transaction.void','Void transactions'), ('transaction.approve','Approve transactions'),
 ('report.view','View reports'), ('audit.view','View audit log');

-- Templates are global configuration, never exposed by the Data API.
create table private.default_role_permissions (
 role_name text not null, permission_code text not null references public.permissions(code),
 primary key(role_name, permission_code)
);
insert into private.default_role_permissions
 select r, p.code from unnest(array['Member','Depositor','Treasurer','Approver','Leader']) r
 cross join public.permissions p
 where p.code in ('clan.view','member.view','asset.view','warehouse.view','transaction.view','report.view')
 or r = 'Leader'
 or (r = 'Depositor' and p.code = 'transaction.deposit')
 or (r = 'Treasurer' and p.code in ('transaction.deposit','transaction.withdraw','warehouse.transfer'))
 or (r = 'Approver' and p.code = 'transaction.approve');

create function public.is_clan_member(p_clan_id uuid) returns boolean
 language sql stable security definer set search_path = '' as $$
 select exists (
  select 1 from public.clan_members m
  join public.profiles p on p.id = m.user_id
  join public.clans c on c.id = m.clan_id
  where m.clan_id = p_clan_id and m.user_id = (select auth.uid())
   and m.status = 'ACTIVE' and p.status = 'ACTIVE' and c.status = 'ACTIVE'
 );
$$;
create function public.has_clan_permission(p_clan_id uuid, p_permission_code text) returns boolean
 language sql stable security definer set search_path = '' as $$
 select public.is_clan_member(p_clan_id) and exists (
  select 1 from public.clan_members m
  join public.role_permissions rp on rp.clan_id = m.clan_id and rp.role_id = m.role_id
  where m.clan_id = p_clan_id and m.user_id = (select auth.uid())
   and m.status = 'ACTIVE' and rp.permission_code = p_permission_code
 );
$$;
create function public.is_clan_leader(p_clan_id uuid) returns boolean
 language sql stable security definer set search_path = '' as $$
 select public.is_clan_member(p_clan_id) and exists (
  select 1 from public.clan_members m
  join public.clan_roles r on r.clan_id = m.clan_id and r.id = m.role_id
  where m.clan_id = p_clan_id and m.user_id = (select auth.uid())
   and m.status = 'ACTIVE' and r.is_system_role and r.name::text = 'Leader'
 );
$$;
create function public.can_write_transaction(p_clan_id uuid, p_type text) returns boolean
 language sql stable set search_path = '' as $$
 select public.has_clan_permission(p_clan_id,
  case p_type when 'DEPOSIT' then 'transaction.deposit' when 'WITHDRAW' then 'transaction.withdraw'
   when 'TRANSFER' then 'warehouse.transfer' when 'ADJUSTMENT' then 'transaction.adjust'
   else '__disabled__' end);
$$;
create function public.can_edit_transaction(p_clan_id uuid, p_transaction_id uuid) returns boolean
 language sql stable security definer set search_path = '' as $$
 select exists(select 1 from public.transactions t where t.clan_id = p_clan_id and t.id = p_transaction_id
  and t.status = 'DRAFT' and public.can_write_transaction(t.clan_id, t.transaction_type));
$$;

do $$
declare tab text;
begin
 foreach tab in array array['profiles','clans','permissions','clan_roles','role_permissions','clan_members',
 'clan_invites','warehouses','assets','transactions','transaction_items','attachments','audit_logs'] loop
  execute format('alter table public.%I enable row level security', tab);
  execute format('revoke all on public.%I from anon, authenticated', tab);
  execute format('grant select on public.%I to authenticated', tab);
 end loop;
end $$;
create policy profiles_read_self on public.profiles for select to authenticated using (id = (select auth.uid()));
create policy permissions_read on public.permissions for select to authenticated using (true);
create policy clans_read on public.clans for select to authenticated using (public.is_clan_member(id));
create policy clans_edit on public.clans for update to authenticated using (public.has_clan_permission(id,'clan.manage'))
 with check (public.has_clan_permission(id,'clan.manage'));
grant update(name, game_name, server_name, logo_url) on public.clans to authenticated;

create policy roles_read on public.clan_roles for select to authenticated using (public.is_clan_member(clan_id));
create policy roles_insert on public.clan_roles for insert to authenticated
 with check (public.has_clan_permission(clan_id,'member.manage') and not is_system_role);
create policy roles_update on public.clan_roles for update to authenticated
 using (public.has_clan_permission(clan_id,'member.manage') and not is_system_role)
 with check (public.has_clan_permission(clan_id,'member.manage') and not is_system_role);
create policy roles_delete on public.clan_roles for delete to authenticated
 using (public.has_clan_permission(clan_id,'member.manage') and not is_system_role);
grant insert(clan_id, name), update(name), delete on public.clan_roles to authenticated;

create policy role_permissions_read on public.role_permissions for select to authenticated using (public.is_clan_member(clan_id));
create policy role_permissions_manage on public.role_permissions for all to authenticated
 using (public.has_clan_permission(clan_id,'member.manage')
  and exists(select 1 from public.clan_roles r where r.id = role_id and r.clan_id = role_permissions.clan_id and not r.is_system_role))
 with check (public.has_clan_permission(clan_id,'member.manage')
  and exists(select 1 from public.clan_roles r where r.id = role_id and r.clan_id = role_permissions.clan_id and not r.is_system_role));
grant insert, delete on public.role_permissions to authenticated;

create policy members_read on public.clan_members for select to authenticated
 using (public.has_clan_permission(clan_id,'member.view') or (user_id = (select auth.uid()) and public.is_clan_member(clan_id)));
create policy members_edit on public.clan_members for update to authenticated
 using (public.has_clan_permission(clan_id,'member.manage'))
 with check (public.has_clan_permission(clan_id,'member.manage'));
grant update(role_id, character_name, status) on public.clan_members to authenticated;
-- Membership creation and invite redemption are reserved for Phase 4 atomic RPCs.
create policy invites_read on public.clan_invites for select to authenticated using (public.has_clan_permission(clan_id,'member.manage'));

create policy warehouses_read on public.warehouses for select to authenticated using (public.has_clan_permission(clan_id,'warehouse.view'));
create policy warehouses_insert on public.warehouses for insert to authenticated
 with check (public.has_clan_permission(clan_id,'warehouse.create') and created_by = (select auth.uid()) and not is_default);
create policy warehouses_update on public.warehouses for update to authenticated
 using (public.has_clan_permission(clan_id,'warehouse.edit')) with check (public.has_clan_permission(clan_id,'warehouse.edit'));
grant insert(clan_id,name,description,sort_order,created_by), update(name,description,sort_order) on public.warehouses to authenticated;
-- Default switches / deactivation need atomic business validation in Phase 5.
-- No warehouse DELETE grant: historical references are also protected by FKs.
create policy assets_read on public.assets for select to authenticated using (public.has_clan_permission(clan_id,'asset.view'));
create policy assets_insert on public.assets for insert to authenticated
 with check (public.has_clan_permission(clan_id,'asset.manage') and created_by = (select auth.uid()));
create policy assets_update on public.assets for update to authenticated
 using (public.has_clan_permission(clan_id,'asset.manage')) with check (public.has_clan_permission(clan_id,'asset.manage'));
grant insert(clan_id,code,name,asset_type,unit,image_url,decimal_places,allow_negative,created_by),
 update(name,image_url) on public.assets to authenticated;

create policy transactions_read on public.transactions for select to authenticated using (public.has_clan_permission(clan_id,'transaction.view'));
create policy transactions_insert on public.transactions for insert to authenticated
 with check (status = 'DRAFT' and created_by = (select auth.uid()) and public.can_write_transaction(clan_id,transaction_type));
create policy transactions_update on public.transactions for update to authenticated
 using (status = 'DRAFT' and public.can_write_transaction(clan_id,transaction_type))
 with check (status = 'DRAFT' and public.can_write_transaction(clan_id,transaction_type));
create policy transactions_delete on public.transactions for delete to authenticated
 using (status = 'DRAFT' and public.can_write_transaction(clan_id,transaction_type));
grant insert(clan_id,transaction_type,transaction_date,contributor_member_id,note,client_request_id,created_by),
 update(transaction_date,contributor_member_id,note), delete on public.transactions to authenticated;

create policy items_read on public.transaction_items for select to authenticated using (public.has_clan_permission(clan_id,'transaction.view'));
create policy items_insert on public.transaction_items for insert to authenticated
 with check (public.can_edit_transaction(clan_id,transaction_id));
create policy items_update on public.transaction_items for update to authenticated
 using (public.can_edit_transaction(clan_id,transaction_id)) with check (public.can_edit_transaction(clan_id,transaction_id));
create policy items_delete on public.transaction_items for delete to authenticated using (public.can_edit_transaction(clan_id,transaction_id));
grant insert(clan_id,transaction_id,asset_id,quantity,unit_value,from_warehouse_id,to_warehouse_id,note),
 update(asset_id,quantity,unit_value,from_warehouse_id,to_warehouse_id,note), delete on public.transaction_items to authenticated;
create policy attachments_read on public.attachments for select to authenticated using (public.has_clan_permission(clan_id,'transaction.view'));
-- Evidence upload/storage write policies are intentionally closed until Phase 6.
create policy audit_read on public.audit_logs for select to authenticated using (public.has_clan_permission(clan_id,'audit.view'));
revoke all on all functions in schema public from public, anon;
grant execute on function public.is_clan_member(uuid), public.has_clan_permission(uuid,text),
 public.is_clan_leader(uuid), public.can_write_transaction(uuid,text), public.can_edit_transaction(uuid,uuid) to authenticated;
