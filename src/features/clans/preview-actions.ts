"use server";
import { z } from "zod";
import {
  memberPreviewColumnsSchema,
  memberPreviewPath,
} from "@/features/clans/member-preview";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { ClanActionState } from "@/features/clans/state";
export async function updateMemberPreviewAction(
  _previous: ClanActionState,
  formData: FormData,
): Promise<ClanActionState> {
  const parsed = z
    .object({
      clanSlug: z.string().min(1).max(80),
      enabled: z.boolean(),
      columns: memberPreviewColumnsSchema,
    })
    .safeParse({
      clanSlug: formData.get("clanSlug"),
      enabled: formData.get("enabled") === "on",
      columns: formData.getAll("columns"),
    });
  if (!parsed.success)
    return {
      status: "error",
      message: "เลือกคอลัมน์ที่ต้องการแสดงอย่างน้อย 1 คอลัมน์",
    };
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  if (typeof claims?.claims?.sub !== "string")
    return { status: "error", message: "กรุณาเข้าสู่ระบบอีกครั้ง" };
  const { data: clan } = await supabase
    .from("clans")
    .select("id")
    .eq("slug", parsed.data.clanSlug)
    .maybeSingle();
  if (!clan)
    return { status: "error", message: "ไม่พบ Clan/Gang หรือไม่มีสิทธิ์" };
  const { error } = await supabase.rpc("set_member_preview_settings", {
    p_clan_id: clan.id,
    p_enabled: parsed.data.enabled,
    p_columns: parsed.data.columns,
  });
  if (error)
    return {
      status: "error",
      message: "บันทึกการตั้งค่าไม่สำเร็จ หรือคุณไม่มีสิทธิ์จัดการ Clan/Gang",
    };
  revalidatePath("/preview-members");
  revalidatePath(memberPreviewPath(parsed.data.clanSlug));
  revalidatePath(`/c/${parsed.data.clanSlug}/settings`);
  redirect(`/c/${parsed.data.clanSlug}/settings?updated=1`);
}
