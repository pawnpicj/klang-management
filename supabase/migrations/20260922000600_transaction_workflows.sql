-- Phase 6: atomic transaction creation/posting, void audit records, and evidence.
create or replace function private.guard_transaction() returns trigger
language plpgsql set search_path = ''
as $$
declare lifecycle_override boolean :=
 current_user not in ('authenticated','anon','service_role')
 and coalesce(current_setting('app.lifecycle_write',true) = 'void',false);
begin
 if tg_op <> 'INSERT' and old.status in ('POSTED','VOIDED','REJECTED') and not lifecycle_override then
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
end
$$;

create function public.create_and_post_transaction(
 p_clan_id uuid,
 p_transaction_type text,
 p_client_request_id uuid,
 p_items jsonb,
 p_contributor_member_id uuid default null,
 p_note text default null,
 p_from_warehouse_id uuid default null,
 p_to_warehouse_id uuid default null
) returns uuid
language plpgsql security definer set search_path = ''
as $$
declare actor uuid := auth.uid(); transaction_id uuid; target_warehouse uuid;
begin
 if actor is null or p_transaction_type not in ('DEPOSIT','WITHDRAW','TRANSFER')
  or not public.can_write_transaction(p_clan_id,p_transaction_type) then
  raise exception 'Not authorized' using errcode = '42501';
 end if;
 perform 1 from public.clans where id=p_clan_id and status='ACTIVE' for update;
 if not found then raise exception 'Not authorized' using errcode = '42501'; end if;

 select id into transaction_id from public.transactions
 where clan_id=p_clan_id and client_request_id=p_client_request_id and created_by=actor;
 if found then return transaction_id; end if;

 if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) not between 1 and 50 then
  raise exception 'Transaction must contain 1-50 items' using errcode = '22023';
 end if;
 if p_transaction_type='DEPOSIT' then
  if p_from_warehouse_id is not null or p_to_warehouse_id is not null then
   raise exception 'Invalid warehouse direction' using errcode = '23514';
  end if;
  select id into target_warehouse from public.warehouses
  where clan_id=p_clan_id and is_default and is_active;
 elsif p_transaction_type='WITHDRAW' then
  if p_from_warehouse_id is null or p_to_warehouse_id is not null then
   raise exception 'Invalid warehouse direction' using errcode = '23514';
  end if;
 elsif p_transaction_type='TRANSFER' then
  if p_from_warehouse_id is null or p_to_warehouse_id is null or p_from_warehouse_id=p_to_warehouse_id then
   raise exception 'Invalid warehouse direction' using errcode = '23514';
  end if;
 end if;

 insert into public.transactions(
  clan_id,transaction_type,contributor_member_id,note,client_request_id,created_by
 ) values (
  p_clan_id,p_transaction_type,p_contributor_member_id,nullif(btrim(p_note),''),p_client_request_id,actor
 ) returning id into transaction_id;

 insert into public.transaction_items(
  clan_id,transaction_id,asset_id,quantity,unit_value,from_warehouse_id,to_warehouse_id,note
 )
 select p_clan_id,transaction_id,item.asset_id,item.quantity,item.unit_value,
  case when p_transaction_type in ('WITHDRAW','TRANSFER') then p_from_warehouse_id end,
  case when p_transaction_type='DEPOSIT' then target_warehouse when p_transaction_type='TRANSFER' then p_to_warehouse_id end,
  nullif(btrim(item.note),'')
 from jsonb_to_recordset(p_items) as item(asset_id uuid,quantity numeric,unit_value numeric,note text);

 perform public.post_transaction(transaction_id);
 return transaction_id;
exception when unique_violation then
 select id into transaction_id from public.transactions
 where clan_id=p_clan_id and client_request_id=p_client_request_id and created_by=actor;
 if transaction_id is not null then return transaction_id; end if;
 raise;
end
$$;

