"use client";

import { CircleCheck, Clock3, Plus, Siren, Trash2 } from "lucide-react";
import {
  memo,
  useActionState,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import {
  initialAddLoopStepState,
  type AddLoopStepState,
  type LoopStep,
} from "@/features/loops/state";
import { initialClanState } from "@/features/clans/state";
import {
  addCountdownSeconds,
  normalizeCountdownInput,
} from "@/features/loops/time";
import {
  deleteLoopTimerAction,
  removeLoopTimerStepAction,
  addLoopStepAction,
  createLoopTopicAction,
} from "@/features/loops/actions";

const fieldClass =
  "border-input bg-background focus-visible:ring-ring mt-1 h-11 w-full rounded-md border px-3 outline-none focus-visible:ring-2";

export type LoopMember = { id: string; characterName: string };
export type LoopTimer = {
  id: string;
  name: string;
  memberName: string | null;
  loopCount: number;
  status: string;
  steps: LoopStep[];
};
function CreateSubmit() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "กำลังสร้าง…" : "เริ่ม Loop"}
    </Button>
  );
}

export function CreateLoopDialog({
  clanSlug,
  members,
}: {
  clanSlug: string;
  members: LoopMember[];
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [state, action] = useActionState(
    createLoopTopicAction,
    initialClanState,
  );
  const [ownerType, setOwnerType] = useState("CLAN");

  return (
    <>
      <Button type="button" onClick={() => dialogRef.current?.showModal()}>
        <Plus className="size-4" /> สร้างหัวข้อ Loop
      </Button>
      <dialog
        ref={dialogRef}
        onClick={(event) =>
          event.target === event.currentTarget && dialogRef.current?.close()
        }
        className="bg-background text-foreground fixed inset-0 m-auto max-h-[90vh] w-[min(92vw,36rem)] overflow-y-auto rounded-xl border p-0 shadow-xl backdrop:bg-black/40"
      >
        <form action={action} className="space-y-5 p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <Clock3 className="text-primary mb-2 size-6" />
              <h2 className="text-xl font-semibold">สร้างหัวข้อ Loop</h2>
              <p className="text-muted-foreground mt-1 text-sm">
                สร้างหัวข้อก่อน แล้วจึงเพิ่มรายการ Loop ภายหลัง
              </p>
            </div>
            <button
              type="button"
              onClick={() => dialogRef.current?.close()}
              className="hover:bg-muted rounded-md p-1"
              aria-label="ปิด"
            >
              <span aria-hidden="true" className="text-xl">
                ×
              </span>
            </button>
          </div>
          <input type="hidden" name="clanSlug" value={clanSlug} />
          <label className="block text-sm font-medium">
            ชื่อหัวข้อ Loop
            <input
              name="name"
              required
              maxLength={100}
              placeholder="เช่น รอบเก็บวัตถุดิบประจำวัน"
              className={fieldClass}
            />
          </label>
          <label className="block text-sm font-medium">
            เจ้าของหัวข้อ
            <select
              name="ownerType"
              value={ownerType}
              onChange={(event) => setOwnerType(event.target.value)}
              className={fieldClass}
            >
              <option value="CLAN">รวม Clan/Gang</option>
              <option value="MEMBER">สมาชิกรายบุคคล</option>
            </select>
          </label>
          {ownerType === "MEMBER" ? (
            <label className="block text-sm font-medium">
              สมาชิก
              <select name="memberId" required className={fieldClass}>
                <option value="">เลือกสมาชิก</option>
                {members.map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.characterName}
                  </option>
                ))}
              </select>
            </label>
          ) : (
            <input type="hidden" name="memberId" value="" />
          )}
          {state.message && (
            <p className="text-sm text-red-600" role="alert">
              {state.message}
            </p>
          )}
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => dialogRef.current?.close()}
            >
              ยกเลิก
            </Button>
            <CreateSubmit />
          </div>
        </form>
      </dialog>
    </>
  );
}

function AddLoopSubmit() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "กำลังเพิ่ม…" : "เพิ่ม Loop"}
    </Button>
  );
}

