-- Store Craft Item's inventory lookup warehouse, without changing stock.
create table public.craft_settings (
 clan_id uuid primary key references public.clans(id),
 warehouse_id uuid not null,
 updated_by uuid not null references public.profiles(id),
 updated_at timestamptz not null default now(),
 foreign key(clan_id,warehouse_id) references public.warehouses(clan_id,id)
);
alter table public.craft_settings enable row level security;
alter table public.craft_settings force row level security;
revoke all on public.craft_settings from anon,authenticated;
grant select on public.craft_settings to authenticated;
create policy craft_settings_read on public.craft_settings for select to authenticated
 using(public.has_clan_permission(clan_id,'craft.view'));
create trigger touch_updated before update on public.craft_settings
 for each row execute function private.touch_updated_at();
create trigger audit_mutations after insert or update or delete on public.craft_settings
 for each row execute function private.write_audit();
create policy craft_settings_warehouses_read on public.warehouses for select to authenticated
 using(public.has_clan_permission(clan_id,'craft.manage'));
create function public.save_craft_settings(p_clan_id uuid,p_warehouse_id uuid)
 returns uuid language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null or not public.has_clan_permission(p_clan_id,'craft.manage') then
  raise exception 'Not authorized' using errcode='42501';
 end if;
 perform 1 from public.clans where id=p_clan_id and status='ACTIVE' for update;
 if not found then raise exception 'Not authorized' using errcode='42501'; end if;
 perform 1 from public.warehouses where id=p_warehouse_id and clan_id=p_clan_id and is_active for update;
 if not found then raise exception 'Invalid warehouse' using errcode='22023'; end if;
 insert into public.craft_settings(clan_id,warehouse_id,updated_by)
  values(p_clan_id,p_warehouse_id,auth.uid())
 on conflict(clan_id) do update set warehouse_id=excluded.warehouse_id,updated_by=excluded.updated_by;
 return p_warehouse_id;
end $$;
revoke all on function public.save_craft_settings(uuid,uuid) from public,anon;
grant execute on function public.save_craft_settings(uuid,uuid) to authenticated;
