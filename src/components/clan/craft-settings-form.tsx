"use client";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import { saveCraftSettingsAction } from "@/features/crafting/actions";
import { initialClanState } from "@/features/clans/state";
function SaveButton({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={disabled || pending}>
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
  const [state, action] = useActionState(
    saveCraftSettingsAction,
    initialClanState,
  );
  return (
    <form action={action} className="space-y-5">
      <input type="hidden" name="clanSlug" value={clanSlug} />
      <label className="block text-sm font-medium">
        คลังสำหรับตรวจจำนวนที่มี
        <select
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
      <p className="text-muted-foreground text-sm">
        ใช้คลังนี้ตรวจจำนวนวัตถุดิบสำหรับสูตรของ Clan/Gang
      </p>
      {!warehouses.length && (
        <p className="text-sm text-amber-700">
          ยังไม่มีคลังที่เปิดใช้งาน กรุณาสร้างคลังก่อน
        </p>
      )}
      {state.message && (
        <p role="alert" className="text-sm text-red-600">
          {state.message}
        </p>
      )}
      <SaveButton disabled={!warehouses.length} />
    </form>
  );
}
