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
import { SocialLogo } from "@/components/clan/social-logo";
import { socialPlatforms } from "@/features/clans/social-links";
import { initialClanState } from "@/features/clans/state";
import { htmlId } from "@/lib/html-id";
import { useId as useHtmlId } from "react";

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
  const htmlIdPrefix = useHtmlId();

  const { pending } = useFormStatus();
  return (
    <Button
      id={htmlId("clan_pending_button_button", htmlIdPrefix)}
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
  const htmlIdPrefix = useHtmlId();

  return (
    <form
      id={htmlId("clan_archive_clan_button_form", htmlIdPrefix)}
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
      <input
        id={htmlId("clan_archive_clan_button_clan_slug", htmlIdPrefix)}
        type="hidden"
        name="clanSlug"
        value={clanSlug}
      />
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
  socialLinks,
}: {
  clanSlug: string;
  name: string;
  type: string;
  note: string | null;
  rules: string | null;
  socialLinks: {
    discordUrl: string | null;
    lineUrl: string | null;
    telegramUrl: string | null;
    facebookUrl: string | null;
    tiktokUrl: string | null;
  };
}) {
  const htmlIdPrefix = useHtmlId();

  const [state, action] = useActionState(updateClanAction, initialClanState);
  return (
    <form
      id={htmlId("clan_clan_settings_form_form", htmlIdPrefix)}
      action={action}
      className="space-y-5"
    >
      <input
        id={htmlId("clan_clan_settings_form_clan_slug", htmlIdPrefix)}
        type="hidden"
        name="clanSlug"
        value={clanSlug}
      />
      <label
        id={htmlId("clan_clan_settings_form_clan_gang", htmlIdPrefix)}
        className="block text-sm font-medium"
      >
        ชื่อ Clan/Gang
        <input
          id={htmlId("clan_clan_settings_form_name", htmlIdPrefix)}
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
      <label
        id={htmlId("clan_clan_settings_form_label", htmlIdPrefix)}
        className="block text-sm font-medium"
      >
        ประเภท
        <select
          id={htmlId("clan_clan_settings_form_type", htmlIdPrefix)}
          className="border-input bg-background focus-visible:ring-ring mt-1 h-11 w-full rounded-md border px-3 text-base outline-none focus-visible:ring-2"
          name="type"
          defaultValue={type}
        >
          <option value="CLAN">Clan</option>
          <option value="GANG">Gang</option>
        </select>
      </label>
      <label
        id={htmlId("clan_clan_settings_form_note", htmlIdPrefix)}
        className="block text-sm font-medium"
      >
        Note
        <textarea
          id={htmlId("clan_clan_settings_form_note_2", htmlIdPrefix)}
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
      <label
        id={htmlId("clan_clan_settings_form_rule", htmlIdPrefix)}
        className="block text-sm font-medium"
      >
        Rule
        <textarea
          id={htmlId("clan_clan_settings_form_rules", htmlIdPrefix)}
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
      <fieldset className="space-y-4">
        <legend className="mb-3 font-semibold">Social Media</legend>
        {socialPlatforms.map((platform, htmlRowIndex1) => (
          <label
            id={htmlId(
              "clan_clan_settings_form_label_2",
              htmlIdPrefix,
              htmlRowIndex1,
            )}
            key={platform.key}
            className="block text-sm font-medium"
          >
            <span className="flex items-center gap-2">
              <span className="[&>svg]:size-5">
                <SocialLogo platform={platform.key} />
              </span>
              {platform.label}
            </span>
            <input
              id={htmlId(
                "clan_clan_settings_form_input",
                htmlIdPrefix,
                htmlRowIndex1,
              )}
              type="url"
              name={platform.key}
              defaultValue={socialLinks[platform.key] ?? ""}
              placeholder={platform.placeholder}
              maxLength={1000}
              className="border-input bg-background focus-visible:ring-ring mt-1 h-11 w-full rounded-md border px-3 text-base outline-none focus-visible:ring-2"
            />
            {state.fieldErrors?.[platform.key]?.[0] && (
              <span className="mt-1 block text-sm text-red-600">
                {state.fieldErrors[platform.key][0]}
              </span>
            )}
          </label>
        ))}
      </fieldset>
      {state.message && (
        <p
          id={htmlId("clan_clan_settings_form_state_message", htmlIdPrefix)}
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
  const htmlIdPrefix = useHtmlId();

  const [state, action] = useActionState(
    updateClanMemberAction,
    initialClanState,
  );
  return (
    <div className="relative flex items-end gap-2">
      <form
        id={htmlId("clan_member_row_actions_form", htmlIdPrefix)}
        action={action}
        className="flex min-w-0 flex-1 gap-2"
      >
        <input
          id={htmlId("clan_member_row_actions_clan_slug", htmlIdPrefix)}
          type="hidden"
          name="clanSlug"
          value={clanSlug}
        />
        <input
          id={htmlId("clan_member_row_actions_member_id", htmlIdPrefix)}
          type="hidden"
          name="memberId"
          value={memberId}
        />
        <label
          id={htmlId("clan_member_row_actions_label", htmlIdPrefix)}
          className="sr-only"
          htmlFor={`member-${memberId}`}
        >
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
        id={htmlId("clan_member_row_actions_form_2", htmlIdPrefix)}
        action={removeClanMemberAction}
        onSubmit={(event) => {
          if (!window.confirm(`ยืนยันนำ ${characterName} ออกจาก Clan/Gang?`)) {
            event.preventDefault();
          }
        }}
      >
        <input
          id={htmlId("clan_member_row_actions_clan_slug_2", htmlIdPrefix)}
          type="hidden"
          name="clanSlug"
          value={clanSlug}
        />
        <input
          id={htmlId("clan_member_row_actions_member_id_2", htmlIdPrefix)}
          type="hidden"
          name="memberId"
          value={memberId}
        />
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
        <p
          id={htmlId("clan_member_row_actions_state_message", htmlIdPrefix)}
          className="absolute top-full mt-2 text-sm text-red-600"
          role="alert"
        >
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
  const htmlIdPrefix = useHtmlId();

  const [state, action] = useActionState(
    updateClanMemberRoleAction,
    initialClanState,
  );

  return (
    <div>
      <form
        id={htmlId("clan_member_role_form_form", htmlIdPrefix)}
        action={action}
        className="flex min-w-48 items-center gap-2"
      >
        <input
          id={htmlId("clan_member_role_form_clan_slug", htmlIdPrefix)}
          type="hidden"
          name="clanSlug"
          value={clanSlug}
        />
        <input
          id={htmlId("clan_member_role_form_member_id", htmlIdPrefix)}
          type="hidden"
          name="memberId"
          value={memberId}
        />
        <label
          id={htmlId("clan_member_role_form_role", htmlIdPrefix)}
          className="sr-only"
          htmlFor={`role-${memberId}`}
        >
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
        <p
          id={htmlId("clan_member_role_form_state_message", htmlIdPrefix)}
          className="mt-2 max-w-56 text-xs text-red-600"
          role="alert"
        >
          {state.message}
        </p>
      )}
    </div>
  );
}
