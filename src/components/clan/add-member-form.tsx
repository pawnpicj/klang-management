"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import { addClanMemberAction } from "@/features/clans/actions";
import { initialClanState } from "@/features/clans/state";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "กำลังเพิ่ม…" : "เพิ่มสมาชิก"}
    </Button>
  );
}

export function AddMemberForm({ clanSlug }: { clanSlug: string }) {
  const [state, action] = useActionState(addClanMemberAction, initialClanState);
  const error = state.fieldErrors?.characterName?.[0];

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="clanSlug" value={clanSlug} />
      <label className="block text-sm font-medium">
        ชื่อตัวละคร
        <input
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
          className="rounded-md bg-red-50 p-3 text-sm text-red-800 dark:bg-red-950 dark:text-red-200"
          role="alert"
        >
          {state.message}
        </p>
      )}
      <SubmitButton />
    </form>
  );
}
