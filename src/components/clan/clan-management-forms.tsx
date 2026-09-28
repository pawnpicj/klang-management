"use client";

import { Pencil, Save, UserMinus } from "lucide-react";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import {
  archiveClanAction,
  removeClanMemberAction,
  updateClanAction,
  updateClanMemberAction,
  updateClanMemberRoleAction,
} from "@/features/clans/actions";
import { initialClanState } from "@/features/clans/state";

function PendingButton({
  children,
  pendingText,
  variant = "default",
  size = "default",
  className,
  title,
}: {
  children: React.ReactNode;
  pendingText: string;
  variant?: "default" | "outline" | "warning" | "destructive";
  size?: "default" | "sm";
  className?: string;
  title?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      variant={variant}
      size={size}
      className={className}
      title={title}
      disabled={pending}
    >
      {pending ? pendingText : children}
    </Button>
  );
}

export function ArchiveClanButton({ clanSlug }: { clanSlug: string }) {
  return (
    <form
      action={archiveClanAction}
      onSubmit={(event) => {
        if (
          !window.confirm(
            "ยืนยันลบ Clan/Gang นี้? ระบบจะ Archive เพื่อเก็บประวัติรายการ",
          )
        ) {
          event.preventDefault();
        }
      }}
    >
      <input type="hidden" name="clanSlug" value={clanSlug} />
      <PendingButton
        variant="destructive"
        size="sm"
        className="w-14"
        pendingText="กำลังลบ…"
      >
        ลบ
      </PendingButton>
    </form>
  );
}

export function ClanSettingsForm({
  clanSlug,
  name,
  type,
  note,
  rules,
}: {
  clanSlug: string;
  name: string;
  type: string;
  note: string | null;
  rules: string | null;
}) {
  const [state, action] = useActionState(updateClanAction, initialClanState);
  return (
    <form action={action} className="space-y-5">
      <input type="hidden" name="clanSlug" value={clanSlug} />
      <label className="block text-sm font-medium">
        ชื่อ Clan/Gang
        <input
          className="border-input bg-background focus-visible:ring-ring mt-1 h-11 w-full rounded-md border px-3 text-base outline-none focus-visible:ring-2"
          name="name"
          defaultValue={name}
          maxLength={100}
          required
        />
        {state.fieldErrors?.name?.[0] && (
          <span className="mt-1 block text-sm text-red-600">
            {state.fieldErrors.name[0]}
          </span>
        )}
      </label>
      <label className="block text-sm font-medium">
        ประเภท
        <select
          className="border-input bg-background focus-visible:ring-ring mt-1 h-11 w-full rounded-md border px-3 text-base outline-none focus-visible:ring-2"
          name="type"
          defaultValue={type}
        >
          <option value="CLAN">Clan</option>
          <option value="GANG">Gang</option>
        </select>
      </label>
      <label className="block text-sm font-medium">
        Note
        <textarea
          className="border-input bg-background focus-visible:ring-ring mt-1 min-h-28 w-full resize-y rounded-md border px-3 py-2 text-base outline-none focus-visible:ring-2"
          name="note"
          defaultValue={note ?? ""}
          maxLength={2000}
          placeholder="รายละเอียดหรือหมายเหตุของ Clan/Gang"
        />
        {state.fieldErrors?.note?.[0] && (
          <span className="mt-1 block text-sm text-red-600">
            {state.fieldErrors.note[0]}
          </span>
        )}
      </label>
      <label className="block text-sm font-medium">
        Rule
        <textarea
          className="border-input bg-background focus-visible:ring-ring mt-1 min-h-40 w-full resize-y rounded-md border px-3 py-2 text-base outline-none focus-visible:ring-2"
          name="rules"
          defaultValue={rules ?? ""}
          maxLength={10000}
          placeholder="กฎของ Clan/Gang"
        />
        {state.fieldErrors?.rules?.[0] && (
          <span className="mt-1 block text-sm text-red-600">
            {state.fieldErrors.rules[0]}
          </span>
        )}
      </label>
      {state.message && (
        <p
          className="rounded-md bg-red-50 p-3 text-sm text-red-800 dark:bg-red-950 dark:text-red-200"
          role="alert"
        >
          {state.message}
        </p>
      )}
      <PendingButton pendingText="กำลังบันทึก…">บันทึก</PendingButton>
    </form>
  );
}

