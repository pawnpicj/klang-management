"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import { createClanAction } from "@/features/clans/actions";
import { initialClanState } from "@/features/clans/state";
import { htmlId } from "@/lib/html-id";
import { useId as useHtmlId } from "react";

const inputClass =
  "border-input bg-background focus-visible:ring-ring mt-1 h-11 w-full rounded-md border px-3 text-base outline-none focus-visible:ring-2";

function SubmitButton() {
  const htmlIdPrefix = useHtmlId();

  const { pending } = useFormStatus();
  return (
    <Button
      id={htmlId("clan_submit_button_button", htmlIdPrefix)}
      className="w-full"
      type="submit"
      disabled={pending}
    >
      {pending ? "กำลังสร้าง…" : "สร้าง Clan/Gang"}
    </Button>
  );
}

export function CreateClanForm() {
  const htmlIdPrefix = useHtmlId();

  const [state, action] = useActionState(createClanAction, initialClanState);

  function errorFor(name: string) {
    return state.fieldErrors?.[name]?.[0];
  }

  return (
    <form
      id={htmlId("clan_create_clan_form_form", htmlIdPrefix)}
      action={action}
      className="space-y-5"
    >
      <label
        id={htmlId("clan_create_clan_form_clan_gang", htmlIdPrefix)}
        className="block text-sm font-medium"
      >
        ชื่อ Clan/Gang
        <input
          id={htmlId("clan_create_clan_form_name", htmlIdPrefix)}
          className={inputClass}
          name="name"
          autoComplete="organization"
          maxLength={100}
          required
          aria-invalid={Boolean(errorFor("name"))}
        />
        {errorFor("name") && (
          <span className="mt-1 block text-sm text-red-600">
            {errorFor("name")}
          </span>
        )}
      </label>

      <label
        id={htmlId("clan_create_clan_form_slug", htmlIdPrefix)}
        className="block text-sm font-medium"
      >
        Slug
        <input
          id={htmlId("clan_create_clan_form_slug_2", htmlIdPrefix)}
          className={inputClass}
          name="slug"
          inputMode="url"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          maxLength={80}
          placeholder="เช่น black-dragon"
          pattern="[a-z0-9]+(-[a-z0-9]+)*"
          required
          aria-invalid={Boolean(errorFor("slug"))}
        />
        <span className="text-muted-foreground mt-1 block text-xs">
          ใช้ใน URL และเปลี่ยนภายหลังไม่ได้
        </span>
        {errorFor("slug") && (
          <span className="mt-1 block text-sm text-red-600">
            {errorFor("slug")}
          </span>
        )}
      </label>

      <label
        id={htmlId("clan_create_clan_form_label", htmlIdPrefix)}
        className="block text-sm font-medium"
      >
        ประเภท
        <select
          id={htmlId("clan_create_clan_form_type", htmlIdPrefix)}
          className={inputClass}
          name="type"
          defaultValue="CLAN"
          required
          aria-invalid={Boolean(errorFor("type"))}
        >
          <option value="CLAN">Clan</option>
          <option value="GANG">Gang</option>
        </select>
        {errorFor("type") && (
          <span className="mt-1 block text-sm text-red-600">
            {errorFor("type")}
          </span>
        )}
      </label>

      <label
        id={htmlId("clan_create_clan_form_label_2", htmlIdPrefix)}
        className="block text-sm font-medium"
      >
        ชื่อตัวละครของคุณ
        <input
          id={htmlId("clan_create_clan_form_character_name", htmlIdPrefix)}
          className={inputClass}
          name="characterName"
          autoComplete="nickname"
          maxLength={100}
          required
          aria-invalid={Boolean(errorFor("characterName"))}
        />
        {errorFor("characterName") && (
          <span className="mt-1 block text-sm text-red-600">
            {errorFor("characterName")}
          </span>
        )}
      </label>

      {state.message && (
        <p
          id={htmlId("clan_create_clan_form_state_message", htmlIdPrefix)}
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
