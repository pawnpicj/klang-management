-- Phase 2: schema. No authentication flow or application business UI.
create schema if not exists extensions;
create extension if not exists citext with schema extensions;
create extension if not exists pgcrypto with schema extensions;
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create table public.profiles (
 id uuid primary key references auth.users(id) on delete restrict,
 username extensions.citext not null unique check (username::text ~ '^[A-Za-z0-9_]{3,32}$'),
 display_name text not null check (length(btrim(display_name)) between 1 and 100),
 avatar_url text,
 status text not null default 'ACTIVE' check (status in ('ACTIVE','BLOCKED')),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.clans (
 id uuid primary key default gen_random_uuid(),
 name text not null check (length(btrim(name)) between 1 and 100),
 slug extensions.citext not null unique check (slug::text ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and length(slug::text) <= 80),
 type text not null check (type in ('CLAN','GANG')),
 game_name text, server_name text, logo_url text,
 status text not null default 'ACTIVE' check (status in ('ACTIVE','SUSPENDED','ARCHIVED')),
 created_by uuid not null references public.profiles(id),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.permissions (
 code text primary key, description text not null
);
create table public.clan_roles (
 id uuid primary key default gen_random_uuid(),
 clan_id uuid not null references public.clans(id),
 name extensions.citext not null check (length(btrim(name::text)) between 1 and 80),
 is_system_role boolean not null default false,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 unique (clan_id, name), unique (clan_id, id)
);
create table public.role_permissions (
 clan_id uuid not null references public.clans(id),
 role_id uuid not null,
 permission_code text not null references public.permissions(code),
 primary key (role_id, permission_code),
 foreign key (clan_id, role_id) references public.clan_roles(clan_id, id) on delete cascade
);
create table public.clan_members (
 id uuid primary key default gen_random_uuid(),
 clan_id uuid not null references public.clans(id),
 user_id uuid not null references public.profiles(id),
 role_id uuid not null,
 character_name text not null check (length(btrim(character_name)) between 1 and 100),
 status text not null default 'INVITED' check (status in ('INVITED','ACTIVE','LEFT','REMOVED')),
 joined_at timestamptz,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 unique (clan_id, user_id), unique (clan_id, id),
 foreign key (clan_id, role_id) references public.clan_roles(clan_id, id)
);
create table public.clan_invites (
 id uuid primary key default gen_random_uuid(),
 clan_id uuid not null references public.clans(id),
 invite_code text not null unique default encode(extensions.gen_random_bytes(24), 'hex'),
 default_role_id uuid not null,
 expires_at timestamptz, max_uses integer check (max_uses > 0),
 used_count integer not null default 0 check (used_count >= 0),
 is_active boolean not null default true,
 created_by uuid not null references public.profiles(id), created_at timestamptz not null default now(),
 foreign key (clan_id, default_role_id) references public.clan_roles(clan_id, id),
 check (max_uses is null or used_count <= max_uses)
);
create table public.warehouses (
 id uuid primary key default gen_random_uuid(),
 clan_id uuid not null references public.clans(id),
 name extensions.citext not null check (length(btrim(name::text)) between 1 and 100),
 description text,
 is_default boolean not null default false, is_active boolean not null default true,
 sort_order integer not null default 0,
 created_by uuid not null references public.profiles(id),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 unique (clan_id, name), unique (clan_id, id), check (not is_default or is_active)
);
create unique index warehouses_one_default on public.warehouses(clan_id) where is_default;
create table public.assets (
 id uuid primary key default gen_random_uuid(),
 clan_id uuid not null references public.clans(id),
 code extensions.citext not null check (length(btrim(code::text)) between 1 and 50),
 name extensions.citext not null check (length(btrim(name::text)) between 1 and 100),
 asset_type text not null check (asset_type in ('CURRENCY','ITEM')),
 unit text not null check (length(btrim(unit)) between 1 and 30),
 image_url text,
 decimal_places integer not null default 0 check (decimal_places between 0 and 4),
 allow_negative boolean not null default false, is_active boolean not null default true,
 created_by uuid not null references public.profiles(id),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 unique (clan_id, code), unique (clan_id, id)
);
create table public.transactions (
 id uuid primary key default gen_random_uuid(),
 clan_id uuid not null references public.clans(id),
 transaction_no text not null default ('TX-' || gen_random_uuid()::text),
 transaction_type text not null check (transaction_type in ('DEPOSIT','WITHDRAW','TRANSFER','ADJUSTMENT','REVERSAL')),
 transaction_date date not null default (now() at time zone 'utc')::date,
 contributor_member_id uuid,
 status text not null default 'DRAFT' check (status in ('DRAFT','PENDING','POSTED','REJECTED','VOIDED')),
 note text, client_request_id uuid not null,
 created_by uuid not null references public.profiles(id),
 approved_by uuid references public.profiles(id), approved_at timestamptz,
 voided_by uuid references public.profiles(id), voided_at timestamptz,
 reversal_transaction_id uuid,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 unique (clan_id, transaction_no), unique (clan_id, client_request_id), unique (clan_id, id),
 foreign key (clan_id, contributor_member_id) references public.clan_members(clan_id, id),
 foreign key (clan_id, reversal_transaction_id) references public.transactions(clan_id, id),
 check ((approved_by is null) = (approved_at is null)),
 check ((voided_by is null) = (voided_at is null)),
 check (reversal_transaction_id is distinct from id)
);
create table public.transaction_items (
 id uuid primary key default gen_random_uuid(),
 clan_id uuid not null references public.clans(id),
 transaction_id uuid not null, asset_id uuid not null,
 quantity numeric(20,4) not null check (quantity > 0 and quantity <> 'NaN'::numeric),
 unit_value numeric(20,4) check (unit_value >= 0 and unit_value <> 'NaN'::numeric),
 from_warehouse_id uuid, to_warehouse_id uuid, note text,
 foreign key (clan_id, transaction_id) references public.transactions(clan_id, id),
 foreign key (clan_id, asset_id) references public.assets(clan_id, id),
 foreign key (clan_id, from_warehouse_id) references public.warehouses(clan_id, id),
 foreign key (clan_id, to_warehouse_id) references public.warehouses(clan_id, id),
 check (from_warehouse_id is not null or to_warehouse_id is not null),
 check (from_warehouse_id is distinct from to_warehouse_id)
);
create table public.attachments (
 id uuid primary key default gen_random_uuid(),
 clan_id uuid not null references public.clans(id), transaction_id uuid not null,
 storage_path text not null unique, original_name text not null,
 mime_type text not null, file_size bigint not null check (file_size > 0 and file_size <= 10485760),
 uploaded_by uuid not null references public.profiles(id), created_at timestamptz not null default now(),
 foreign key (clan_id, transaction_id) references public.transactions(clan_id, id),
 check (storage_path like clan_id::text || '/' || transaction_id::text || '/%')
);
create table public.audit_logs (
 id uuid primary key default gen_random_uuid(),
 clan_id uuid references public.clans(id), user_id uuid references public.profiles(id),
 action text not null, entity_type text not null, entity_id uuid,
 before_data jsonb, after_data jsonb, ip_address inet, user_agent text,
 created_at timestamptz not null default now()
);
create index clan_members_user_status on public.clan_members(user_id, status, clan_id);
create index clan_members_role on public.clan_members(clan_id, role_id);
create index role_permissions_clan on public.role_permissions(clan_id, role_id);
create index clan_invites_clan on public.clan_invites(clan_id, default_role_id);
create index transactions_history on public.transactions(clan_id, transaction_date desc, status);
create index transactions_contributor on public.transactions(clan_id, contributor_member_id);
create index transactions_reversal on public.transactions(clan_id, reversal_transaction_id);
create index items_transaction on public.transaction_items(clan_id, transaction_id);
create index items_asset on public.transaction_items(clan_id, asset_id);
create index items_from on public.transaction_items(clan_id, from_warehouse_id);
create index items_to on public.transaction_items(clan_id, to_warehouse_id);
create index attachments_transaction on public.attachments(clan_id, transaction_id);
create index audit_logs_history on public.audit_logs(clan_id, created_at desc);
