"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { ClanActionState } from "@/features/clans/state";
import {
  addLoopStepSchema,
  createLoopTopicSchema,
  loopTimerReferenceSchema,
  loopTimerStepReferenceSchema,
} from "@/features/loops/schemas";
import type { AddLoopStepState } from "@/features/loops/state";
import { createClient } from "@/lib/supabase/server";

const values = (formData: FormData) => Object.fromEntries(formData.entries());
const invalid = (message: string): ClanActionState => ({
  status: "error",
  message,
});

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

export async function createLoopTopicAction(
  _state: ClanActionState,
  formData: FormData,
): Promise<ClanActionState> {
  const parsed = createLoopTopicSchema.safeParse(values(formData));
  if (!parsed.success)
    return invalid(parsed.error.issues[0]?.message ?? "กรุณาตรวจสอบข้อมูล");
  const context = await authenticatedClan(parsed.data.clanSlug);
  if (!context) return invalid("ไม่พบ Clan/Gang หรือคุณไม่มีสิทธิ์");
  const { error } = await context.supabase.rpc("create_loop_topic", {
    p_clan_id: context.clan.id,
    p_name: parsed.data.name,
    p_owner_type: parsed.data.ownerType,
    p_member_id: parsed.data.memberId as string,
  });
  if (error) {
    console.error("Loop topic creation failed", error.code, error.message);
    return invalid(
      error.code === "42501"
        ? "คุณไม่มีสิทธิ์จัดการ Loop"
        : "สร้างหัวข้อ Loop ไม่สำเร็จ",
    );
  }
  revalidatePath(`/c/${parsed.data.clanSlug}/loops`);
  redirect(`/c/${parsed.data.clanSlug}/loops?created=1`);
}

export async function addLoopStepAction(
  _state: AddLoopStepState,
  formData: FormData,
): Promise<AddLoopStepState> {
  const parsed = addLoopStepSchema.safeParse({
    ...values(formData),
    step: {
      location: formData.get("location"),
      timerType: formData.get("timerType"),
      countdown: formData.get("countdown"),
      clockTime: formData.get("clockTime"),
      sirenEnabled: formData.get("sirenEnabled") === "on",
      soundEnabled: formData.get("soundEnabled") === "on",
    },
  });
  if (!parsed.success)
    return invalid(
      parsed.error.issues[0]?.message ?? "กรุณาตรวจสอบข้อมูล Loop",
    );
  const context = await authenticatedClan(parsed.data.clanSlug);
  if (!context) return invalid("ไม่พบ Clan/Gang หรือคุณไม่มีสิทธิ์");
  const { data: stepId, error } = await context.supabase.rpc(
    "add_loop_timer_step_with_location",
    {
      p_clan_id: context.clan.id,
      p_loop_timer_id: parsed.data.loopTimerId,
      p_location: parsed.data.step.location,
      p_timer_type: parsed.data.step.timerType,
      p_countdown_seconds: parsed.data.step.countdownSeconds as number,
      p_clock_time: parsed.data.step.clockTime as string,
      p_siren_enabled: parsed.data.step.sirenEnabled,
      p_sound_enabled: parsed.data.step.soundEnabled,
    },
  );
  if (error) {
    console.error("Loop row creation failed", error.code, error.message);
    return invalid(
      error.code === "42501"
        ? "คุณไม่มีสิทธิ์จัดการ Loop"
        : "เพิ่ม Loop ไม่สำเร็จ",
    );
  }
  const { data: step, error: readError } = await context.supabase
    .from("loop_timer_steps")
    .select(
      "id,step_number,location,timer_type,countdown_seconds,clock_time,siren_enabled,sound_enabled,alert_at,acknowledged_at",
    )
    .eq("id", stepId)
    .eq("clan_id", context.clan.id)
    .eq("loop_timer_id", parsed.data.loopTimerId)
    .single();
  if (readError || !step) {
    return invalid(
      "บันทึก Loop แล้ว แต่โหลดแถวใหม่ไม่สำเร็จ กรุณารีเฟรชหน้าเพื่อดูรายการก่อนเพิ่มอีกครั้ง",
    );
  }
  return {
    status: "success",
    message: "เพิ่ม Loop แล้ว",
    step: {
      id: step.id,
      stepNumber: step.step_number,
      location: step.location,
      timerType: step.timer_type,
      countdownSeconds: step.countdown_seconds,
      clockTime: step.clock_time,
      sirenEnabled: step.siren_enabled,
      soundEnabled: step.sound_enabled,
      alertAt: step.alert_at,
      acknowledgedAt: step.acknowledged_at,
    },
  };
}

export async function acknowledgeLoopTimerStepAction(formData: FormData) {
  const parsed = loopTimerStepReferenceSchema.safeParse(values(formData));
  if (!parsed.success) redirect("/clans");
  const context = await authenticatedClan(parsed.data.clanSlug);
  if (!context) redirect("/clans");
  const { error } = await context.supabase.rpc("acknowledge_loop_timer_step", {
    p_clan_id: context.clan.id,
    p_loop_timer_id: parsed.data.loopTimerId,
    p_step_number: parsed.data.stepNumber,
  });
  if (error) redirect(`/c/${parsed.data.clanSlug}/loops?error=checkpoint`);
  revalidatePath(`/c/${parsed.data.clanSlug}/loops`);
  redirect(`/c/${parsed.data.clanSlug}/loops?checkpoint=1`);
}

export async function removeLoopTimerStepAction(formData: FormData) {
  const parsed = loopTimerStepReferenceSchema.safeParse(values(formData));
  if (!parsed.success) redirect("/clans");
  const context = await authenticatedClan(parsed.data.clanSlug);
  if (!context) redirect("/clans");
  const { error } = await context.supabase.rpc("remove_loop_timer_step", {
    p_clan_id: context.clan.id,
    p_loop_timer_id: parsed.data.loopTimerId,
    p_step_number: parsed.data.stepNumber,
  });
  if (error) redirect(`/c/${parsed.data.clanSlug}/loops?error=removeStep`);
  revalidatePath(`/c/${parsed.data.clanSlug}/loops`);
  redirect(`/c/${parsed.data.clanSlug}/loops?stepRemoved=1`);
}

export async function deleteLoopTimerAction(formData: FormData) {
  const parsed = loopTimerReferenceSchema.safeParse(values(formData));
  if (!parsed.success) redirect("/clans");
  const context = await authenticatedClan(parsed.data.clanSlug);
  if (!context) redirect("/clans");
  const { error } = await context.supabase.rpc("delete_loop_timer", {
    p_clan_id: context.clan.id,
    p_loop_timer_id: parsed.data.loopTimerId,
  });
  if (error) redirect(`/c/${parsed.data.clanSlug}/loops?error=delete`);
  revalidatePath(`/c/${parsed.data.clanSlug}/loops`);
  redirect(`/c/${parsed.data.clanSlug}/loops?deleted=1`);
}
