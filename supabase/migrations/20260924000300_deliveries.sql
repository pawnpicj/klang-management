-- Track a daily delivery obligation for each active member and required asset.
alter table public.clans
  add column delivery_tracking_started_on date not null default current_date;

create table public.member_deliveries (
 id uuid primary key default gen_random_uuid(),
 clan_id uuid not null references public.clans(id),
 member_id uuid not null,
 asset_id uuid not null,
 delivery_date date not null,
 quantity numeric(20,4) not null check (quantity > 0 and quantity <> 'NaN'::numeric),
 recorded_by uuid not null references public.profiles(id),
 created_at timestamptz not null default now(),
 foreign key (clan_id, member_id) references public.clan_members(clan_id, id),
 foreign key (clan_id, asset_id) references public.assets(clan_id, id)
);
create index member_deliveries_lookup
  on public.member_deliveries(clan_id, member_id, delivery_date, asset_id);

alter table public.member_deliveries enable row level security;
alter table public.member_deliveries force row level security;
create policy member_deliveries_read on public.member_deliveries
 for select to authenticated
 using (public.has_clan_permission(clan_id, 'member.view'));

grant select on public.member_deliveries to authenticated;

create function public.record_member_delivery(
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
begin
 if not public.has_clan_permission(p_clan_id,'member.manage') then
  raise exception 'Not authorized' using errcode = '42501';
 end if;
 select delivery_tracking_started_on into tracking_start
 from public.clans where id=p_clan_id and status='ACTIVE' for update;
 if not found then raise exception 'Not authorized' using errcode = '42501'; end if;

 select joined_at::date into member_start
 from public.clan_members
 where id=p_member_id and clan_id=p_clan_id and status='ACTIVE';
 if not found then raise exception 'Member not found' using errcode = 'P0002'; end if;

 select created_at::date,decimal_places into asset_start,asset_decimals
 from public.assets
 where id=p_asset_id and clan_id=p_clan_id and is_active and required_quantity>0;
 if not found then raise exception 'Asset not found' using errcode = 'P0002'; end if;

 if p_delivery_date < greatest(tracking_start,member_start,asset_start)
  or p_delivery_date > current_date or p_quantity <= 0
  or p_quantity = 'NaN'::numeric or p_quantity <> round(p_quantity,asset_decimals) then
  raise exception 'Invalid delivery details' using errcode = '22023';
 end if;

 insert into public.member_deliveries(clan_id,member_id,asset_id,delivery_date,quantity,recorded_by)
 values(p_clan_id,p_member_id,p_asset_id,p_delivery_date,p_quantity,auth.uid())
 returning id into new_id;
 return new_id;
end
$$;

revoke all on function public.record_member_delivery(uuid,uuid,uuid,date,numeric) from public,anon;
grant execute on function public.record_member_delivery(uuid,uuid,uuid,date,numeric) to authenticated;