create function public.void_transaction(p_clan_id uuid,p_transaction_id uuid) returns uuid
language plpgsql security definer set search_path = ''
as $$
declare actor uuid := auth.uid(); original public.transactions; reversal_id uuid;
begin
 if not public.has_clan_permission(p_clan_id,'transaction.void') then
  raise exception 'Not authorized' using errcode = '42501';
 end if;
 perform 1 from public.clans where id=p_clan_id and status='ACTIVE' for update;
 if not found then raise exception 'Not authorized' using errcode = '42501'; end if;
 select * into original from public.transactions
 where id=p_transaction_id and clan_id=p_clan_id for update;
 if not found or original.status <> 'POSTED' or original.transaction_type='REVERSAL'
  or original.reversal_transaction_id is not null then
  raise exception 'Transaction cannot be voided' using errcode = '23514';
 end if;

 perform 1 from public.assets a where a.clan_id=p_clan_id and a.id in
  (select asset_id from public.transaction_items where transaction_id=original.id) order by a.id for update;
 perform 1 from public.warehouses w where w.clan_id=p_clan_id and w.id in
  (select from_warehouse_id from public.transaction_items where transaction_id=original.id
   union select to_warehouse_id from public.transaction_items where transaction_id=original.id) order by w.id for update;

 if exists(
  with reverse_deltas as (
   select i.asset_id,f.warehouse_id,sum(f.delta) delta
   from public.transaction_items i
   cross join lateral (values(i.to_warehouse_id,-i.quantity),(i.from_warehouse_id,i.quantity)) f(warehouse_id,delta)
   where i.transaction_id=original.id and f.warehouse_id is not null
   group by i.asset_id,f.warehouse_id
  )
  select 1 from reverse_deltas d
  join public.assets a on a.id=d.asset_id and a.clan_id=p_clan_id
  left join public.warehouse_asset_balances b on b.clan_id=p_clan_id and b.asset_id=d.asset_id and b.warehouse_id=d.warehouse_id
  where not a.allow_negative and coalesce(b.balance,0)+d.delta<0
 ) then raise exception 'Insufficient balance to void' using errcode = '23514'; end if;

 insert into public.transactions(
  clan_id,transaction_type,transaction_date,contributor_member_id,status,note,
  client_request_id,created_by,voided_by,voided_at,reversal_transaction_id
 ) values (
  p_clan_id,'REVERSAL',(now() at time zone 'utc')::date,original.contributor_member_id,
  'DRAFT','Void '||original.transaction_no,gen_random_uuid(),actor,null,null,original.id
 ) returning id into reversal_id;
 insert into public.transaction_items(
  clan_id,transaction_id,asset_id,quantity,unit_value,from_warehouse_id,to_warehouse_id,note
 )
 select p_clan_id,reversal_id,asset_id,quantity,unit_value,to_warehouse_id,from_warehouse_id,'Reversal'
 from public.transaction_items where transaction_id=original.id and clan_id=p_clan_id;
 perform set_config('app.lifecycle_write','void',true);
 update public.transactions set status='VOIDED',voided_by=actor,voided_at=now(),reversal_transaction_id=original.id
 where id=reversal_id;
 update public.transactions set status='VOIDED',voided_by=actor,voided_at=now(),reversal_transaction_id=reversal_id
 where id=original.id;
 return reversal_id;
end
$$;

create function public.can_manage_transaction_evidence(p_clan_id uuid,p_transaction_id uuid) returns boolean
language sql stable security definer set search_path = ''
as $$
 select public.is_clan_member(p_clan_id) and exists(
  select 1 from public.transactions t where t.id=p_transaction_id and t.clan_id=p_clan_id
   and (t.created_by=(select auth.uid())
    or public.has_clan_permission(p_clan_id,'transaction.approve')
    or public.has_clan_permission(p_clan_id,'transaction.void'))
 )
$$;

create function public.can_access_evidence_object(p_name text,p_write boolean default false) returns boolean
language plpgsql stable security definer set search_path = ''
as $$
declare tenant uuid; transaction_id uuid;
begin
 tenant := split_part(p_name,'/',1)::uuid;
 transaction_id := split_part(p_name,'/',2)::uuid;
 if p_write then return public.can_manage_transaction_evidence(tenant,transaction_id); end if;
 return public.has_clan_permission(tenant,'transaction.view');
exception when invalid_text_representation then return false;
end
$$;

create function public.register_transaction_attachment(
 p_clan_id uuid,p_transaction_id uuid,p_storage_path text,p_original_name text,p_mime_type text,p_file_size bigint
) returns uuid
language plpgsql security definer set search_path = ''
as $$
declare attachment_id uuid;
begin
 if not public.can_manage_transaction_evidence(p_clan_id,p_transaction_id) then
  raise exception 'Not authorized' using errcode = '42501';
 end if;
 if p_storage_path not like p_clan_id::text||'/'||p_transaction_id::text||'/%'
  or length(btrim(p_original_name)) not between 1 and 255
  or p_mime_type not in ('image/jpeg','image/png','image/webp','application/pdf')
  or p_file_size not between 1 and 10485760
  or not exists(
   select 1 from storage.objects
   where bucket_id='transaction-evidence' and name=p_storage_path
  ) then
  raise exception 'Invalid attachment' using errcode = '22023';
 end if;
 insert into public.attachments(clan_id,transaction_id,storage_path,original_name,mime_type,file_size,uploaded_by)
 values(p_clan_id,p_transaction_id,p_storage_path,btrim(p_original_name),p_mime_type,p_file_size,auth.uid())
 returning id into attachment_id;
 return attachment_id;
end
$$;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('transaction-evidence','transaction-evidence',false,10485760,
 array['image/jpeg','image/png','image/webp','application/pdf'])
on conflict(id) do update set public=false,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;

create policy transaction_evidence_read on storage.objects for select to authenticated
 using(bucket_id='transaction-evidence' and public.can_access_evidence_object(name,false));
create policy transaction_evidence_insert on storage.objects for insert to authenticated
 with check(bucket_id='transaction-evidence' and public.can_access_evidence_object(name,true));
create policy transaction_evidence_delete on storage.objects for delete to authenticated
 using(bucket_id='transaction-evidence' and public.can_access_evidence_object(name,true));

revoke all on function public.create_and_post_transaction(uuid,text,uuid,jsonb,uuid,text,uuid,uuid),
 public.void_transaction(uuid,uuid),public.can_manage_transaction_evidence(uuid,uuid),
 public.can_access_evidence_object(text,boolean),
 public.register_transaction_attachment(uuid,uuid,text,text,text,bigint)
from public,anon;
grant execute on function public.create_and_post_transaction(uuid,text,uuid,jsonb,uuid,text,uuid,uuid),
 public.void_transaction(uuid,uuid),public.can_manage_transaction_evidence(uuid,uuid),
 public.can_access_evidence_object(text,boolean),
 public.register_transaction_attachment(uuid,uuid,text,text,text,bigint)
to authenticated;
