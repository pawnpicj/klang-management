"use client";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import { saveCraftSettingsAction } from "@/features/crafting/actions";
import { initialClanState } from "@/features/clans/state";
import { htmlId } from "@/lib/html-id";
import { useId as useHtmlId } from "react";

function SaveButton({ disabled }: { disabled: boolean }) {
  const htmlIdPrefix = useHtmlId();

  const { pending } = useFormStatus();
  return (
    <Button
      id={htmlId("clan_save_button_button", htmlIdPrefix)}
      type="submit"
      disabled={disabled || pending}
    >
      {pending ? "กำลังบันทึก…" : "บันทึกการตั้งค่า"}
    </Button>
  );
}
export function CraftSettingsForm({
  clanSlug,
  warehouses,
  selectedWarehouseId,
}: {
  clanSlug: string;
  warehouses: { id: string; name: string }[];
  selectedWarehouseId: string;
}) {
  const htmlIdPrefix = useHtmlId();

  const [state, action] = useActionState(
    saveCraftSettingsAction,
    initialClanState,
  );
  return (
    <form
      id={htmlId("clan_craft_settings_form_form", htmlIdPrefix)}
      action={action}
      className="space-y-5"
    >
      <input
        id={htmlId("clan_craft_settings_form_clan_slug", htmlIdPrefix)}
        type="hidden"
        name="clanSlug"
        value={clanSlug}
      />
      <label
        id={htmlId("clan_craft_settings_form_label", htmlIdPrefix)}
        className="block text-sm font-medium"
      >
        คลังสำหรับตรวจจำนวนที่มี
        <select
          id={htmlId("clan_craft_settings_form_warehouse_id", htmlIdPrefix)}
          name="warehouseId"
          defaultValue={selectedWarehouseId}
          required
          disabled={!warehouses.length}
          className="border-input bg-background focus-visible:ring-ring mt-2 h-10 w-full rounded-md border px-3 focus-visible:ring-2"
        >
          <option value="" disabled>
            เลือกคลัง
          </option>
          {warehouses.map((warehouse) => (
            <option key={warehouse.id} value={warehouse.id}>
              {warehouse.name}
            </option>
          ))}
        </select>
      </label>
      <p
        id={htmlId("clan_craft_settings_form_clan_gang", htmlIdPrefix)}
        className="text-muted-foreground text-sm"
      >
        ใช้คลังนี้ตรวจจำนวนวัตถุดิบสำหรับสูตรของ Clan/Gang
      </p>
      {!warehouses.length && (
        <p
          id={htmlId("clan_craft_settings_form_p", htmlIdPrefix)}
          className="text-sm text-amber-700 dark:text-amber-200"
        >
          ยังไม่มีคลังที่เปิดใช้งาน กรุณาสร้างคลังก่อน
        </p>
      )}
      {state.message && (
        <p
          id={htmlId("clan_craft_settings_form_state_message", htmlIdPrefix)}
          role="alert"
          className="text-sm text-red-600"
        >
          {state.message}
        </p>
      )}
      <SaveButton disabled={!warehouses.length} />
    </form>
  );
}