export function MemberRowActions({
  clanSlug,
  memberId,
  characterName,
}: {
  clanSlug: string;
  memberId: string;
  characterName: string;
}) {
  const [state, action] = useActionState(
    updateClanMemberAction,
    initialClanState,
  );
  return (
    <div className="relative flex items-end gap-2">
      <form action={action} className="flex min-w-0 flex-1 gap-2">
        <input type="hidden" name="clanSlug" value={clanSlug} />
        <input type="hidden" name="memberId" value={memberId} />
        <label className="sr-only" htmlFor={`member-${memberId}`}>
          ชื่อตัวละคร
        </label>
        <input
          id={`member-${memberId}`}
          className="border-input bg-background focus-visible:ring-ring h-9 min-w-0 flex-1 rounded-md border px-3 text-sm outline-none focus-visible:ring-2"
          name="characterName"
          defaultValue={characterName}
          maxLength={100}
          required
        />
        <PendingButton
          variant="warning"
          size="sm"
          className="size-9 shrink-0 p-0"
          title="แก้ไขชื่อ"
          pendingText="กำลังบันทึก…"
        >
          <Pencil className="size-4" aria-hidden="true" />
          <span className="sr-only">แก้ไขชื่อ</span>
        </PendingButton>
      </form>
      <form
        action={removeClanMemberAction}
        onSubmit={(event) => {
          if (!window.confirm(`ยืนยันนำ ${characterName} ออกจาก Clan/Gang?`)) {
            event.preventDefault();
          }
        }}
      >
        <input type="hidden" name="clanSlug" value={clanSlug} />
        <input type="hidden" name="memberId" value={memberId} />
        <PendingButton
          variant="destructive"
          size="sm"
          className="size-9 shrink-0 p-0"
          title="นำสมาชิกออก"
          pendingText="กำลังนำออก…"
        >
          <UserMinus className="size-4" aria-hidden="true" />
          <span className="sr-only">นำสมาชิกออก</span>
        </PendingButton>
      </form>
      {state.message && (
        <p className="absolute top-full mt-2 text-sm text-red-600" role="alert">
          {state.message}
        </p>
      )}
    </div>
  );
}

export function MemberRoleForm({
  clanSlug,
  memberId,
  roleId,
  roles,
}: {
  clanSlug: string;
  memberId: string;
  roleId: string;
  roles: { id: string; name: string }[];
}) {
  const [state, action] = useActionState(
    updateClanMemberRoleAction,
    initialClanState,
  );

  return (
    <div>
      <form action={action} className="flex min-w-48 items-center gap-2">
        <input type="hidden" name="clanSlug" value={clanSlug} />
        <input type="hidden" name="memberId" value={memberId} />
        <label className="sr-only" htmlFor={`role-${memberId}`}>
          Role
        </label>
        <select
          id={`role-${memberId}`}
          name="roleId"
          defaultValue={roleId}
          className="border-input bg-background focus-visible:ring-ring h-9 min-w-0 flex-1 rounded-md border px-2 text-sm outline-none focus-visible:ring-2"
        >
          {roles.map((role) => (
            <option key={role.id} value={role.id}>
              {role.name}
            </option>
          ))}
        </select>
        <PendingButton
          variant="default"
          size="sm"
          className="size-9 shrink-0 p-0"
          title="บันทึก Role"
          pendingText="…"
        >
          <Save className="size-4" aria-hidden="true" />
          <span className="sr-only">บันทึก Role</span>
        </PendingButton>
      </form>
      {state.message && (
        <p className="mt-2 max-w-56 text-xs text-red-600" role="alert">
          {state.message}
        </p>
      )}
    </div>
  );
}
