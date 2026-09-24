-- Allow managers to remove an incorrectly recorded delivery.
create function public.delete_member_delivery(
 p_clan_id uuid,
 p_delivery_id uuid
) returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
 deleted_id uuid;
begin
 if not public.has_clan_permission(p_clan_id,'member.manage') then
  raise exception 'Not authorized' using errcode = '42501';
 end if;

 delete from public.member_deliveries
 where id=p_delivery_id and clan_id=p_clan_id
 returning id into deleted_id;

 if deleted_id is null then
  raise exception 'Delivery not found' using errcode = 'P0002';
 end if;

 return deleted_id;
end
$$;

revoke all on function public.delete_member_delivery(uuid,uuid)
 from public,anon;
grant execute on function public.delete_member_delivery(uuid,uuid)
 to authenticated;
