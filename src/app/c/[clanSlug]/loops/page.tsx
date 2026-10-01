import { ActionNotice } from "@/components/ui/action-notice";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { AppHeader } from "@/components/clan/app-header";
import {
  ActiveLoops,
  CreateLoopDialog,
  type LoopTimer,
} from "@/components/clan/loop-management";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";
import { htmlId } from "@/lib/html-id";

export const dynamic = "force-dynamic";

export default async function LoopsPage({
  params,
  searchParams,
}: {
  params: Promise<{ clanSlug: string }>;
  searchParams: Promise<{
    created?: string;
    checkpoint?: string;
    stepAdded?: string;
    stepRemoved?: string;
    deleted?: string;
    error?: string;
  }>;
}) {
  const [{ clanSlug }, query] = await Promise.all([params, searchParams]);
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  if (typeof claims?.claims?.sub !== "string") {
    redirect(`/login?next=${encodeURIComponent(`/c/${clanSlug}/loops`)}`);
  }

  const { data: clan } = await supabase
    .from("clans")
    .select("id,name,slug")
    .eq("slug", clanSlug)
    .maybeSingle();
  if (!clan) notFound();
  const [
    { data: canView },
    { data: canManage },
    { data: members },
    { data: timers, error: timersError },
  ] = await Promise.all([
    supabase.rpc("has_clan_permission", {
      p_clan_id: clan.id,
      p_permission_code: "loop.view",
    }),
    supabase.rpc("has_clan_permission", {
      p_clan_id: clan.id,
      p_permission_code: "loop.manage",
    }),
    supabase
      .from("clan_members")
      .select("id,character_name")
      .eq("clan_id", clan.id)
      .eq("status", "ACTIVE")
      .order("character_name"),
    supabase
      .from("loop_timers")
      .select(
        "id,name,member_id,loop_count,status,steps:loop_timer_steps(id,step_number,location,timer_type,countdown_seconds,clock_time,siren_enabled,sound_enabled,alert_at,acknowledged_at)",
      )
      .eq("clan_id", clan.id)
      .in("status", ["ACTIVE", "DRAFT"])
      .order("created_at", { ascending: false }),
  ]);
  if (!canView) notFound();
  if (timersError) throw new Error("โหลด Loop ไม่สำเร็จ");

  const memberMap = new Map(
    (members ?? []).map((member) => [member.id, member.character_name]),
  );
  const activeLoops: LoopTimer[] = (timers ?? []).map((timer) => ({
    id: timer.id,
    name: timer.name,
    memberName: timer.member_id
      ? (memberMap.get(timer.member_id) ?? "สมาชิก")
      : null,
    loopCount: timer.loop_count,
    status: timer.status,
    steps: [...timer.steps]
      .sort((a, b) => a.step_number - b.step_number)
      .map((step) => ({
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
      })),
  }));

  return (
    <>
      <AppHeader activeClan={clan.name} />
      <main
        id={htmlId("loops_loops_page_main")}
        className="mx-auto w-full max-w-5xl px-5 py-8 sm:px-6"
      >
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <Link
              id={htmlId("loops_loops_page_dashboard")}
              href={`/c/${clan.slug}/dashboard`}
              className="text-primary text-sm hover:underline"
            >
              ← กลับ Dashboard
            </Link>
            <h1
              id={htmlId("loops_loops_page_loop")}
              className="mt-3 text-3xl font-bold"
            >
              Loop
            </h1>
            <p
              id={htmlId("loops_loops_page_p")}
              className="text-muted-foreground mt-1"
            >
              บันทึกรอบเวลาแบบนับถอยหลังหรือเวลาที่กำหนด
            </p>
          </div>
          {canManage && (
            <CreateLoopDialog
              clanSlug={clan.slug}
              members={(members ?? []).map((member) => ({
                id: member.id,
                characterName: member.character_name,
              }))}
            />
          )}
        </div>

        {(query.created === "1" ||
          query.checkpoint === "1" ||
          query.stepRemoved === "1" ||
          query.deleted === "1") && (
          <ActionNotice
            queryKeys={["created", "checkpoint", "stepRemoved", "deleted"]}
            className="mt-6 rounded-md bg-emerald-50 p-3 text-sm text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200"
          >
            {query.created === "1"
              ? "สร้างหัวข้อ Loop แล้ว"
              : query.checkpoint === "1"
                ? "บันทึก Checkpoint แล้ว"
                : query.stepRemoved === "1"
                  ? "Remove Loop แล้ว"
                  : "ลบหัวข้อ Loop แล้ว"}
          </ActionNotice>
        )}
        {query.error && (
          <p
            id={htmlId("loops_loops_page_p_2")}
            className="mt-6 rounded-md bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-200"
            role="alert"
          >
            ทำรายการไม่สำเร็จ กรุณาลองใหม่
          </p>
        )}

        <section id={htmlId("loops_loops_page_section")} className="mt-8">
          <div className="mb-4 flex items-center justify-between gap-4">
            <h2
              id={htmlId("loops_loops_page_loop_2")}
              className="text-xl font-semibold"
            >
              Loop ที่กำลังทำงาน
            </h2>
            <span className="text-muted-foreground text-sm">
              {activeLoops.length} รายการ
            </span>
          </div>
          <ActiveLoops
            clanSlug={clan.slug}
            loops={activeLoops}
            canManage={Boolean(canManage)}
          />
        </section>

        <div className="mt-8">
          <Button
            id={htmlId("loops_loops_page_button")}
            asChild
            variant="outline"
          >
            <Link
              id={htmlId("loops_loops_page_dashboard_2")}
              href={`/c/${clan.slug}/dashboard`}
            >
              กลับ Dashboard
            </Link>
          </Button>
        </div>
      </main>
    </>
  );
}
