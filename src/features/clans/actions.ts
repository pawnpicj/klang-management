"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClanSchema } from "@/features/clans/schemas";
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
