create function public.can_access_asset_image_object(p_name text, p_write boolean default false)
returns boolean
language plpgsql stable security definer set search_path = ''
as $$
declare tenant uuid;
begin
 if p_name !~ '^[0-9a-f-]{36}/[0-9a-f-]{36}\.(jpg|png|webp|gif)$' then
  return false;
 end if;
 tenant := split_part(p_name, '/', 1)::uuid;
 if p_write then
  return public.has_clan_permission(tenant, 'asset.manage');
 end if;
 return public.has_clan_permission(tenant, 'asset.view');
exception when invalid_text_representation then return false;
end
$$;

insert into storage.buckets(id, name, public, file_size_limit, allowed_mime_types)
values('asset-images', 'asset-images', false, 5242880,
 array['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
on conflict(id) do update set public=false,
 file_size_limit=excluded.file_size_limit,
 allowed_mime_types=excluded.allowed_mime_types;

create policy asset_images_read on storage.objects for select to authenticated
 using(bucket_id='asset-images' and public.can_access_asset_image_object(name, false));
create policy asset_images_insert on storage.objects for insert to authenticated
 with check(bucket_id='asset-images' and public.can_access_asset_image_object(name, true));
create policy asset_images_delete on storage.objects for delete to authenticated
 using(bucket_id='asset-images' and public.can_access_asset_image_object(name, true));

revoke all on function public.can_access_asset_image_object(text, boolean) from public, anon;
grant execute on function public.can_access_asset_image_object(text, boolean) to authenticated;
