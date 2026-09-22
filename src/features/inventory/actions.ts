"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { ClanActionState } from "@/features/clans/state";
import {
  assetReferenceSchema,
  createAssetSchema,
  createWarehouseSchema,
  updateAssetSchema,
  updateWarehouseSchema,
  warehouseReferenceSchema,
} from "@/features/inventory/schemas";
import { createClient } from "@/lib/supabase/server";

const values = (formData: FormData) => Object.fromEntries(formData.entries());

async function authenticatedClan(clanSlug: string) {
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  if (typeof claims?.claims?.sub !== "string") return null;
  const { data: clan } = await supabase
    .from("clans")
    .select("id")
    .eq("slug", clanSlug)
    .maybeSingle();
  return clan ? { supabase, clan } : null;
}

function invalid(message = "กรุณาตรวจสอบข้อมูล"): ClanActionState {
  return { status: "error", message };
}

export async function createWarehouseAction(
  _state: ClanActionState,
  formData: FormData,
): Promise<ClanActionState> {
  const parsed = createWarehouseSchema.safeParse(values(formData));
  if (!parsed.success) return invalid("กรุณาตรวจสอบข้อมูล Warehouse");
  const context = await authenticatedClan(parsed.data.clanSlug);
  if (!context) return invalid("ไม่พบ Clan/Gang หรือคุณไม่มีสิทธิ์");
  const { error } = await context.supabase.rpc("create_warehouse", {
    p_clan_id: context.clan.id,
    p_name: parsed.data.name,
    p_description: parsed.data.description || undefined,
  });
  if (error) {
    console.error("Warehouse creation failed", error.code, error.message);
    return invalid(
      error.code === "23505"
        ? "ชื่อ Warehouse นี้ถูกใช้งานแล้ว"
        : "สร้าง Warehouse ไม่สำเร็จ",
    );
  }
  revalidatePath(`/c/${parsed.data.clanSlug}/warehouses`);
  redirect(`/c/${parsed.data.clanSlug}/warehouses?created=1`);
}

export async function updateWarehouseAction(
  _state: ClanActionState,
  formData: FormData,
): Promise<ClanActionState> {
  const parsed = updateWarehouseSchema.safeParse(values(formData));
  if (!parsed.success) return invalid("กรุณาตรวจสอบข้อมูล Warehouse");
  const context = await authenticatedClan(parsed.data.clanSlug);
  if (!context) return invalid("ไม่พบ Clan/Gang หรือคุณไม่มีสิทธิ์");
  const { error } = await context.supabase.rpc("update_warehouse_details", {
    p_clan_id: context.clan.id,
    p_warehouse_id: parsed.data.warehouseId,
    p_name: parsed.data.name,
    p_description: parsed.data.description || undefined,
  });
  if (error) {
    console.error("Warehouse update failed", error.code, error.message);
    return invalid(
      error.code === "23505"
        ? "ชื่อ Warehouse นี้ถูกใช้งานแล้ว"
        : "แก้ไข Warehouse ไม่สำเร็จ",
    );
  }
  revalidatePath(`/c/${parsed.data.clanSlug}/warehouses`);
  revalidatePath(
    `/c/${parsed.data.clanSlug}/warehouses/${parsed.data.warehouseId}`,
  );
  revalidatePath(`/c/${parsed.data.clanSlug}/dashboard`);
  redirect(`/c/${parsed.data.clanSlug}/warehouses?updated=1`);
}

export async function setDefaultWarehouseAction(formData: FormData) {
  const parsed = warehouseReferenceSchema.safeParse(values(formData));
  if (!parsed.success) redirect("/clans");
  const context = await authenticatedClan(parsed.data.clanSlug);
  if (!context) redirect("/clans");
  const { error } = await context.supabase.rpc("set_default_warehouse", {
    p_clan_id: context.clan.id,
    p_warehouse_id: parsed.data.warehouseId,
  });
  if (error) {
    console.error("Default warehouse update failed", error.code, error.message);
    redirect(`/c/${parsed.data.clanSlug}/warehouses?error=default`);
  }
  revalidatePath(`/c/${parsed.data.clanSlug}/warehouses`);
  revalidatePath(`/c/${parsed.data.clanSlug}/dashboard`);
  redirect(`/c/${parsed.data.clanSlug}/warehouses?defaultChanged=1`);
}

