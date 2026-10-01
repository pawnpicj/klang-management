"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import { addClanMemberAction } from "@/features/clans/actions";
import { initialClanState } from "@/features/clans/state";
import { htmlId } from "@/lib/html-id";
import { useId as useHtmlId } from "react";

function SubmitButton() {
  const htmlIdPrefix = useHtmlId();

  const { pending } = useFormStatus();
  return (
    <Button
      id={htmlId("clan_submit_button_button", htmlIdPrefix)}
      type="submit"
      disabled={pending}
    >
      {pending ? "กำลังเพิ่ม…" : "เพิ่มสมาชิก"}
    </Button>
  );
}

export function AddMemberForm({ clanSlug }: { clanSlug: string }) {
  const htmlIdPrefix = useHtmlId();

  const [state, action] = useActionState(addClanMemberAction, initialClanState);
  const error = state.fieldErrors?.characterName?.[0];

  return (
    <form
      id={htmlId("clan_add_member_form_form", htmlIdPrefix)}
      action={action}
      className="flex flex-col items-start gap-3 sm:flex-row sm:items-end"
    >
      <input
        id={htmlId("clan_add_member_form_clan_slug", htmlIdPrefix)}
        type="hidden"
        name="clanSlug"
        value={clanSlug}
      />
      <div className="w-full flex-1">
        <label
          id={htmlId("clan_add_member_form_label", htmlIdPrefix)}
          className="block text-sm font-medium"
        >
          ชื่อตัวละคร
          <input
            id={htmlId("clan_add_member_form_character_name", htmlIdPrefix)}
            className="border-input bg-background focus-visible:ring-ring mt-1 h-11 w-full rounded-md border px-3 text-base outline-none focus-visible:ring-2"
            name="characterName"
            maxLength={100}
            required
            autoComplete="off"
            aria-invalid={Boolean(error)}
          />
          {error && (
            <span className="mt-1 block text-sm text-red-600">{error}</span>
          )}
        </label>
        {state.message && (
          <p
            id={htmlId("clan_add_member_form_state_message", htmlIdPrefix)}
            className="mt-2 rounded-md bg-red-50 p-3 text-sm text-red-800 dark:bg-red-950 dark:text-red-200"
            role="alert"
          >
            {state.message}
          </p>
        )}
      </div>
      <SubmitButton />
    </form>
  );
}
