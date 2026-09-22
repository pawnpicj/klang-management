"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  addClanMemberSchema,
  clanMemberReferenceSchema,
  createClanSchema,
  updateClanMemberSchema,
  updateClanMemberRoleSchema,
  updateClanSchema,
} from "@/features/clans/schemas";
import type { ClanActionState } from "@/features/clans/state";
import { createClient } from "@/lib/supabase/server";

function formValues(formData: FormData) {
  return Object.fromEntries(formData.entries());
}

export async function createClanAction(
  _previousState: ClanActionState,
  formData: FormData,
): Promise<ClanActionState> {
  const parsed = createClanSchema.safeParse(formValues(formData));
  if (!parsed.success) {
    return {
      status: "error",
      message: "กรุณาตรวจสอบข้อมูลที่กรอก",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  if (typeof claimsData?.claims?.sub !== "string") {
    return { status: "error", message: "กรุณาเข้าสู่ระบบอีกครั้ง" };
  }

  const { data: clanId, error } = await supabase.rpc("create_clan", {
    p_name: parsed.data.name,
    p_slug: parsed.data.slug,
    p_type: parsed.data.type,
    p_character_name: parsed.data.characterName,
  });

  if (error || !clanId) {
    console.error("Clan creation failed", error?.code, error?.message);
    const duplicateSlug = error?.code === "23505";
    return {
      status: "error",
      message: duplicateSlug
        ? "Slug นี้ถูกใช้งานแล้ว กรุณาเลือกใหม่"
        : "สร้าง Clan/Gang ไม่สำเร็จ กรุณาลองใหม่",
      fieldErrors: duplicateSlug
        ? { slug: ["Slug นี้ถูกใช้งานแล้ว"] }
        : undefined,
    };
  }

  revalidatePath("/clans");
  redirect(`/c/${parsed.data.slug}/dashboard`);
}

export async function addClanMemberAction(
  _previousState: ClanActionState,
  formData: FormData,
): Promise<ClanActionState> {
  const parsed = addClanMemberSchema.safeParse(formValues(formData));
  if (!parsed.success) {
    return {
      status: "error",
      message: "กรุณาตรวจสอบข้อมูลที่กรอก",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  if (typeof claimsData?.claims?.sub !== "string") {
    return { status: "error", message: "กรุณาเข้าสู่ระบบอีกครั้ง" };
  }

  const { data: clan, error: clanError } = await supabase
    .from("clans")
    .select("id")
    .eq("slug", parsed.data.clanSlug)
    .maybeSingle();
  if (clanError || !clan) {
    console.error(
      "Clan resolution failed while adding member",
      clanError?.code,
    );
    return { status: "error", message: "ไม่พบ Clan/Gang หรือคุณไม่มีสิทธิ์" };
  }

  const { error } = await supabase.rpc("add_clan_member", {
    p_clan_id: clan.id,
    p_character_name: parsed.data.characterName,
  });
  if (error) {
    console.error("Clan member creation failed", error.code, error.message);
    const duplicateName = error.code === "23505";
    return {
      status: "error",
      message: duplicateName
        ? "มีสมาชิกชื่อตัวละครนี้อยู่แล้ว"
        : "เพิ่มสมาชิกไม่สำเร็จ กรุณาตรวจสอบสิทธิ์แล้วลองใหม่",
      fieldErrors: duplicateName
        ? { characterName: ["ชื่อตัวละครนี้ถูกใช้งานแล้ว"] }
        : undefined,
    };
  }

  revalidatePath(`/c/${parsed.data.clanSlug}/members`);
  redirect(`/c/${parsed.data.clanSlug}/members?added=1`);
}

export async function updateClanAction(
  _previousState: ClanActionState,
  formData: FormData,
): Promise<ClanActionState> {
  const parsed = updateClanSchema.safeParse(formValues(formData));
  if (!parsed.success) {
    return {
      status: "error",
      message: "กรุณาตรวจสอบข้อมูลที่กรอก",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  if (typeof claimsData?.claims?.sub !== "string") {
    return { status: "error", message: "กรุณาเข้าสู่ระบบอีกครั้ง" };
  }
  const { data: clan } = await supabase
    .from("clans")
    .select("id")
    .eq("slug", parsed.data.clanSlug)
    .maybeSingle();
  if (!clan) {
    return { status: "error", message: "ไม่พบ Clan/Gang หรือคุณไม่มีสิทธิ์" };
  }

  const { error } = await supabase.rpc("update_clan_details", {
    p_clan_id: clan.id,
    p_name: parsed.data.name,
    p_type: parsed.data.type,
  });
  if (error) {
    console.error("Clan update failed", error.code, error.message);
    return { status: "error", message: "แก้ไข Clan/Gang ไม่สำเร็จ" };
  }

  revalidatePath("/clans");
  revalidatePath(`/c/${parsed.data.clanSlug}`);
  redirect(`/c/${parsed.data.clanSlug}/settings?updated=1`);
}

export async function archiveClanAction(formData: FormData) {
  const slugResult = createClanSchema.shape.slug.safeParse(
    formData.get("clanSlug"),
  );
  if (!slugResult.success) redirect("/clans?error=archive");

  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  if (typeof claimsData?.claims?.sub !== "string") {
    redirect("/login?next=/clans");
  }
  const { data: clan } = await supabase
    .from("clans")
    .select("id")
    .eq("slug", slugResult.data)
    .maybeSingle();
  if (!clan) redirect("/clans?error=archive");

  const { error } = await supabase.rpc("archive_clan", {
    p_clan_id: clan.id,
  });
  if (error) {
    console.error("Clan archive failed", error.code, error.message);
    redirect("/clans?error=archive");
  }

  revalidatePath("/clans");
  redirect("/clans?archived=1");
}

export async function updateClanMemberAction(
  _previousState: ClanActionState,
  formData: FormData,
): Promise<ClanActionState> {
  const parsed = updateClanMemberSchema.safeParse(formValues(formData));
  if (!parsed.success) {
    return {
      status: "error",
      message: "กรุณาตรวจสอบชื่อตัวละคร",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  if (typeof claimsData?.claims?.sub !== "string") {
    return { status: "error", message: "กรุณาเข้าสู่ระบบอีกครั้ง" };
  }
  const { data: clan } = await supabase
    .from("clans")
    .select("id")
    .eq("slug", parsed.data.clanSlug)
    .maybeSingle();
  if (!clan) {
    return { status: "error", message: "ไม่พบ Clan/Gang หรือคุณไม่มีสิทธิ์" };
  }

  const { error } = await supabase.rpc("update_clan_member_name", {
    p_clan_id: clan.id,
    p_member_id: parsed.data.memberId,
    p_character_name: parsed.data.characterName,
  });
  if (error) {
    console.error("Clan member update failed", error.code, error.message);
    const duplicateName = error.code === "23505";
    return {
      status: "error",
      message: duplicateName
        ? "มีสมาชิกชื่อตัวละครนี้อยู่แล้ว"
        : "แก้ไขสมาชิกไม่สำเร็จ",
      fieldErrors: duplicateName
        ? { characterName: ["ชื่อตัวละครนี้ถูกใช้งานแล้ว"] }
        : undefined,
    };
  }

  revalidatePath(`/c/${parsed.data.clanSlug}/members`);
  redirect(`/c/${parsed.data.clanSlug}/members?updated=1`);
}

export async function removeClanMemberAction(formData: FormData) {
  const parsed = clanMemberReferenceSchema.safeParse(formValues(formData));
  if (!parsed.success) redirect("/clans");

  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  if (typeof claimsData?.claims?.sub !== "string") {
    redirect(
      `/login?next=${encodeURIComponent(`/c/${parsed.data.clanSlug}/members`)}`,
    );
  }
  const { data: clan } = await supabase
    .from("clans")
    .select("id")
    .eq("slug", parsed.data.clanSlug)
    .maybeSingle();
  if (!clan) redirect("/clans");

  const { error } = await supabase.rpc("remove_clan_member", {
    p_clan_id: clan.id,
    p_member_id: parsed.data.memberId,
  });
  if (error) {
    console.error("Clan member removal failed", error.code, error.message);
    const reason = error.code === "23514" ? "last-manager" : "remove";
    redirect(
      `/c/${parsed.data.clanSlug}/members?error=${encodeURIComponent(reason)}`,
    );
  }

  revalidatePath(`/c/${parsed.data.clanSlug}/members`);
  redirect(`/c/${parsed.data.clanSlug}/members?removed=1`);
}

export async function updateClanMemberRoleAction(
  _previousState: ClanActionState,
  formData: FormData,
): Promise<ClanActionState> {
  const parsed = updateClanMemberRoleSchema.safeParse(formValues(formData));
  if (!parsed.success) {
    return {
      status: "error",
      message: "กรุณาเลือก Role ที่ถูกต้อง",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  if (typeof claimsData?.claims?.sub !== "string") {
    return { status: "error", message: "กรุณาเข้าสู่ระบบอีกครั้ง" };
  }
  const { data: clan } = await supabase
    .from("clans")
    .select("id")
    .eq("slug", parsed.data.clanSlug)
    .maybeSingle();
  if (!clan) {
    return { status: "error", message: "ไม่พบ Clan/Gang หรือคุณไม่มีสิทธิ์" };
  }

  const { error } = await supabase.rpc("update_clan_member_role", {
    p_clan_id: clan.id,
    p_member_id: parsed.data.memberId,
    p_role_id: parsed.data.roleId,
  });
  if (error) {
    console.error("Clan member role update failed", error.code, error.message);
    return {
      status: "error",
      message:
        error.code === "23514"
          ? "ต้องมี Manager ที่ Active อย่างน้อย 1 คน"
          : "เปลี่ยน Role ไม่สำเร็จ",
    };
  }

  revalidatePath(`/c/${parsed.data.clanSlug}/members`);
  revalidatePath(`/c/${parsed.data.clanSlug}/dashboard`);
  redirect(`/c/${parsed.data.clanSlug}/members?roleUpdated=1`);
}