const AddLoopDialog = memo(function AddLoopDialog({
  clanSlug,
  loopTimerId,
  onAdded,
}: {
  clanSlug: string;
  loopTimerId: string;
  onAdded: (loopTimerId: string, step: LoopStep) => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [state, action] = useActionState(
    async (previous: AddLoopStepState, formData: FormData) => {
      const result = await addLoopStepAction(previous, formData);
      if (result.status === "success") {
        onAdded(loopTimerId, result.step);
        dialogRef.current?.close();
      }
      return result;
    },
    initialAddLoopStepState,
  );
  const [timerType, setTimerType] = useState("COUNTDOWN");
  const [countdown, setCountdown] = useState("01:00");
  return (
    <>
      <Button
        type="button"
        size="sm"
        className="bg-emerald-600 text-white hover:bg-emerald-700"
        onClick={() => dialogRef.current?.showModal()}
      >
        <Plus className="size-4" /> เพิ่ม Loop
      </Button>
      <dialog
        ref={dialogRef}
        onCancel={(event) => event.preventDefault()}
        className="bg-background text-foreground fixed inset-0 m-auto w-[min(92vw,32rem)] rounded-xl border p-0 shadow-xl backdrop:bg-black/40"
      >
        <form action={action} className="space-y-4 p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold">เพิ่ม Loop</h2>
              <p className="text-muted-foreground mt-1 text-sm">
                รายการใหม่จะต่อท้ายตาราง
              </p>
            </div>
          </div>
          <input type="hidden" name="clanSlug" value={clanSlug} />
          <input type="hidden" name="loopTimerId" value={loopTimerId} />
          <label className="block text-sm font-medium">
            Location
            <input
              name="location"
              maxLength={200}
              placeholder="เช่น จุด A, โกดังเหนือ (ไม่บังคับ)"
              className={fieldClass}
            />
          </label>
          <label className="block text-sm font-medium">
            ประเภทเวลา
            <select
              name="timerType"
              value={timerType}
              onChange={(event) => setTimerType(event.target.value)}
              className={fieldClass}
            >
              <option value="COUNTDOWN">นับถอยหลัง</option>
              <option value="CLOCK">เวลาที่กำหนด</option>
            </select>
          </label>
          {timerType === "COUNTDOWN" ? (
            <>
              <label className="block text-sm font-medium">
                เวลา (นาที:วินาที)
                <input
                  name="countdown"
                  value={countdown}
                  onChange={(event) => setCountdown(event.target.value)}
                  onBlur={() => {
                    const normalized = normalizeCountdownInput(countdown);
                    if (normalized) setCountdown(normalized);
                  }}
                  inputMode="decimal"
                  pattern="\d{1,4}(?:[.:][0-5]?\d)?"
                  placeholder="เช่น 5.0 หรือ 05:00"
                  required
                  className={fieldClass}
                />
                <span className="mt-2 flex flex-wrap gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      setCountdown((current) =>
                        addCountdownSeconds(current, 30),
                      )
                    }
                  >
                    30 วินาที
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      setCountdown((current) =>
                        addCountdownSeconds(current, 60),
                      )
                    }
                  >
                    1 นาที
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      setCountdown((current) =>
                        addCountdownSeconds(current, 300),
                      )
                    }
                  >
                    5 นาที
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => setCountdown("00:00")}
                  >
                    Reset
                  </Button>
                </span>
              </label>
              <input type="hidden" name="clockTime" value="" />
            </>
          ) : (
            <>
              <input type="hidden" name="countdown" value="" />
              <label className="block text-sm font-medium">
                เวลาแจ้งเตือน
                <input
                  name="clockTime"
                  type="time"
                  required
                  className={fieldClass}
                />
              </label>
            </>
          )}
          <label className="border-input flex items-center gap-3 rounded-lg border p-4 text-sm">
            <input name="sirenEnabled" type="checkbox" className="size-4" />
            แจ้งเตือนด้วยไฟไซเรน
          </label>
          <label className="border-input flex items-center gap-3 rounded-lg border p-4 text-sm">
            <input name="soundEnabled" type="checkbox" className="size-4" />
            แจ้งเตือนด้วยเสียง
          </label>
          {state.status === "error" && state.message && (
            <p className="text-sm text-red-600" role="alert">
              {state.message}
            </p>
          )}
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => dialogRef.current?.close()}
            >
              ยกเลิก
            </Button>
            <AddLoopSubmit />
          </div>
        </form>
      </dialog>
    </>
  );
});
const DeleteLoopDialog = memo(function DeleteLoopDialog({
  clanSlug,
  loopTimerId,
  loopName,
}: {
  clanSlug: string;
  loopTimerId: string;
  loopName: string;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  return (
    <>
      <Button
        type="button"
        size="sm"
        variant="destructive"
        onClick={() => dialogRef.current?.showModal()}
      >
        <Trash2 className="size-4" /> ลบ
      </Button>
      <dialog
        ref={dialogRef}
        className="bg-background text-foreground fixed inset-0 m-auto w-[min(92vw,28rem)] rounded-xl border p-0 shadow-xl backdrop:bg-black/40"
      >
        <div className="space-y-4 p-6">
          <div>
            <h2 className="text-xl font-semibold">ยืนยันการลบ</h2>
            <p className="text-muted-foreground mt-2 text-sm">
              ต้องการลบหัวข้อ “{loopName}” ใช่หรือไม่?
            </p>
            <p className="mt-2 text-sm text-red-600">
              รายการ Loop ของหัวข้อนี้จะถูกลบทั้งหมด
            </p>
          </div>
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => dialogRef.current?.close()}
            >
              ยกเลิก
            </Button>
            <form action={deleteLoopTimerAction}>
              <input type="hidden" name="clanSlug" value={clanSlug} />
              <input type="hidden" name="loopTimerId" value={loopTimerId} />
              <Button type="submit" variant="destructive">
                <Trash2 className="size-4" /> ยืนยันการลบ
              </Button>
            </form>
          </div>
        </div>
      </dialog>
    </>
  );
});

