"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { ClanActionState } from "@/features/clans/state";
import {
  adjustInventorySchema,
  assetReferenceSchema,
  createAssetSchema,
  createWarehouseSchema,
  transferInventorySchema,
  updateAssetSchema,
  updateWarehouseSchema,
  warehouseReferenceSchema,
} from "@/features/inventory/schemas";
import {
  getAssetImageValidationError,
  hasValidAssetImageSignature,
} from "@/features/inventory/image";
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

const imageExtensions: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

async function assetImageFrom(formData: FormData) {
  const entry = formData.get("image");
  if (!entry || (entry instanceof File && entry.size === 0)) {
    return { file: null, error: null };
  }
  if (!(entry instanceof File)) {
    return { file: null, error: "กรุณาเลือกไฟล์รูปภาพ" };
  }
  const error = getAssetImageValidationError(entry);
  if (error) return { file: null, error };
  if (!(await hasValidAssetImageSignature(entry))) {
    return { file: null, error: "เนื้อหาไฟล์ไม่ตรงกับประเภทรูปภาพ" };
  }
  return { file: entry, error: null };
}

async function uploadAssetImage(
  supabase: Awaited<ReturnType<typeof createClient>>,
  clanId: string,
  file: File,
) {
  const path = `${clanId}/${randomUUID()}.${imageExtensions[file.type]}`;
  const { error } = await supabase.storage
    .from("asset-images")
    .upload(path, file, {
      contentType: file.type,
      upsert: false,
    });
  if (error) {
    console.error("Asset image upload failed", error.message);
    return null;
  }
  return path;
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
  const image = await assetImageFrom(formData);
  if (image.error) return invalid(image.error);
  const context = await authenticatedClan(parsed.data.clanSlug);
  if (!context) return invalid("ไม่พบ Clan/Gang หรือคุณไม่มีสิทธิ์");
  const imagePath = image.file
    ? await uploadAssetImage(context.supabase, context.clan.id, image.file)
    : null;
  if (image.file && !imagePath) return invalid("อัปโหลดรูปภาพไม่สำเร็จ");
  const { error } = await context.supabase.rpc(
    "create_asset_with_inventory_settings",
    {
      p_clan_id: context.clan.id,
      p_code: parsed.data.code,
      p_name: parsed.data.name,
      p_asset_type: parsed.data.assetType,
      p_unit: parsed.data.unit,
      p_required_quantity: parsed.data.requiredQuantity,
      p_low_stock_threshold: parsed.data.lowStockThreshold,
      p_decimal_places: 0,
      p_allow_negative: false,
      p_image_url: imagePath ?? undefined,
    },
  );
  if (error) {
    if (imagePath)
      await context.supabase.storage.from("asset-images").remove([imagePath]);
    console.error("Asset creation failed", error.code, error.message);
    return invalid(
      error.code === "23505"
        ? "Code นี้ถูกใช้งานแล้ว"
        : "สร้าง Asset ไม่สำเร็จ",
    );
  }
  revalidatePath(`/c/${parsed.data.clanSlug}/assets`);
  revalidatePath(`/c/${parsed.data.clanSlug}/deliveries`);
  revalidatePath(`/c/${parsed.data.clanSlug}/inventory`);
  redirect(`/c/${parsed.data.clanSlug}/assets?created=1`);
}

export async function updateAssetAction(
  _state: ClanActionState,
  formData: FormData,
): Promise<ClanActionState> {
  const parsed = updateAssetSchema.safeParse(values(formData));
  if (!parsed.success) return invalid("กรุณาตรวจสอบข้อมูล Asset");
  const image = await assetImageFrom(formData);
  if (image.error) return invalid(image.error);
  const context = await authenticatedClan(parsed.data.clanSlug);
  if (!context) return invalid("ไม่พบ Clan/Gang หรือคุณไม่มีสิทธิ์");
  const { data: asset } = await context.supabase
    .from("assets")
    .select("image_url")
    .eq("clan_id", context.clan.id)
    .eq("id", parsed.data.assetId)
    .eq("is_active", true)
    .maybeSingle();
  if (!asset) return invalid("ไม่พบ Asset หรือคุณไม่มีสิทธิ์");
  const imagePath = image.file
    ? await uploadAssetImage(context.supabase, context.clan.id, image.file)
    : null;
  if (image.file && !imagePath) return invalid("อัปโหลดรูปภาพไม่สำเร็จ");
  const { error } = await context.supabase.rpc(
    "update_asset_with_inventory_settings",
    {
      p_clan_id: context.clan.id,
      p_asset_id: parsed.data.assetId,
      p_name: parsed.data.name,
      p_required_quantity: parsed.data.requiredQuantity,
      p_low_stock_threshold: parsed.data.lowStockThreshold,
      p_image_url: imagePath ?? asset.image_url ?? undefined,
    },
  );
  if (error) {
    if (imagePath)
      await context.supabase.storage.from("asset-images").remove([imagePath]);
    console.error("Asset update failed", error.code, error.message);
    return invalid("แก้ไข Asset ไม่สำเร็จ");
  }
  if (imagePath && asset.image_url?.startsWith(`${context.clan.id}/`)) {
    const { error: removeError } = await context.supabase.storage
      .from("asset-images")
      .remove([asset.image_url]);
    if (removeError)
      console.error("Old Asset image cleanup failed", removeError.message);
  }
  revalidatePath(`/c/${parsed.data.clanSlug}/assets`);
  revalidatePath(`/c/${parsed.data.clanSlug}/deliveries`);
  revalidatePath(`/c/${parsed.data.clanSlug}/inventory`);
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
  revalidatePath(`/c/${parsed.data.clanSlug}/deliveries`);
  revalidatePath(`/c/${parsed.data.clanSlug}/inventory`);
  redirect(`/c/${parsed.data.clanSlug}/assets?deactivated=1`);
}

