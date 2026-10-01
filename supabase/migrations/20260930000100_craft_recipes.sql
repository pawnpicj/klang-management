-- Recipe planning only. These functions never write inventory movements.
insert into public.permissions(code, description) values
 ('craft.view', 'View crafting recipes'), ('craft.manage', 'Manage crafting recipes')
on conflict (code) do update set description=excluded.description;
insert into private.default_role_permissions(role_name,permission_code)
select r,p from unnest(array['Member','Depositor','Treasurer','Approver','Leader','Manager']) r
cross join unnest(array['craft.view','craft.manage']) p
where p='craft.view' or r in ('Leader','Manager') on conflict do nothing;
insert into public.role_permissions(clan_id,role_id,permission_code)
select r.clan_id,r.id,p.permission_code from public.clan_roles r
join private.default_role_permissions p on p.role_name=r.name::text
where r.is_system_role and p.permission_code in ('craft.view','craft.manage') on conflict do nothing;

create table public.craft_recipes (
 id uuid primary key default gen_random_uuid(),
 clan_id uuid not null references public.clans(id),
 name text not null check(length(btrim(name)) between 1 and 100),
 output jsonb not null check(jsonb_typeof(output)='object'),
 materials jsonb not null check(jsonb_typeof(materials)='array' and jsonb_array_length(materials) between 1 and 50),
 created_by uuid not null references public.profiles(id),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create index craft_recipes_clan on public.craft_recipes(clan_id,created_at desc);
alter table public.craft_recipes enable row level security;
alter table public.craft_recipes force row level security;
revoke all on public.craft_recipes from anon,authenticated;
grant select on public.craft_recipes to authenticated;
create policy craft_recipes_read on public.craft_recipes for select to authenticated
 using (public.has_clan_permission(clan_id,'craft.view'));
create trigger touch_updated before update on public.craft_recipes
 for each row execute function private.touch_updated_at();
create trigger audit_mutations after insert or update or delete on public.craft_recipes
 for each row execute function private.write_audit();
create policy craft_assets_read on public.assets for select to authenticated
 using (public.has_clan_permission(clan_id,'craft.view'));

create function public.save_craft_recipe(
 p_clan_id uuid,p_recipe_id uuid,p_name text,p_output jsonb,p_materials jsonb
) returns uuid language plpgsql security definer set search_path='' as $$
declare item jsonb; qty numeric; recipe_id uuid; asset_id uuid; image_path text;
begin
 if auth.uid() is null or not public.has_clan_permission(p_clan_id,'craft.manage') then
  raise exception 'Not authorized' using errcode='42501';
 end if;
 perform 1 from public.clans where id=p_clan_id and status='ACTIVE' for update;
 if not found then raise exception 'Not authorized' using errcode='42501'; end if;
 if p_name is null or length(btrim(p_name)) not between 1 and 100
  or p_output is null or jsonb_typeof(p_output)<>'object'
  or p_materials is null or jsonb_typeof(p_materials)<>'array' then
  raise exception 'Invalid recipe' using errcode='22023';
 end if;
 if jsonb_array_length(p_materials) not between 1 and 50 then
  raise exception 'Invalid materials' using errcode='22023';
 end if;
 for item in select value from jsonb_array_elements(jsonb_build_array(p_output)||p_materials) loop
  if jsonb_typeof(item)<>'object' or coalesce(item->>'source','') not in ('ASSET','CUSTOM')
   or coalesce(jsonb_typeof(item->'quantity'),'')<>'number' then
   raise exception 'Invalid recipe item' using errcode='22023';
  end if;
  qty:=(item->>'quantity')::numeric;
  if qty<=0 or qty>1000000000000 or qty<>round(qty,4) then
   raise exception 'Invalid quantity' using errcode='22023';
  end if;
  if item->>'source'='ASSET' then
   asset_id:=nullif(item->>'assetId','')::uuid;
   if asset_id is null or not exists(select 1 from public.assets where id=asset_id and clan_id=p_clan_id and is_active) then
    raise exception 'Asset not found in Clan' using errcode='22023';
   end if;
   if nullif(item->>'imagePath','') is not null then
    raise exception 'Asset image comes from Assets' using errcode='22023';
   end if;
  else
   if length(btrim(coalesce(item->>'name',''))) not between 1 and 100
    or length(btrim(coalesce(item->>'unit',''))) not between 1 and 30
    or nullif(item->>'assetId','') is not null then
    raise exception 'Invalid custom item' using errcode='22023';
   end if;
   image_path:=nullif(item->>'imagePath','');
   if image_path is not null and (length(image_path)>300 or split_part(image_path,'/',1)<>p_clan_id::text) then
    raise exception 'Invalid image path' using errcode='22023';
   end if;
  end if;
 end loop;
 if p_recipe_id is null then
  insert into public.craft_recipes(clan_id,name,output,materials,created_by)
   values(p_clan_id,btrim(p_name),p_output,p_materials,auth.uid()) returning id into recipe_id;
 else
  update public.craft_recipes set name=btrim(p_name),output=p_output,materials=p_materials
   where id=p_recipe_id and clan_id=p_clan_id returning id into recipe_id;
  if not found then raise exception 'Recipe not found' using errcode='P0002'; end if;
 end if;
 return recipe_id;
end $$;
create function public.delete_craft_recipe(p_clan_id uuid,p_recipe_id uuid)
 returns uuid language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null or not public.has_clan_permission(p_clan_id,'craft.manage') then
  raise exception 'Not authorized' using errcode='42501';
 end if;
 delete from public.craft_recipes where id=p_recipe_id and clan_id=p_clan_id;
 if not found then raise exception 'Recipe not found' using errcode='P0002'; end if;
 return p_recipe_id;
end $$;
revoke all on function public.save_craft_recipe(uuid,uuid,text,jsonb,jsonb) from public,anon;
revoke all on function public.delete_craft_recipe(uuid,uuid) from public,anon;
grant execute on function public.save_craft_recipe(uuid,uuid,text,jsonb,jsonb) to authenticated;
grant execute on function public.delete_craft_recipe(uuid,uuid) to authenticated;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
 values('craft-images','craft-images',false,5242880,array['image/jpeg','image/png','image/webp','image/gif']);
create policy craft_images_read on storage.objects for select to authenticated
 using (bucket_id='craft-images' and exists(select 1 from public.clans c
  where c.id::text=split_part(storage.objects.name,'/',1) and public.has_clan_permission(c.id,'craft.view')));
create policy craft_images_insert on storage.objects for insert to authenticated
 with check (bucket_id='craft-images' and exists(select 1 from public.clans c
  where c.id::text=split_part(storage.objects.name,'/',1) and public.has_clan_permission(c.id,'craft.manage')));
create policy craft_images_delete on storage.objects for delete to authenticated
 using (bucket_id='craft-images' and exists(select 1 from public.clans c
  where c.id::text=split_part(storage.objects.name,'/',1) and public.has_clan_permission(c.id,'craft.manage')));

create policy craft_asset_images_read on storage.objects for select to authenticated
 using (bucket_id='asset-images' and exists(select 1 from public.clans c
  where c.id::text=split_part(storage.objects.name,'/',1) and public.has_clan_permission(c.id,'craft.view')));