export async function deactivateWarehouseAction(formData: FormData) {
  const parsed = warehouseReferenceSchema.safeParse(values(formData));
  if (!parsed.success) redirect("/clans");
  const context = await authenticatedClan(parsed.data.clanSlug);
  if (!context) redirect("/clans");
  const { error } = await context.supabase.rpc("deactivate_warehouse", {
    p_clan_id: context.clan.id,
    p_warehouse_id: parsed.data.warehouseId,
  });
  if (error) {
    console.error("Warehouse deactivation failed", error.code, error.message);
    redirect(
      `/c/${parsed.data.clanSlug}/warehouses?error=${error.code === "23514" ? "warehouse-balance" : "deactivate"}`,
    );
  }
  revalidatePath(`/c/${parsed.data.clanSlug}/warehouses`);
  redirect(`/c/${parsed.data.clanSlug}/warehouses?deactivated=1`);
}

export async function createAssetAction(
  _state: ClanActionState,
  formData: FormData,
): Promise<ClanActionState> {
  const parsed = createAssetSchema.safeParse(values(formData));
  if (!parsed.success) return invalid("กรุณาตรวจสอบข้อมูล Asset");
  const context = await authenticatedClan(parsed.data.clanSlug);
  if (!context) return invalid("ไม่พบ Clan/Gang หรือคุณไม่มีสิทธิ์");
  const { error } = await context.supabase.rpc("create_asset", {
    p_clan_id: context.clan.id,
    p_code: parsed.data.code,
    p_name: parsed.data.name,
    p_asset_type: parsed.data.assetType,
    p_unit: parsed.data.unit,
    p_decimal_places: parsed.data.decimalPlaces,
    p_allow_negative: parsed.data.allowNegative,
    p_image_url: parsed.data.imageUrl || undefined,
  });
  if (error) {
    console.error("Asset creation failed", error.code, error.message);
    return invalid(
      error.code === "23505"
        ? "Code นี้ถูกใช้งานแล้ว"
        : "สร้าง Asset ไม่สำเร็จ",
    );
  }
  revalidatePath(`/c/${parsed.data.clanSlug}/assets`);
  redirect(`/c/${parsed.data.clanSlug}/assets?created=1`);
}

export async function updateAssetAction(
  _state: ClanActionState,
  formData: FormData,
): Promise<ClanActionState> {
  const parsed = updateAssetSchema.safeParse(values(formData));
  if (!parsed.success) return invalid("กรุณาตรวจสอบข้อมูล Asset");
  const context = await authenticatedClan(parsed.data.clanSlug);
  if (!context) return invalid("ไม่พบ Clan/Gang หรือคุณไม่มีสิทธิ์");
  const { error } = await context.supabase.rpc("update_asset_details", {
    p_clan_id: context.clan.id,
    p_asset_id: parsed.data.assetId,
    p_name: parsed.data.name,
    p_image_url: parsed.data.imageUrl || undefined,
  });
  if (error) {
    console.error("Asset update failed", error.code, error.message);
    return invalid("แก้ไข Asset ไม่สำเร็จ");
  }
  revalidatePath(`/c/${parsed.data.clanSlug}/assets`);
  redirect(`/c/${parsed.data.clanSlug}/assets?updated=1`);
}

export async function deactivateAssetAction(formData: FormData) {
  const parsed = assetReferenceSchema.safeParse(values(formData));
  if (!parsed.success) redirect("/clans");
  const context = await authenticatedClan(parsed.data.clanSlug);
  if (!context) redirect("/clans");
  const { error } = await context.supabase.rpc("deactivate_asset", {
    p_clan_id: context.clan.id,
    p_asset_id: parsed.data.assetId,
  });
  if (error) {
    console.error("Asset deactivation failed", error.code, error.message);
    redirect(
      `/c/${parsed.data.clanSlug}/assets?error=${error.code === "23514" ? "asset-balance" : "deactivate"}`,
    );
  }
  revalidatePath(`/c/${parsed.data.clanSlug}/assets`);
  redirect(`/c/${parsed.data.clanSlug}/assets?deactivated=1`);
}
