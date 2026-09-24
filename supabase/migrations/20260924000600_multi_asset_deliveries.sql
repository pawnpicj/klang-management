-- Record all Asset quantities from one Delivery form in a single transaction.
create function public.record_member_deliveries(
 p_clan_id uuid,p_member_id uuid,p_delivery_date date,p_items jsonb
) returns integer
language plpgsql security definer set search_path = ''
as $$
declare
 item record;
 recorded_count integer := 0;
begin
 if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) not between 1 and 100 then
  raise exception 'Invalid delivery items' using errcode = '22023';
 end if;

 for item in
  select * from jsonb_to_recordset(p_items) as x(asset_id uuid,quantity numeric)
 loop
  if item.asset_id is null or item.quantity is null then
   raise exception 'Invalid delivery items' using errcode = '22023';
  end if;
  perform public.record_member_delivery(
   p_clan_id,p_member_id,item.asset_id,p_delivery_date,item.quantity
  );
  recorded_count := recorded_count + 1;
 end loop;
 return recorded_count;
end
$$;

revoke all on function public.record_member_deliveries(uuid,uuid,date,jsonb) from public,anon;
grant execute on function public.record_member_deliveries(uuid,uuid,date,jsonb) to authenticated;