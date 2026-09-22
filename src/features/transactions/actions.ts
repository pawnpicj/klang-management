"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { ClanActionState } from "@/features/clans/state";
import {
  createTransactionSchema,
  transactionReferenceSchema,
} from "@/features/transactions/schemas";
import { createClient } from "@/lib/supabase/server";

async function authenticatedClan(clanSlug: string) {
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims?.sub;
  if (typeof userId !== "string") return null;
  const { data: clan } = await supabase
    .from("clans")
    .select("id")
    .eq("slug", clanSlug)
    .maybeSingle();
  return clan ? { supabase, clan, userId } : null;
}

export async function createAndPostTransactionAction(
  _state: ClanActionState,
  formData: FormData,
): Promise<ClanActionState> {
  const assetIds = formData.getAll("assetId");
  const quantities = formData.getAll("quantity");
  const unitValues = formData.getAll("unitValue");
  const parsed = createTransactionSchema.safeParse({
    clanSlug: formData.get("clanSlug"),
    transactionType: formData.get("transactionType"),
    contributorMemberId: formData.get("contributorMemberId") ?? "",
    fromWarehouseId: formData.get("fromWarehouseId") ?? "",
    toWarehouseId: formData.get("toWarehouseId") ?? "",
    note: formData.get("note") ?? "",
    clientRequestId: formData.get("clientRequestId"),
    items: assetIds.map((assetId, index) => ({
      assetId,
      quantity: quantities[index],
      unitValue: unitValues[index] ?? "",
    })),
  });
  if (!parsed.success || assetIds.length !== quantities.length) {
    return { status: "error", message: "กรุณาตรวจสอบรายการและจำนวน" };
  }
  const context = await authenticatedClan(parsed.data.clanSlug);
  if (!context)
    return { status: "error", message: "ไม่พบ Clan/Gang หรือคุณไม่มีสิทธิ์" };
  const { data: transactionId, error } = await context.supabase.rpc(
    "create_and_post_transaction",
    {
      p_clan_id: context.clan.id,
      p_transaction_type: parsed.data.transactionType,
      p_contributor_member_id: parsed.data.contributorMemberId || undefined,
      p_note: parsed.data.note || undefined,
      p_from_warehouse_id: parsed.data.fromWarehouseId || undefined,
      p_to_warehouse_id: parsed.data.toWarehouseId || undefined,
      p_client_request_id: parsed.data.clientRequestId,
      p_items: parsed.data.items.map((item) => ({
        asset_id: item.assetId,
        quantity: String(item.quantity),
        unit_value: item.unitValue === "" ? null : String(item.unitValue),
      })),
    },
  );
  if (error || !transactionId) {
    console.error("Transaction creation failed", error?.code, error?.message);
    return {
      status: "error",
      message:
        error?.code === "42501"
          ? "คุณไม่มีสิทธิ์ทำรายการประเภทนี้"
          : error?.code === "23514"
            ? "ยอดไม่พอ หรือข้อมูล Warehouse/Asset ไม่ถูกต้อง"
            : "บันทึกรายการไม่สำเร็จ",
    };
  }
  revalidatePath(`/c/${parsed.data.clanSlug}/transactions`);
  revalidatePath(`/c/${parsed.data.clanSlug}/warehouses`);
  redirect(
    `/c/${parsed.data.clanSlug}/transactions/${transactionId}?created=1`,
  );
}

export async function voidTransactionAction(formData: FormData) {
  const parsed = transactionReferenceSchema.safeParse(
    Object.fromEntries(formData.entries()),
  );
  if (!parsed.success) redirect("/clans");
  const context = await authenticatedClan(parsed.data.clanSlug);
  if (!context) redirect("/clans");
  const { error } = await context.supabase.rpc("void_transaction", {
    p_clan_id: context.clan.id,
    p_transaction_id: parsed.data.transactionId,
  });
  if (error) {
    console.error("Transaction void failed", error.code, error.message);
    redirect(
      `/c/${parsed.data.clanSlug}/transactions/${parsed.data.transactionId}?error=void`,
    );
  }
  revalidatePath(`/c/${parsed.data.clanSlug}/transactions`);
  revalidatePath(`/c/${parsed.data.clanSlug}/warehouses`);
  redirect(
    `/c/${parsed.data.clanSlug}/transactions/${parsed.data.transactionId}?voided=1`,
  );
}

export async function uploadEvidenceAction(
  _state: ClanActionState,
  formData: FormData,
): Promise<ClanActionState> {
  const parsed = transactionReferenceSchema.safeParse(
    Object.fromEntries(formData.entries()),
  );
  const file = formData.get("evidence");
  if (!parsed.success || !(file instanceof File) || file.size < 1) {
    return { status: "error", message: "กรุณาเลือกไฟล์หลักฐาน" };
  }
  const allowed = new Map([
    ["image/jpeg", "jpg"],
    ["image/png", "png"],
    ["image/webp", "webp"],
    ["application/pdf", "pdf"],
  ]);
  const extension = allowed.get(file.type);
  if (!extension || file.size > 10 * 1024 * 1024) {
    return {
      status: "error",
      message: "รองรับ JPG, PNG, WebP หรือ PDF ขนาดไม่เกิน 10 MB",
    };
  }
  const context = await authenticatedClan(parsed.data.clanSlug);
  if (!context)
    return { status: "error", message: "ไม่พบ Clan/Gang หรือคุณไม่มีสิทธิ์" };
  const path = `${context.clan.id}/${parsed.data.transactionId}/${randomUUID()}.${extension}`;
  const { error: uploadError } = await context.supabase.storage
    .from("transaction-evidence")
    .upload(path, await file.arrayBuffer(), {
      contentType: file.type,
      upsert: false,
    });
  if (uploadError) {
    console.error("Evidence upload failed", uploadError.message);
    return { status: "error", message: "อัปโหลดหลักฐานไม่สำเร็จ" };
  }
  const { error } = await context.supabase.rpc(
    "register_transaction_attachment",
    {
      p_clan_id: context.clan.id,
      p_transaction_id: parsed.data.transactionId,
      p_storage_path: path,
      p_original_name: file.name.slice(0, 255),
      p_mime_type: file.type,
      p_file_size: file.size,
    },
  );
  if (error) {
    await context.supabase.storage.from("transaction-evidence").remove([path]);
    console.error("Evidence registration failed", error.code, error.message);
    return { status: "error", message: "บันทึกข้อมูลหลักฐานไม่สำเร็จ" };
  }
  revalidatePath(
    `/c/${parsed.data.clanSlug}/transactions/${parsed.data.transactionId}`,
  );
  redirect(
    `/c/${parsed.data.clanSlug}/transactions/${parsed.data.transactionId}?uploaded=1`,
  );
}
