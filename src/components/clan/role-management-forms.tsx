"use client";

import { Save, Trash2 } from "lucide-react";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import { initialClanState } from "@/features/clans/state";
import {
  createCustomRoleAction,
  deleteCustomRoleAction,
  updateCustomRoleAction,
} from "@/features/roles/actions";
import { htmlId } from "@/lib/html-id";
import { useId as useHtmlId } from "react";

type Permission = { code: string; description: string };

function SubmitButton({ label = "บันทึก" }: { label?: string }) {
  const htmlIdPrefix = useHtmlId();

  const { pending } = useFormStatus();
  return (
    <Button
      id={htmlId("clan_submit_button_button", htmlIdPrefix)}
      type="submit"
      disabled={pending}
    >
      {pending ? "กำลังบันทึก…" : label}
    </Button>
  );
}

function PermissionFields({
  permissions,
  selected = [],
}: {
  permissions: Permission[];
  selected?: string[];
}) {
  const htmlIdPrefix = useHtmlId();

  return (
    <fieldset>
      <legend className="text-sm font-medium">Permissions</legend>
      <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {permissions.map((permission, htmlRowIndex1) => (
          <label
            id={htmlId(
              "clan_permission_fields_label",
              htmlIdPrefix,
              htmlRowIndex1,
            )}
            key={permission.code}
            className="border-input flex items-start gap-2 rounded-md border p-3 text-sm"
          >
            <input
              id={htmlId(
                "clan_permission_fields_permission_codes",
                htmlIdPrefix,
                htmlRowIndex1,
              )}
              type="checkbox"
              name="permissionCodes"
              value={permission.code}
              defaultChecked={selected.includes(permission.code)}
              className="mt-0.5 size-4"
            />
            <span>
              <span className="block font-medium">{permission.code}</span>
              <span className="text-muted-foreground mt-0.5 block text-xs">
                {permission.description}
              </span>
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

export function CreateRoleForm({
  clanSlug,
  permissions,
}: {
  clanSlug: string;
  permissions: Permission[];
}) {
  const htmlIdPrefix = useHtmlId();

  const [state, action] = useActionState(
    createCustomRoleAction,
    initialClanState,
  );
  return (
    <form
      id={htmlId("clan_create_role_form_form", htmlIdPrefix)}
      action={action}
      className="space-y-5"
    >
      <input
        id={htmlId("clan_create_role_form_clan_slug", htmlIdPrefix)}
        type="hidden"
        name="clanSlug"
        value={clanSlug}
      />
      <label
        id={htmlId("clan_create_role_form_role", htmlIdPrefix)}
        className="block text-sm font-medium"
      >
        ชื่อ Role
        <input
          id={htmlId("clan_create_role_form_name", htmlIdPrefix)}
          name="name"
          required
          maxLength={80}
          className="border-input bg-background focus-visible:ring-ring mt-1 h-11 w-full rounded-md border px-3 text-base outline-none focus-visible:ring-2"
        />
      </label>
      <PermissionFields permissions={permissions} />
      {state.message && (
        <p
          id={htmlId("clan_create_role_form_state_message", htmlIdPrefix)}
          className="text-sm text-red-600"
          role="alert"
        >
          {state.message}
        </p>
      )}
      <SubmitButton label="สร้าง Custom Role" />
    </form>
  );
}

export function EditRoleForm({
  clanSlug,
  role,
  permissions,
}: {
  clanSlug: string;
  role: { id: string; name: string; permissionCodes: string[] };
  permissions: Permission[];
}) {
  const htmlIdPrefix = useHtmlId();

  const [state, action] = useActionState(
    updateCustomRoleAction,
    initialClanState,
  );
  return (
    <div className="space-y-4">
      <form
        id={htmlId("clan_edit_role_form_form", htmlIdPrefix)}
        action={action}
        className="space-y-5"
      >
        <input
          id={htmlId("clan_edit_role_form_clan_slug", htmlIdPrefix)}
          type="hidden"
          name="clanSlug"
          value={clanSlug}
        />
        <input
          id={htmlId("clan_edit_role_form_role_id", htmlIdPrefix)}
          type="hidden"
          name="roleId"
          value={role.id}
        />
        <label
          id={htmlId("clan_edit_role_form_role", htmlIdPrefix)}
          className="block text-sm font-medium"
        >
          ชื่อ Role
          <input
            id={htmlId("clan_edit_role_form_name", htmlIdPrefix)}
            name="name"
            defaultValue={role.name}
            required
            maxLength={80}
            className="border-input bg-background focus-visible:ring-ring mt-1 h-10 w-full rounded-md border px-3 outline-none focus-visible:ring-2"
          />
        </label>
        <PermissionFields
          permissions={permissions}
          selected={role.permissionCodes}
        />
        {state.message && (
          <p
            id={htmlId("clan_edit_role_form_state_message", htmlIdPrefix)}
            className="text-sm text-red-600"
            role="alert"
          >
            {state.message}
          </p>
        )}
        <Button
          id={htmlId("clan_edit_role_form_role_2", htmlIdPrefix)}
          type="submit"
        >
          <Save className="size-4" aria-hidden="true" /> บันทึก Role
        </Button>
      </form>
      <form
        id={htmlId("clan_edit_role_form_form_2", htmlIdPrefix)}
        action={deleteCustomRoleAction}
        onSubmit={(event) => {
          if (!window.confirm(`ยืนยันลบ Role ${role.name}?`))
            event.preventDefault();
        }}
      >
        <input
          id={htmlId("clan_edit_role_form_clan_slug_2", htmlIdPrefix)}
          type="hidden"
          name="clanSlug"
          value={clanSlug}
        />
        <input
          id={htmlId("clan_edit_role_form_role_id_2", htmlIdPrefix)}
          type="hidden"
          name="roleId"
          value={role.id}
        />
        <Button
          id={htmlId("clan_edit_role_form_role_3", htmlIdPrefix)}
          type="submit"
          variant="destructive"
        >
          <Trash2 className="size-4" aria-hidden="true" /> ลบ Role
        </Button>
      </form>
    </div>
  );
}
