"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { ClanActionState } from "@/features/clans/state";
import {
  createCustomRoleSchema,
  customRoleReferenceSchema,
  updateCustomRoleSchema,
} from "@/features/roles/schemas";
import { createClient } from "@/lib/supabase/server";

function roleValues(formData: FormData) {
  return {
    clanSlug: formData.get("clanSlug"),
    roleId: formData.get("roleId"),
    name: formData.get("name"),
    permissionCodes: formData.getAll("permissionCodes"),
  };
}

async function authenticatedClan(clanSlug: string) {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  if (typeof claimsData?.claims?.sub !== "string") return null;
  const { data: clan } = await supabase
    .from("clans")
    .select("id")
    .eq("slug", clanSlug)
    .maybeSingle();
  return clan ? { supabase, clan } : null;
}

export async function createCustomRoleAction(
  _previousState: ClanActionState,
  formData: FormData,
): Promise<ClanActionState> {
  const parsed = createCustomRoleSchema.safeParse(roleValues(formData));
  if (!parsed.success) {
    return {
      status: "error",
      message: "กรุณาตรวจสอบข้อมูล Role",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }
  const context = await authenticatedClan(parsed.data.clanSlug);
  if (!context)
    return { status: "error", message: "ไม่พบ Clan/Gang หรือคุณไม่มีสิทธิ์" };
  const { error } = await context.supabase.rpc("create_custom_role", {
    p_clan_id: context.clan.id,
    p_name: parsed.data.name,
    p_permission_codes: parsed.data.permissionCodes,
  });
  if (error) {
    console.error("Custom role creation failed", error.code, error.message);
    return {
      status: "error",
      message:
        error.code === "23505"
          ? "ชื่อ Role นี้ถูกใช้งานแล้ว"
          : "สร้าง Role ไม่สำเร็จ",
    };
  }
  revalidatePath(`/c/${parsed.data.clanSlug}/roles`);
  revalidatePath(`/c/${parsed.data.clanSlug}/members`);
  redirect(`/c/${parsed.data.clanSlug}/roles?created=1`);
}

export async function updateCustomRoleAction(
  _previousState: ClanActionState,
  formData: FormData,
): Promise<ClanActionState> {
  const parsed = updateCustomRoleSchema.safeParse(roleValues(formData));
  if (!parsed.success)
    return { status: "error", message: "กรุณาตรวจสอบข้อมูล Role" };
  const context = await authenticatedClan(parsed.data.clanSlug);
  if (!context)
    return { status: "error", message: "ไม่พบ Clan/Gang หรือคุณไม่มีสิทธิ์" };
  const { error } = await context.supabase.rpc("update_custom_role", {
    p_clan_id: context.clan.id,
    p_role_id: parsed.data.roleId,
    p_name: parsed.data.name,
    p_permission_codes: parsed.data.permissionCodes,
  });
  if (error) {
    console.error("Custom role update failed", error.code, error.message);
    return {
      status: "error",
      message:
        error.code === "23505"
          ? "ชื่อ Role นี้ถูกใช้งานแล้ว"
          : "แก้ไข Role ไม่สำเร็จ",
    };
  }
  revalidatePath(`/c/${parsed.data.clanSlug}/roles`);
  revalidatePath(`/c/${parsed.data.clanSlug}/members`);
  redirect(`/c/${parsed.data.clanSlug}/roles?updated=1`);
}

export async function deleteCustomRoleAction(formData: FormData) {
  const parsed = customRoleReferenceSchema.safeParse(
    Object.fromEntries(formData.entries()),
  );
  if (!parsed.success) redirect("/clans");
  const context = await authenticatedClan(parsed.data.clanSlug);
  if (!context) redirect("/clans");
  const { error } = await context.supabase.rpc("delete_custom_role", {
    p_clan_id: context.clan.id,
    p_role_id: parsed.data.roleId,
  });
  if (error) {
    console.error("Custom role deletion failed", error.code, error.message);
    const reason = error.code === "23503" ? "role-in-use" : "delete";
    redirect(`/c/${parsed.data.clanSlug}/roles?error=${reason}`);
  }
  revalidatePath(`/c/${parsed.data.clanSlug}/roles`);
  revalidatePath(`/c/${parsed.data.clanSlug}/members`);
  redirect(`/c/${parsed.data.clanSlug}/roles?deleted=1`);
}
