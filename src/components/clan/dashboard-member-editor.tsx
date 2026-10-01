"use client";

import { Pencil, X } from "lucide-react";
import { useActionState, useRef } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import { updateClanMemberDetailsAction } from "@/features/clans/actions";
import { initialClanState } from "@/features/clans/state";

const fieldClass =
  "border-input bg-background focus-visible:ring-ring mt-1 h-11 w-full rounded-md border px-3 text-base outline-none focus-visible:ring-2";

function SaveButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "กำลังบันทึก…" : "บันทึก"}
    </Button>
  );
}

export function DashboardMemberEditor({
  clanSlug,
  member,
  roles,
  trackingStartedOn,
  today,
}: {
  clanSlug: string;
  member: {
    id: string;
    characterName: string;
    roleId: string;
    deliveryStartedOn: string;
  };
  roles: Array<{ id: string; name: string }>;
  trackingStartedOn: string;
  today: string;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [state, action] = useActionState(
    updateClanMemberDetailsAction,
    initialClanState,
  );
  const close = () => dialogRef.current?.close();

  return (
    <>
      <button
        type="button"
        className="focus-visible:ring-ring inline-flex size-8 shrink-0 items-center justify-center rounded-md bg-transparent p-0 text-amber-500 transition-colors hover:text-amber-600 focus-visible:ring-2 focus-visible:outline-none"
        onClick={() => dialogRef.current?.showModal()}
        aria-label={`แก้ไขสมาชิก ${member.characterName}`}
        title="แก้ไขสมาชิก"
      >
        <Pencil className="size-4" aria-hidden="true" />
      </button>
      <dialog
        ref={dialogRef}
        onClick={(event) => {
          if (event.target === event.currentTarget) close();
        }}
        className="bg-background text-foreground fixed inset-0 m-auto max-h-[90vh] w-[min(92vw,30rem)] overflow-y-auto rounded-xl border p-0 shadow-xl backdrop:bg-black/40"
      >
        <div className="p-6">
          <div className="mb-5 flex items-start justify-between gap-4">
            <div>
              <Pencil className="text-primary mb-2 size-6" aria-hidden="true" />
              <h2 className="text-xl font-semibold">
                แก้ไขสมาชิก: {member.characterName}
              </h2>
            </div>
            <button
              type="button"
              onClick={close}
              className="hover:bg-muted rounded-md p-1"
              aria-label="ปิด"
            >
              <X className="size-5" />
            </button>
          </div>

          <form action={action} className="space-y-5">
            <input type="hidden" name="clanSlug" value={clanSlug} />
            <input type="hidden" name="memberId" value={member.id} />

            <label className="block text-sm font-medium">
              ชื่อตัวละคร
              <input
                name="characterName"
                defaultValue={member.characterName}
                maxLength={100}
                required
                className={fieldClass}
              />
              {state.fieldErrors?.characterName?.[0] && (
                <span className="mt-1 block text-sm text-red-600">
                  {state.fieldErrors.characterName[0]}
                </span>
              )}
            </label>

            <label className="block text-sm font-medium">
              Role
              <select
                name="roleId"
                defaultValue={member.roleId}
                required
                className={fieldClass}
              >
                {roles.map((role) => (
                  <option key={role.id} value={role.id}>
                    {role.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="block text-sm font-medium">
              วันที่เริ่มส่ง
              <input
                name="deliveryStartedOn"
                type="date"
                defaultValue={member.deliveryStartedOn}
                min={trackingStartedOn}
                max={today}
                required
                className={fieldClass}
              />
              <span className="text-muted-foreground mt-1 block text-xs">
                ระบบจะเริ่มคำนวณยอดขาดส่งของสมาชิกตั้งแต่วันที่นี้
              </span>
              {state.fieldErrors?.deliveryStartedOn?.[0] && (
                <span className="mt-1 block text-sm text-red-600">
                  {state.fieldErrors.deliveryStartedOn[0]}
                </span>
              )}
            </label>

            {state.message && (
              <p
                className="rounded-md bg-red-50 p-3 text-sm text-red-700"
                role="alert"
              >
                {state.message}
              </p>
            )}

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={close}>
                ยกเลิก
              </Button>
              <SaveButton />
            </div>
          </form>
        </div>
      </dialog>
    </>
  );
}
