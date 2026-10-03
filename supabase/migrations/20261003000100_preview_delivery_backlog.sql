-- Public delivery totals are opt-in; raw records and member IDs remain private.
create or replace function private.valid_member_preview_columns(value text[]) returns boolean
language sql immutable set search_path='' as $$
 select coalesce(cardinality(value) between 1 and 4 and value <@ array['MEMBER','SOCIAL','EQUIPMENT','DELIVERIES']::text[]
 and array_position(value,null) is null and cardinality(value)=(select count(distinct item) from unnest(value) item),false);
$$;
create function private.public_delivery_summary(p_clan_id uuid,p_member_id uuid)
returns jsonb language sql stable set search_path='' as $$
 with context as (
   select greatest(c.delivery_tracking_started_on,coalesce(m.delivery_started_on,(m.joined_at at time zone 'UTC')::date)) as start_date,
     (now() at time zone 'Asia/Bangkok')::date as end_date
   from public.clans c join public.clan_members m on m.clan_id=c.id
   where c.id=p_clan_id and m.id=p_member_id
 ), payments as (
   select d.asset_id,d.delivery_date,sum(d.quantity) as quantity
   from public.member_deliveries d,context ctx
   where d.clan_id=p_clan_id and d.member_id=p_member_id
     and d.delivery_date between ctx.start_date and ctx.end_date
   group by d.asset_id,d.delivery_date
 ), daily as (
   select a.id,a.name,a.unit,day::date as due_date,
     a.required_quantity-coalesce(p.quantity,0) as net
   from public.assets a cross join context ctx
   cross join lateral generate_series(greatest(ctx.start_date,(a.created_at at time zone 'UTC')::date)::timestamp,ctx.end_date::timestamp,interval '1 day') day
   left join payments p on p.asset_id=a.id and p.delivery_date=day::date
   where a.clan_id=p_clan_id and a.is_active and a.required_quantity>0
 ), running as (
   select *,sum(net) over(partition by id order by due_date) as balance from daily
 ), remaining as (
   -- Reflect unpaid daily obligations; discard excess paid before a future day accrues.
   select id,name,unit,sum(net)-least(0,min(balance)) as quantity
   from running group by id,name,unit
 ), items as (
   select coalesce(jsonb_agg(jsonb_build_object('name',name,'unit',unit,'quantity',quantity) order by name,id) filter(where quantity>0),'[]'::jsonb) as value from remaining
 ) select jsonb_build_object('complete',jsonb_array_length(value)=0,'items',value) from items;
$$;
revoke all on function private.public_delivery_summary(uuid,uuid) from public,anon,authenticated;
create function public.get_public_member_preview_with_deliveries(p_clan_slug text)
returns table(character_name text,social_links jsonb,equipment jsonb,delivery_summary jsonb)
language sql stable security definer set search_path='' as $$
 select case when 'MEMBER'=any(c.members_preview_columns) then m.character_name else '' end,
 case when 'SOCIAL'=any(c.members_preview_columns) then m.social_links else '{}'::jsonb end,
 case when 'EQUIPMENT'=any(c.members_preview_columns) then coalesce((select jsonb_agg(jsonb_build_object('category',item->>'category','name',item->>'name') order by ordinal)
 from jsonb_array_elements(m.equipment) with ordinality as items(item,ordinal)),'[]'::jsonb) else '[]'::jsonb end,
 case when 'DELIVERIES'=any(c.members_preview_columns) then private.public_delivery_summary(c.id,m.id) else null end
 from public.clans c join public.clan_members m on m.clan_id=c.id
 where c.slug=p_clan_slug and c.members_preview_public and c.status='ACTIVE' and m.status='ACTIVE'
 order by m.joined_at,m.id;
$$;

revoke all on function public.get_public_member_preview_with_deliveries(text) from public;
grant execute on function public.get_public_member_preview_with_deliveries(text) to anon,authenticated;
