-- Keep Delivery dates aligned with the application's Asia/Bangkok calendar.
alter table public.clans
  alter column delivery_tracking_started_on
  set default ((now() at time zone 'Asia/Bangkok')::date);

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

 select joined_at::date into member_start
 from public.clan_members
 where id=p_member_id and clan_id=p_clan_id and status='ACTIVE';
 if not found then raise exception 'Member not found' using errcode = 'P0002'; end if;

 select created_at::date,decimal_places into asset_start,asset_decimals
 from public.assets
 where id=p_asset_id and clan_id=p_clan_id and is_active and required_quantity>0;
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