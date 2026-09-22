"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  addClanMemberSchema,
  createClanSchema,
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