function SoundAlarm({ active }: { active: boolean }) {
  useEffect(() => {
    if (!active) return;
    const context = new AudioContext();
    let highTone = false;
    const beep = () => {
      if (context.state !== "running") return;
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.type = "square";
      oscillator.frequency.value = highTone ? 1040 : 740;
      highTone = !highTone;
      gain.gain.setValueAtTime(0.0001, context.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.18, context.currentTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.3);
      oscillator.connect(gain);
      gain.connect(context.destination);
      oscillator.start();
      oscillator.stop(context.currentTime + 0.32);
    };
    void context
      .resume()
      .then(beep)
      .catch(() => undefined);
    const interval = window.setInterval(beep, 650);
    let autoStop = 0;
    const stop = () => {
      window.clearInterval(interval);
      window.clearTimeout(autoStop);
      void context.close().catch(() => undefined);
    };
    autoStop = window.setTimeout(stop, 15_000);
    return stop;
  }, [active]);

  return null;
}
function remainingLabel(milliseconds: number) {
  const seconds = Math.max(0, Math.ceil(milliseconds / 1000));
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const rest = seconds % 60;
  return [hours, minutes, rest]
    .map((part) => String(part).padStart(2, "0"))
    .join(":");
}

export function ActiveLoops({
  clanSlug,
  loops,
  canManage,
}: {
  clanSlug: string;
  loops: LoopTimer[];
  canManage: boolean;
}) {
  // Tie local additions to the current server snapshot. A later navigation or
  // Remove refresh replaces it, so deleted rows cannot reappear from local state.
  const [local, setLocal] = useState<{
    source: LoopTimer[];
    additions: Record<string, LoopStep[]>;
  }>({ source: loops, additions: {} });
  const onStepAdded = useCallback(
    (loopTimerId: string, step: LoopStep) => {
      setLocal((current) => {
        const additions = current.source === loops ? current.additions : {};
        const existing = additions[loopTimerId] ?? [];
        return {
          source: loops,
          additions: {
            ...additions,
            [loopTimerId]: [
              ...existing.filter((row) => row.id !== step.id),
              step,
            ],
          },
        };
      });
    },
    [loops],
  );
  const visibleLoops = useMemo(
    () =>
      loops.map((loop) => {
        const added =
          local.source === loops ? (local.additions[loop.id] ?? []) : [];
        if (!added.length) return loop;
        const savedIds = new Set(loop.steps.map((step) => step.id));
        const steps = [
          ...loop.steps,
          ...added.filter((step) => !savedIds.has(step.id)),
        ].sort((left, right) => left.stepNumber - right.stepNumber);
        return { ...loop, steps, loopCount: steps.length, status: "ACTIVE" };
      }),
    [loops, local],
  );
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  if (!loops.length) {
    return (
      <div className="border-input text-muted-foreground rounded-xl border border-dashed p-10 text-center text-sm">
        ยังไม่มีหัวข้อ Loop
      </div>
    );
  }

  return (
    <div className="grid gap-4">
      {visibleLoops.map((loop) => {
        const isDraft = loop.status === "DRAFT";
        const hasDueRow = loop.steps.some((step) => {
          const target = step.alertAt ? new Date(step.alertAt).getTime() : 0;
          return (
            loop.status === "ACTIVE" &&
            !step.acknowledgedAt &&
            now !== null &&
            target > 0 &&
            target <= now
          );
        });

        return (
          <article
            key={loop.id}
            className={
              "relative overflow-hidden rounded-xl border p-5 " +
              (hasDueRow ? "border-red-400 bg-red-50/30" : "border-input")
            }
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  {hasDueRow ? (
                    <Siren className="size-5 text-red-600" />
                  ) : (
                    <Clock3 className="text-primary size-5" />
                  )}
                  <h3 className="font-semibold">{loop.name}</h3>
                </div>
                <p className="text-muted-foreground mt-1 text-sm">
                  {loop.memberName ?? "รวม Clan/Gang"} · {loop.loopCount} Loop
                </p>
              </div>
            </div>

            {isDraft && (
              <div className="border-input text-muted-foreground mt-5 rounded-lg border border-dashed p-6 text-center text-sm">
                ยังไม่มีรายการ Loop กด “เพิ่ม Loop” เพื่อสร้างรายการแรก
              </div>
            )}

            <div className="bg-background mt-4 overflow-x-auto rounded-lg border">
              <table className="w-full min-w-[900px] text-left text-xs">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="px-3 py-2">Loop</th>
                    <th className="px-3 py-2">Location</th>
                    <th className="px-3 py-2">ประเภท</th>
                    <th className="px-3 py-2">เวลา</th>
                    <th className="px-3 py-2">ไซเรน</th>
                    <th className="px-3 py-2">เสียง</th>
                    <th className="px-3 py-2 text-center">Remove</th>
                  </tr>
                </thead>
                <tbody className="divide-input divide-y">
                  {loop.steps.length === 0 && (
                    <tr>
                      <td
                        colSpan={7}
                        className="text-muted-foreground px-3 py-5 text-center"
                      >
                        ยังไม่มีรายการ Loop
                      </td>
                    </tr>
                  )}
                  {loop.steps.map((step) => {
                    const target = step.alertAt
                      ? new Date(step.alertAt).getTime()
                      : 0;
                    const due =
                      loop.status === "ACTIVE" &&
                      !step.acknowledgedAt &&
                      now !== null &&
                      target > 0 &&
                      target <= now;
                    const remaining =
                      step.timerType === "COUNTDOWN"
                        ? step.acknowledgedAt || due
                          ? "00:00:00"
                          : now === null || !target
                            ? "--:--:--"
                            : remainingLabel(target - now)
                        : (step.clockTime?.slice(0, 5) ?? "--:--") + " น.";

                    const checkpointFields = (
                      <>
                        <input type="hidden" name="clanSlug" value={clanSlug} />
                        <input
                          type="hidden"
                          name="loopTimerId"
                          value={loop.id}
                        />
                        <input
                          type="hidden"
                          name="stepNumber"
                          value={step.stepNumber}
                        />
                      </>
                    );

                    return (
                      <tr
                        key={step.id}
                        className={
                          due && step.sirenEnabled
                            ? "animate-pulse bg-red-100"
                            : step.acknowledgedAt
                              ? "bg-emerald-50/40"
                              : ""
                        }
                      >
                        <td className="px-3 py-2 font-medium">
                          {step.stepNumber}
                        </td>
                        <td className="px-3 py-2">{step.location ?? "-"}</td>
                        <td className="px-3 py-2">
                          {step.timerType === "COUNTDOWN"
                            ? "นับถอยหลัง"
                            : "เวลาที่กำหนด"}
                        </td>
                        <td className="px-3 py-2">
                          <span
                            className={
                              "inline-flex items-center gap-1.5 font-mono tabular-nums " +
                              (due ? "font-semibold text-red-600" : "")
                            }
                          >
                            {step.acknowledgedAt && (
                              <CircleCheck className="size-4 text-emerald-600" />
                            )}
                            {remaining}
                          </span>
                        </td>
                        <td className="px-3 py-2">
                          {step.sirenEnabled ? "เปิด" : "ปิด"}
                        </td>
                        <td className="px-3 py-2">
                          {due && step.soundEnabled && <SoundAlarm active />}
                          {step.soundEnabled ? "เปิด" : "ปิด"}
                        </td>
                        <td className="px-3 py-2 text-center">
                          {canManage ? (
                            <form
                              action={removeLoopTimerStepAction}
                              onSubmit={(event) => {
                                if (
                                  !window.confirm(
                                    "ยืนยันการ Remove Loop แถวนี้?",
                                  )
                                ) {
                                  event.preventDefault();
                                }
                              }}
                            >
                              {checkpointFields}
                              <Button
                                type="submit"
                                size="sm"
                                variant="outline"
                                className="size-9 border-red-300 p-0 text-red-600 hover:bg-red-50 hover:text-red-700"
                                aria-label={"Remove Loop " + step.stepNumber}
                              >
                                <Trash2 className="size-4" />
                              </Button>
                            </form>
                          ) : (
                            "-"
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {canManage && (
              <div className="mt-4 flex flex-wrap justify-end gap-2">
                {loop.loopCount < 100 && (
                  <AddLoopDialog
                    clanSlug={clanSlug}
                    loopTimerId={loop.id}
                    onAdded={onStepAdded}
                  />
                )}
                <DeleteLoopDialog
                  clanSlug={clanSlug}
                  loopTimerId={loop.id}
                  loopName={loop.name}
                />
              </div>
            )}
          </article>
        );
      })}
    </div>
  );
}
