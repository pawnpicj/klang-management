"use client";

import { Archive, Save, Star } from "lucide-react";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import { initialClanState } from "@/features/clans/state";
import {
  createAssetAction,
  createWarehouseAction,
  deactivateAssetAction,
  deactivateWarehouseAction,
  setDefaultWarehouseAction,
  updateAssetAction,
  updateWarehouseAction,
} from "@/features/inventory/actions";

function PendingButton({
  children,
  variant = "default",
}: {
  children: React.ReactNode;
  variant?: "default" | "warning" | "destructive" | "outline";
}) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant={variant} disabled={pending}>
      {pending ? "กำลังบันทึก…" : children}
    </Button>
  );
}
const inputClass =
  "border-input bg-background focus-visible:ring-ring mt-1 h-10 w-full rounded-md border px-3 outline-none focus-visible:ring-2";

export function CreateWarehouseForm({ clanSlug }: { clanSlug: string }) {
  const [state, action] = useActionState(
    createWarehouseAction,
    initialClanState,
  );
  return (
    <form
      action={action}
      className="grid gap-4 sm:grid-cols-[1fr_1.5fr_auto] sm:items-end"
    >
      <input type="hidden" name="clanSlug" value={clanSlug} />
      <label className="text-sm font-medium">
        ชื่อ Warehouse
        <input name="name" required maxLength={100} className={inputClass} />
      </label>
      <label className="text-sm font-medium">
        คำอธิบาย
        <input name="description" maxLength={500} className={inputClass} />
      </label>
      <PendingButton>สร้าง Warehouse</PendingButton>
      {state.message && (
        <p className="text-sm text-red-600 sm:col-span-3" role="alert">
          {state.message}
        </p>
      )}
    </form>
  );
}

export function WarehouseActions({
  clanSlug,
  warehouse,
  canEdit,
}: {
  clanSlug: string;
  canEdit: boolean;
  warehouse: {
    id: string;
    name: string;
    description: string | null;
    is_default: boolean;
    is_active: boolean;
  };
}) {
  const [state, action] = useActionState(
    updateWarehouseAction,
    initialClanState,
  );
  if (!canEdit || !warehouse.is_active) return null;
  return (
    <div className="mt-4 space-y-3">
      <form
        action={action}
        className="grid gap-3 sm:grid-cols-[1fr_1.5fr_auto] sm:items-end"
      >
        <input type="hidden" name="clanSlug" value={clanSlug} />
        <input type="hidden" name="warehouseId" value={warehouse.id} />
        <label className="text-sm font-medium">
          ชื่อ
          <input
            name="name"
            defaultValue={warehouse.name}
            required
            maxLength={100}
            className={inputClass}
          />
        </label>
        <label className="text-sm font-medium">
          คำอธิบาย
          <input
            name="description"
            defaultValue={warehouse.description ?? ""}
            maxLength={500}
            className={inputClass}
          />
        </label>
        <PendingButton>
          <Save className="size-4" aria-hidden="true" /> บันทึก
        </PendingButton>
        {state.message && (
          <p className="text-sm text-red-600 sm:col-span-3" role="alert">
            {state.message}
          </p>
        )}
      </form>
      <div className="flex flex-wrap gap-2">
        {!warehouse.is_default && (
          <form action={setDefaultWarehouseAction}>
            <input type="hidden" name="clanSlug" value={clanSlug} />
            <input type="hidden" name="warehouseId" value={warehouse.id} />
            <PendingButton variant="warning">
              <Star className="size-4" aria-hidden="true" /> ตั้งเป็น Default
            </PendingButton>
          </form>
        )}
        {!warehouse.is_default && (
          <form
            action={deactivateWarehouseAction}
            onSubmit={(event) => {
              if (!window.confirm(`ยืนยันปิดใช้งาน ${warehouse.name}?`))
                event.preventDefault();
            }}
          >
            <input type="hidden" name="clanSlug" value={clanSlug} />
            <input type="hidden" name="warehouseId" value={warehouse.id} />
            <PendingButton variant="destructive">
              <Archive className="size-4" aria-hidden="true" /> ปิดใช้งาน
            </PendingButton>
          </form>
        )}
      </div>
    </div>
  );
}