export async function adjustInventoryAction(
  _state: ClanActionState,
  formData: FormData,
): Promise<ClanActionState> {
  const parsed = adjustInventorySchema.safeParse(values(formData));
  if (!parsed.success) {
    return invalid(parsed.error.issues[0]?.message ?? "กรุณาตรวจสอบข้อมูล");
  }
  const context = await authenticatedClan(parsed.data.clanSlug);
  if (!context) return invalid("ไม่พบ Clan/Gang หรือคุณไม่มีสิทธิ์");
  const { error } = await context.supabase.rpc("adjust_inventory", {
    p_clan_id: context.clan.id,
    p_warehouse_id: parsed.data.warehouseId,
    p_asset_id: parsed.data.assetId,
    p_mode: parsed.data.mode,
    p_quantity: parsed.data.quantity,
    p_transaction_date: parsed.data.transactionDate,
    p_note: parsed.data.note,
    p_client_request_id: parsed.data.clientRequestId,
  });
  if (error) {
    console.error("Inventory adjustment failed", error.code, error.message);
    return invalid(
      error.code === "42501"
        ? "คุณไม่มีสิทธิ์ปรับยอด Inventory"
        : error.code === "23514"
          ? "ยอดคงเหลือไม่เพียงพอ"
          : error.code === "22023"
            ? "ยอดใหม่ต้องต่างจากยอดปัจจุบัน และข้อมูลต้องถูกต้อง"
            : "ปรับยอด Inventory ไม่สำเร็จ",
    );
  }
  revalidatePath(`/c/${parsed.data.clanSlug}/inventory`);
  revalidatePath(`/c/${parsed.data.clanSlug}/warehouses`);
  redirect(`/c/${parsed.data.clanSlug}/inventory?updated=1`);
}
export async function transferInventoryAction(
  _state: ClanActionState,
  formData: FormData,
): Promise<ClanActionState> {
  const parsed = transferInventorySchema.safeParse(values(formData));
  if (!parsed.success) {
    return invalid(parsed.error.issues[0]?.message ?? "กรุณาตรวจสอบข้อมูล");
  }
  const context = await authenticatedClan(parsed.data.clanSlug);
  if (!context) return invalid("ไม่พบ Clan/Gang หรือคุณไม่มีสิทธิ์");
  const { error } = await context.supabase.rpc("transfer_inventory", {
    p_clan_id: context.clan.id,
    p_from_warehouse_id: parsed.data.fromWarehouseId,
    p_to_warehouse_id: parsed.data.toWarehouseId,
    p_asset_id: parsed.data.assetId,
    p_quantity: parsed.data.quantity,
    p_transaction_date: parsed.data.transactionDate,
    p_note: parsed.data.note,
    p_client_request_id: parsed.data.clientRequestId,
  });
  if (error) {
    console.error("Inventory transfer failed", error.code, error.message);
    return invalid(
      error.code === "42501"
        ? "คุณไม่มีสิทธิ์ Transfer Inventory"
        : error.code === "23514"
          ? "ยอดในคลังต้นทางไม่เพียงพอ"
          : error.code === "22023"
            ? "คลังหรือข้อมูล Transfer ไม่ถูกต้อง"
            : "Transfer สินค้าไม่สำเร็จ",
    );
  }
  revalidatePath(`/c/${parsed.data.clanSlug}/inventory`);
  revalidatePath(`/c/${parsed.data.clanSlug}/warehouses`);
  redirect(`/c/${parsed.data.clanSlug}/inventory?transferred=1`);
}
