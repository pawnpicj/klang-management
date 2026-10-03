"use client";
import Link from "next/link";
import {
  memberPreviewColumns,
  memberPreviewPath,
} from "@/features/clans/member-preview";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import { updateMemberPreviewAction } from "@/features/clans/preview-actions";
import { initialClanState } from "@/features/clans/state";
function SaveButton() {
  const { pending } = useFormStatus();
  return (
    <Button id="member_preview_save" type="submit" disabled={pending}>
      {pending ? "กำลังบันทึก…" : "บันทึกการตั้งค่า"}
    </Button>
  );
}
export function MemberPreviewSettings({
  clanSlug,
  enabled,
  columns,
}: {
  clanSlug: string;
  enabled: boolean;
  columns: string[];
}) {
  const [state, action] = useActionState(
    updateMemberPreviewAction,
    initialClanState,
  );
  return (
    <section
      id="member_preview_settings"
      className="border-input mt-6 rounded-xl border p-5 sm:p-6"
    >
      <h2 id="member_preview_settings_title" className="font-semibold">
        รายชื่อสมาชิกสาธารณะ
      </h2>
      <p
        id="member_preview_settings_description"
        className="text-muted-foreground mt-2 text-sm leading-6"
      >
        เมื่อเปิด ทุกคนที่มีลิงก์สามารถดูชื่อสมาชิก Social Media
        ชื่อรายการอาวุธ/ยา/ระเบิด/อื่นๆ
        และยอดค้างส่งตามคอลัมน์ที่เลือกได้โดยไม่ต้องล็อกอิน
      </p>
      <form
        id="member_preview_settings_form"
        action={action}
        className="mt-4 space-y-4"
      >
        <input
          id="member_preview_clan_slug"
          type="hidden"
          name="clanSlug"
          value={clanSlug}
        />
        <label
          id="member_preview_enabled_label"
          className="flex items-center gap-3 text-sm font-medium"
        >
          <input
            id="member_preview_enabled"
            type="checkbox"
            name="enabled"
            defaultChecked={enabled}
            className="size-4 accent-teal-600"
          />
          เปิดรายชื่อสมาชิกสาธารณะ
        </label>
        <fieldset id="member_preview_columns" className="space-y-3">
          <legend
            id="member_preview_columns_title"
            className="mb-3 text-sm font-medium"
          >
            คอลัมน์ที่แสดง
          </legend>
          {memberPreviewColumns.map((column) => (
            <label
              id={`member_preview_column_${column.key}_label`}
              key={column.key}
              className="flex items-center gap-3 text-sm"
            >
              <input
                id={`member_preview_column_${column.key}`}
                type="checkbox"
                name="columns"
                value={column.key}
                defaultChecked={columns.includes(column.key)}
                className="size-4 accent-teal-600"
              />
              {column.label}
            </label>
          ))}
        </fieldset>
        {state.status === "error" && (
          <p
            id="member_preview_settings_error"
            role="alert"
            className="text-sm text-red-500"
          >
            {state.message}
          </p>
        )}
        <div className="flex flex-wrap items-center gap-3">
          <SaveButton />
          {enabled && (
            <Link
              id="member_preview_open"
              href={memberPreviewPath(clanSlug)}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary text-sm font-medium hover:underline"
            >
              เปิดหน้ารายชื่อสมาชิก ↗
            </Link>
          )}
        </div>
      </form>
    </section>
  );
}
