-- Allow managers to correct an existing delivery without creating a duplicate entry.
create function public.update_member_delivery(
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

 select joined_at::date into member_start
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

revoke all on function public.update_member_delivery(uuid,uuid,date,uuid,numeric)
 from public,anon;
grant execute on function public.update_member_delivery(uuid,uuid,date,uuid,numeric)
 to authenticated;
