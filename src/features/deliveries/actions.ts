"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { ClanActionState } from "@/features/clans/state";
import {
  deleteDeliverySchema,
  recordDeliverySchema,
  updateDeliverySchema,
} from "@/features/deliveries/schemas";
import { createClient } from "@/lib/supabase/server";

async function getClanId(clanSlug: string) {
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  if (typeof claims?.claims?.sub !== "string") {
    return { supabase, clanId: null, error: "กรุณาเข้าสู่ระบบอีกครั้ง" };
  }

  const { data: clan } = await supabase
    .from("clans")
    .select("id")
    .eq("slug", clanSlug)
    .maybeSingle();

  return {
    supabase,
    clanId: clan?.id ?? null,
    error: clan ? null : "ไม่พบ Clan/Gang หรือคุณไม่มีสิทธิ์",
  };
}

export async function recordDeliveryAction(
  _state: ClanActionState,
  formData: FormData,
): Promise<ClanActionState> {
  const assetIds = formData.getAll("assetId").map(String);
  const quantities = formData.getAll("quantity").map(String);
  const items = assetIds
    .map((assetId, index) => ({ assetId, quantity: quantities[index] ?? "" }))
    .filter((item) => item.quantity.trim() !== "");
  const parsed = recordDeliverySchema.safeParse({
    clanSlug: formData.get("clanSlug"),
    memberId: formData.get("memberId"),
    deliveryDate: formData.get("deliveryDate"),
    items,
  });
  if (!parsed.success) {
    return {
      status: "error",
      message: parsed.error.issues[0]?.message ?? "กรุณาตรวจสอบข้อมูล",
    };
  }

  const {
    supabase,
    clanId,
    error: accessError,
  } = await getClanId(parsed.data.clanSlug);
  if (!clanId) {
    return { status: "error", message: accessError ?? "ไม่สามารถบันทึกได้" };
  }

  const { error } = await supabase.rpc("record_member_deliveries", {
    p_clan_id: clanId,
    p_member_id: parsed.data.memberId,
    p_delivery_date: parsed.data.deliveryDate,
    p_items: parsed.data.items.map((item) => ({
      asset_id: item.assetId,
      quantity: item.quantity,
    })),
  });
  if (error) {
    console.error("Delivery recording failed", error.code, error.message);
    return {
      status: "error",
      message: "บันทึกการส่งของไม่สำเร็จ กรุณาตรวจสอบวันที่และจำนวน",
    };
  }

  revalidatePath(`/c/${parsed.data.clanSlug}/deliveries`);
  redirect(`/c/${parsed.data.clanSlug}/deliveries?recorded=1`);
}

export async function deleteDeliveryAction(formData: FormData): Promise<void> {
  const parsed = deleteDeliverySchema.safeParse({
    clanSlug: formData.get("clanSlug"),
    deliveryId: formData.get("deliveryId"),
  });
  if (!parsed.success) return;

  const { supabase, clanId } = await getClanId(parsed.data.clanSlug);
  if (!clanId) {
    redirect(`/c/${parsed.data.clanSlug}/deliveries?deleteError=1`);
  }

  const { error } = await supabase.rpc("delete_member_delivery", {
    p_clan_id: clanId,
    p_delivery_id: parsed.data.deliveryId,
  });
  if (error) {
    console.error("Delivery deletion failed", error.code, error.message);
    redirect(`/c/${parsed.data.clanSlug}/deliveries?deleteError=1`);
  }

  revalidatePath(`/c/${parsed.data.clanSlug}/deliveries`);
  redirect(`/c/${parsed.data.clanSlug}/deliveries?deleted=1`);
}

export async function updateDeliveryAction(
  _state: ClanActionState,
  formData: FormData,
): Promise<ClanActionState> {
  const parsed = updateDeliverySchema.safeParse({
    clanSlug: formData.get("clanSlug"),
    deliveryId: formData.get("deliveryId"),
    deliveryDate: formData.get("deliveryDate"),
    assetId: formData.get("assetId"),
    quantity: formData.get("quantity"),
  });
  if (!parsed.success) {
    return {
      status: "error",
      message: parsed.error.issues[0]?.message ?? "กรุณาตรวจสอบข้อมูล",
    };
  }

  const {
    supabase,
    clanId,
    error: accessError,
  } = await getClanId(parsed.data.clanSlug);
  if (!clanId) {
    return { status: "error", message: accessError ?? "ไม่สามารถแก้ไขได้" };
  }

  const { error } = await supabase.rpc("update_member_delivery", {
    p_clan_id: clanId,
    p_delivery_id: parsed.data.deliveryId,
    p_delivery_date: parsed.data.deliveryDate,
    p_asset_id: parsed.data.assetId,
    p_quantity: parsed.data.quantity,
  });
  if (error) {
    console.error("Delivery update failed", error.code, error.message);
    return {
      status: "error",
      message: "แก้ไขรายการไม่สำเร็จ กรุณาตรวจสอบวันที่และจำนวน",
    };
  }

  revalidatePath(`/c/${parsed.data.clanSlug}/deliveries`);
  redirect(`/c/${parsed.data.clanSlug}/deliveries?updated=1`);
}