export function CreateAssetForm({ clanSlug }: { clanSlug: string }) {
  const [state, action] = useActionState(createAssetAction, initialClanState);
  return (
    <form action={action} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <input type="hidden" name="clanSlug" value={clanSlug} />
      <label className="text-sm font-medium">
        Code
        <input name="code" required maxLength={50} className={inputClass} />
      </label>
      <label className="text-sm font-medium">
        ชื่อ Asset
        <input name="name" required maxLength={100} className={inputClass} />
      </label>
      <label className="text-sm font-medium">
        ประเภท
        <select name="assetType" className={inputClass}>
          <option value="ITEM">Item</option>
          <option value="CURRENCY">Currency</option>
        </select>
      </label>
      <label className="text-sm font-medium">
        หน่วย
        <input
          name="unit"
          required
          maxLength={30}
          placeholder="ชิ้น, coin"
          className={inputClass}
        />
      </label>
      <label className="text-sm font-medium">
        ตำแหน่งทศนิยม
        <select name="decimalPlaces" className={inputClass}>
          {[0, 1, 2, 3, 4].map((value) => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
        </select>
      </label>
      <label className="text-sm font-medium sm:col-span-2">
        URL รูปภาพ
        <input
          name="imageUrl"
          type="url"
          maxLength={2048}
          className={inputClass}
        />
      </label>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="allowNegative" className="size-4" />{" "}
        อนุญาตยอดติดลบ
      </label>
      <div className="flex items-end">
        <PendingButton>สร้าง Asset</PendingButton>
      </div>
      {state.message && (
        <p
          className="text-sm text-red-600 sm:col-span-2 lg:col-span-4"
          role="alert"
        >
          {state.message}
        </p>
      )}
    </form>
  );
}

export function AssetActions({
  clanSlug,
  asset,
  canManage,
}: {
  clanSlug: string;
  canManage: boolean;
  asset: {
    id: string;
    name: string;
    image_url: string | null;
    is_active: boolean;
  };
}) {
  const [state, action] = useActionState(updateAssetAction, initialClanState);
  if (!canManage || !asset.is_active) return null;
  return (
    <div className="mt-4 space-y-3">
      <form
        action={action}
        className="grid gap-3 sm:grid-cols-[1fr_1.5fr_auto] sm:items-end"
      >
        <input type="hidden" name="clanSlug" value={clanSlug} />
        <input type="hidden" name="assetId" value={asset.id} />
        <label className="text-sm font-medium">
          ชื่อ
          <input
            name="name"
            defaultValue={asset.name}
            required
            maxLength={100}
            className={inputClass}
          />
        </label>
        <label className="text-sm font-medium">
          URL รูปภาพ
          <input
            name="imageUrl"
            type="url"
            defaultValue={asset.image_url ?? ""}
            maxLength={2048}
            className={inputClass}
          />
        </label>
        <PendingButton>
          <Save className="size-4" aria-hidden="true" /> บันทึก
        </PendingButton>
        {state.message && (
          <p className="text-sm text-red-600 sm:col-span-3" role="alert">
            {state.message}
          </p>
        )}
      </form>
      <form
        action={deactivateAssetAction}
        onSubmit={(event) => {
          if (!window.confirm(`ยืนยันปิดใช้งาน ${asset.name}?`))
            event.preventDefault();
        }}
      >
        <input type="hidden" name="clanSlug" value={clanSlug} />
        <input type="hidden" name="assetId" value={asset.id} />
        <PendingButton variant="destructive">
          <Archive className="size-4" aria-hidden="true" /> ปิดใช้งาน
        </PendingButton>
      </form>
    </div>
  );
}
