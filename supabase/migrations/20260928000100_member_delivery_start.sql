-- Configure the first Delivery date independently for each member.
alter table public.clan_members
 add column delivery_started_on date not null
 default (now() at time zone 'Asia/Bangkok')::date;

update public.clan_members
set delivery_started_on = coalesce(
 (joined_at at time zone 'Asia/Bangkok')::date,
 (created_at at time zone 'Asia/Bangkok')::date,
 (now() at time zone 'Asia/Bangkok')::date
);

create function public.update_clan_member_details(
 p_clan_id uuid,
 p_member_id uuid,
 p_character_name text,
 p_role_id uuid,
 p_delivery_started_on date
) returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
 clean_name text := btrim(p_character_name);
 tracking_start date;
begin
 if not public.has_clan_permission(p_clan_id, 'member.manage') then
  raise exception 'Not authorized' using errcode = '42501';
 end if;
 if length(clean_name) not between 1 and 100 then
  raise exception 'Invalid character name' using errcode = '22023';
 end if;

 select delivery_tracking_started_on into tracking_start
 from public.clans
 where id = p_clan_id and status = 'ACTIVE'
 for update;
 if not found then
  raise exception 'Not authorized' using errcode = '42501';
 end if;

 perform 1 from public.clan_roles
 where id = p_role_id and clan_id = p_clan_id;
 if not found then
  raise exception 'Role not found' using errcode = 'P0002';
 end if;

 if p_delivery_started_on is null
  or p_delivery_started_on < tracking_start
  or p_delivery_started_on > (now() at time zone 'Asia/Bangkok')::date then
  raise exception 'Invalid delivery start date' using errcode = '22023';
 end if;

 if exists (
  select 1 from public.clan_members
  where clan_id = p_clan_id
   and id <> p_member_id
   and status = 'ACTIVE'
   and lower(btrim(character_name)) = lower(clean_name)
 ) then
  raise exception 'Member already exists' using errcode = '23505';
 end if;

 update public.clan_members
 set character_name = clean_name,
     role_id = p_role_id,
     delivery_started_on = p_delivery_started_on,
     updated_at = now()
 where id = p_member_id and clan_id = p_clan_id and status = 'ACTIVE';
 if not found then
  raise exception 'Member not found' using errcode = 'P0002';
 end if;

 return p_member_id;
end
$$;

revoke all on function public.update_clan_member_details(uuid,uuid,text,uuid,date)
 from public, anon;
grant execute on function public.update_clan_member_details(uuid,uuid,text,uuid,date)
 to authenticated;

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

 if p_delivery_date < greatest(tracking_start,member_start,asset_start)
  or p_delivery_date > (now() at time zone 'Asia/Bangkok')::date or p_quantity <= 0
  or p_quantity = 'NaN'::numeric or p_quantity <> round(p_quantity,asset_decimals) then
  raise exception 'Invalid delivery details' using errcode = '22023';
 end if;

 insert into public.member_deliveries(clan_id,member_id,asset_id,delivery_date,quantity,recorded_by)
 values(p_clan_id,p_member_id,p_asset_id,p_delivery_date,p_quantity,auth.uid())
 returning id into new_id;
 return new_id;
end
$$;

create or replace function public.update_member_delivery(
 p_clan_id uuid,
 p_delivery_id uuid,
 p_delivery_date date,
 p_asset_id uuid,
 p_quantity numeric
) returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
 delivery_member_id uuid;
 tracking_start date;
 member_start date;
 asset_start date;
 asset_decimals integer;
begin
 if not public.has_clan_permission(p_clan_id,'member.manage') then
  raise exception 'Not authorized' using errcode = '42501';
 end if;

 select member_id into delivery_member_id
 from public.member_deliveries
 where id=p_delivery_id and clan_id=p_clan_id
 for update;
 if not found then
  raise exception 'Delivery not found' using errcode = 'P0002';
 end if;

 select delivery_tracking_started_on into tracking_start
 from public.clans where id=p_clan_id and status='ACTIVE';
 if not found then
  raise exception 'Not authorized' using errcode = '42501';
 end if;

 select delivery_started_on into member_start
 from public.clan_members
 where id=delivery_member_id and clan_id=p_clan_id and status='ACTIVE';
 if not found then
  raise exception 'Member not found' using errcode = 'P0002';
 end if;

 select created_at::date,decimal_places into asset_start,asset_decimals
 from public.assets
 where id=p_asset_id and clan_id=p_clan_id and is_active;
 if not found then
  raise exception 'Asset not found' using errcode = 'P0002';
 end if;

 if p_delivery_date < greatest(tracking_start,member_start,asset_start)
  or p_delivery_date > (now() at time zone 'Asia/Bangkok')::date
  or p_quantity <= 0 or p_quantity = 'NaN'::numeric
  or p_quantity <> round(p_quantity,asset_decimals) then
  raise exception 'Invalid delivery details' using errcode = '22023';
 end if;

 update public.member_deliveries
 set asset_id=p_asset_id,
     delivery_date=p_delivery_date,
     quantity=p_quantity,
     recorded_by=auth.uid()
 where id=p_delivery_id and clan_id=p_clan_id;

 return p_delivery_id;
end
$$;
