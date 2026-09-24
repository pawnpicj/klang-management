"use client";

import Image from "next/image";
import { Archive, Save, Star } from "lucide-react";
import { useActionState, useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import { initialClanState } from "@/features/clans/state";
import {
  assetImageMaxBytes,
  assetImageMimeTypes,
  getAssetImageValidationError,
} from "@/features/inventory/image";
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

function AssetImageField({ currentUrl }: { currentUrl?: string | null }) {
  const [previewUrl, setPreviewUrl] = useState(currentUrl ?? null);
  const [fileError, setFileError] = useState<string | null>(null);
  const objectUrl = useRef<string | null>(null);

  useEffect(
    () => () => {
      if (objectUrl.current) URL.revokeObjectURL(objectUrl.current);
    },
    [],
  );

  function previewImage(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0];
    if (!file) return;
    const error = getAssetImageValidationError(file);
    if (error) {
      event.currentTarget.value = "";
      setFileError(error);
      return;
    }
    if (objectUrl.current) URL.revokeObjectURL(objectUrl.current);
    objectUrl.current = URL.createObjectURL(file);
    setPreviewUrl(objectUrl.current);
    setFileError(null);
  }

  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium">
        รูปภาพ
        <input
          name="image"
          type="file"
          accept={assetImageMimeTypes.join(",")}
          onChange={previewImage}
          className={`${inputClass} cursor-pointer py-1.5 file:mr-3 file:rounded file:border-0 file:bg-emerald-100 file:px-3 file:py-1 file:text-sm file:font-medium file:text-emerald-900`}
          aria-invalid={Boolean(fileError)}
        />
      </label>
      <p className="text-muted-foreground text-xs">
        เลือกรูป JPEG, PNG, WebP หรือ GIF ขนาดไม่เกิน{" "}
        {assetImageMaxBytes / 1024 / 1024} MB
      </p>
      {fileError && (
        <p className="text-sm text-red-600" role="alert">
          {fileError}
        </p>
      )}
      {previewUrl && (
        <div className="border-input relative size-28 overflow-hidden rounded-lg border">
          <Image
            src={previewUrl}
            alt="ตัวอย่างรูป Asset"
            fill
            sizes="112px"
            className="object-cover"
            unoptimized
          />
        </div>
      )}
    </div>
  );
}

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
        จำนวนที่ต้องส่ง
        <input
          name="requiredQuantity"
          type="number"
          min="0"
          step="any"
          required
          defaultValue="0"
          className={inputClass}
        />
      </label>
      <div className="sm:col-span-2 lg:col-span-4">
        <AssetImageField />
      </div>
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
  imagePreviewUrl,
  canManage,
}: {
  clanSlug: string;
  canManage: boolean;
  imagePreviewUrl: string | null;
  asset: {
    id: string;
    name: string;
    required_quantity: number;
    is_active: boolean;
  };
}) {
  const [state, action] = useActionState(updateAssetAction, initialClanState);
  if (!canManage || !asset.is_active) return null;
  return (
    <div className="border-input mt-5 border-t pt-5">
      <form
        action={action}
        className="grid items-start gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)]"
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
          จำนวนที่ต้องส่ง
          <input
            name="requiredQuantity"
            type="number"
            min="0"
            step="any"
            required
            defaultValue={asset.required_quantity}
            className={inputClass}
          />
        </label>
        <AssetImageField currentUrl={imagePreviewUrl} />
        {state.message && (
          <p className="text-sm text-red-600 sm:col-span-2" role="alert">
            {state.message}
          </p>
        )}
        <div className="flex flex-wrap items-center justify-end gap-2 sm:col-span-2">
          <Button
            type="submit"
            variant="destructive"
            formAction={deactivateAssetAction}
            onClick={(event) => {
              if (!window.confirm(`ยืนยันปิดใช้งาน ${asset.name}?`))
                event.preventDefault();
            }}
          >
            <Archive className="size-4" aria-hidden="true" /> ปิดใช้งาน
          </Button>
          <PendingButton>
            <Save className="size-4" aria-hidden="true" /> บันทึก
          </PendingButton>
        </div>
      </form>
    </div>
  );
}
