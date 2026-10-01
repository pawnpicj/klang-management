"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { ClanActionState } from "@/features/clans/state";
import { craftSettingsSchema } from "./schemas";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { clanSlugSchema } from "@/features/clans/schemas";
import {
  getAssetImageValidationError,
  hasValidAssetImageSignature,
} from "@/features/inventory/image";
import { saveRecipeSchema, type RecipeActionState } from "./schemas";
import { resolveRecipes } from "./recipes";
import type { Json } from "@/types/database";

async function contextFor(slug: string) {
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  if (typeof claims?.claims?.sub !== "string") return null;
  const { data: clan } = await supabase
    .from("clans")
    .select("id")
    .eq("slug", slug)
    .maybeSingle();
  if (!clan) return null;
  const { data: allowed } = await supabase.rpc("has_clan_permission", {
    p_clan_id: clan.id,
    p_permission_code: "craft.manage",
  });
  return allowed ? { supabase, clan } : null;
}
const extensions: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

export async function saveRecipeAction(
  _state: RecipeActionState,
  form: FormData,
): Promise<RecipeActionState> {
  let raw: unknown;
  try {
    raw = JSON.parse(String(form.get("recipe")));
  } catch {
    return { status: "error", message: "ข้อมูลสูตรไม่ถูกต้อง" };
  }
  const parsed = saveRecipeSchema.safeParse(raw);
  if (!parsed.success)
    return {
      status: "error",
      message: parsed.error.issues[0]?.message ?? "กรุณาตรวจสอบสูตร",
    };
  const context = await contextFor(parsed.data.clanSlug);
  if (!context) return { status: "error", message: "คุณไม่มีสิทธิ์จัดการสูตร" };
  const { supabase, clan } = context;
  const { output, materials } = parsed.data;
  const items = [output, ...materials];
  const files = items.map((item, index) => {
    const file = form.get(
      index === 0 ? "outputImage" : `materialImage_${index - 1}`,
    );
    return item.source === "CUSTOM" && file instanceof File && file.size > 0
      ? file
      : null;
  });
  if (
    files.reduce((sum, file) => sum + (file?.size ?? 0), 0) >
    10 * 1024 * 1024
  )
    return {
      status: "error",
      message: "รูปทั้งหมดในสูตรต้องมีขนาดรวมไม่เกิน 10 MB",
    };
  for (const file of files) {
    if (!file) continue;
    const error = getAssetImageValidationError(file);
    if (error) return { status: "error", message: error };
    if (!(await hasValidAssetImageSignature(file)))
      return { status: "error", message: "เนื้อหาไฟล์ไม่ตรงกับประเภทรูปภาพ" };
  }
  const uploaded: string[] = [];
  const uploads = await Promise.allSettled(
    files.map(async (file, index) => {
      if (!file) return;
      const path = `${clan.id}/${randomUUID()}.${extensions[file.type]}`;
      const { error } = await supabase.storage
        .from("craft-images")
        .upload(path, file, { contentType: file.type, upsert: false });
      if (error) throw error;
      uploaded.push(path);
      items[index].imagePath = path;
    }),
  );
  if (uploads.some((result) => result.status === "rejected")) {
    if (uploaded.length)
      await supabase.storage.from("craft-images").remove(uploaded);
    return { status: "error", message: "อัปโหลดรูปไม่สำเร็จ กรุณาลองใหม่" };
  }
  const { data: id, error } = await supabase.rpc("save_craft_recipe", {
    p_clan_id: clan.id,
    p_recipe_id: parsed.data.recipeId as string,
    p_name: parsed.data.name,
    p_output: output as Json,
    p_materials: materials as Json,
  });
  if (error) {
    if (uploaded.length)
      await supabase.storage.from("craft-images").remove(uploaded);
    return {
      status: "error",
      message:
        error.code === "42501"
          ? "คุณไม่มีสิทธิ์จัดการสูตร"
          : "บันทึกสูตรไม่สำเร็จ กรุณาตรวจสอบ Assets และส่วนประกอบ",
    };
  }
  const { data: row } = await supabase
    .from("craft_recipes")
    .select("id,name,output,materials")
    .eq("id", id)
    .eq("clan_id", clan.id)
    .single();
  if (!row)
    return {
      status: "error",
      message: "บันทึกสูตรแล้ว แต่โหลดข้อมูลไม่สำเร็จ กรุณารีเฟรชก่อนบันทึกซ้ำ",
    };
  const [recipe] = await resolveRecipes(supabase, [row]);
  return { status: "success", recipe };
}

export async function deleteRecipeAction(input: {
  clanSlug: string;
  recipeId: string;
}): Promise<{ status: "success" | "error"; message?: string }> {
  const parsed = z
    .object({ clanSlug: clanSlugSchema, recipeId: z.uuid() })
    .safeParse(input);
  if (!parsed.success)
    return { status: "error", message: "ข้อมูลสูตรไม่ถูกต้อง" };
  const context = await contextFor(parsed.data.clanSlug);
  if (!context) return { status: "error", message: "คุณไม่มีสิทธิ์ลบสูตร" };
  const { error } = await context.supabase.rpc("delete_craft_recipe", {
    p_clan_id: context.clan.id,
    p_recipe_id: parsed.data.recipeId,
  });
  return error
    ? { status: "error", message: "ลบสูตรไม่สำเร็จ" }
    : { status: "success" };
}

export async function saveCraftSettingsAction(
  _state: ClanActionState,
  form: FormData,
): Promise<ClanActionState> {
  const parsed = craftSettingsSchema.safeParse(
    Object.fromEntries(form.entries()),
  );
  if (!parsed.success) return { status: "error", message: "กรุณาเลือกคลัง" };
  const context = await contextFor(parsed.data.clanSlug);
  if (!context)
    return { status: "error", message: "คุณไม่มีสิทธิ์ตั้งค่า Craft Item" };
  const { error } = await context.supabase.rpc("save_craft_settings", {
    p_clan_id: context.clan.id,
    p_warehouse_id: parsed.data.warehouseId,
  });
  if (error)
    return {
      status: "error",
      message: "บันทึกไม่สำเร็จ กรุณาเลือกคลังที่ยังเปิดใช้งาน",
    };
  const path = `/c/${parsed.data.clanSlug}/craft-item`;
  revalidatePath(path);
  revalidatePath(`${path}/settings`);
  redirect(`${path}/settings?saved=1`);
}
