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
import { htmlId } from "@/lib/html-id";
import { useId as useHtmlId } from "react";

function PendingButton({
  children,
  variant = "default",
}: {
  children: React.ReactNode;
  variant?: "default" | "warning" | "destructive" | "outline";
}) {
  const htmlIdPrefix = useHtmlId();

  const { pending } = useFormStatus();
  return (
    <Button
      id={htmlId("clan_pending_button_button", htmlIdPrefix)}
      type="submit"
      variant={variant}
      disabled={pending}
    >
      {pending ? "กำลังบันทึก…" : children}
    </Button>
  );
}
const inputClass =
  "border-input bg-background focus-visible:ring-ring mt-1 h-10 w-full rounded-md border px-3 outline-none focus-visible:ring-2";

function AssetImageField({ currentUrl }: { currentUrl?: string | null }) {
  const htmlIdPrefix = useHtmlId();

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
      <label
        id={htmlId("clan_asset_image_field_label", htmlIdPrefix)}
        className="block text-sm font-medium"
      >
        รูปภาพ
        <input
          id={htmlId("clan_asset_image_field_image", htmlIdPrefix)}
          name="image"
          type="file"
          accept={assetImageMimeTypes.join(",")}
          onChange={previewImage}
          className={`${inputClass} cursor-pointer py-1.5 file:mr-3 file:rounded file:border-0 file:bg-emerald-100 file:px-3 file:py-1 file:text-sm file:font-medium file:text-emerald-900`}
          aria-invalid={Boolean(fileError)}
        />
      </label>
      <p
        id={htmlId(
          "clan_asset_image_field_jpeg_png_web_p_gif_mb",
          htmlIdPrefix,
        )}
        className="text-muted-foreground text-xs"
      >
        เลือกรูป JPEG, PNG, WebP หรือ GIF ขนาดไม่เกิน{" "}
        {assetImageMaxBytes / 1024 / 1024} MB
      </p>
      {fileError && (
        <p
          id={htmlId("clan_asset_image_field_p", htmlIdPrefix)}
          className="text-sm text-red-600"
          role="alert"
        >
          {fileError}
        </p>
      )}
      {previewUrl && (
        <div className="border-input relative size-28 overflow-hidden rounded-lg border">
          <Image
            id={htmlId("clan_asset_image_field_image_2", htmlIdPrefix)}
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
  const htmlIdPrefix = useHtmlId();

  const [state, action] = useActionState(
    createWarehouseAction,
    initialClanState,
  );
  return (
    <form
      id={htmlId("clan_create_warehouse_form_form", htmlIdPrefix)}
      action={action}
      className="grid gap-4 sm:grid-cols-[1fr_1.5fr_auto] sm:items-end"
    >
      <input
        id={htmlId("clan_create_warehouse_form_clan_slug", htmlIdPrefix)}
        type="hidden"
        name="clanSlug"
        value={clanSlug}
      />
      <label
        id={htmlId("clan_create_warehouse_form_warehouse", htmlIdPrefix)}
        className="text-sm font-medium"
      >
        ชื่อ Warehouse
        <input
          id={htmlId("clan_create_warehouse_form_name", htmlIdPrefix)}
          name="name"
          required
          maxLength={100}
          className={inputClass}
        />
      </label>
      <label
        id={htmlId("clan_create_warehouse_form_label", htmlIdPrefix)}
        className="text-sm font-medium"
      >
        คำอธิบาย
        <input
          id={htmlId("clan_create_warehouse_form_description", htmlIdPrefix)}
          name="description"
          maxLength={500}
          className={inputClass}
        />
      </label>
      <PendingButton>สร้าง Warehouse</PendingButton>
      {state.message && (
        <p
          id={htmlId("clan_create_warehouse_form_state_message", htmlIdPrefix)}
          className="text-sm text-red-600 sm:col-span-3"
          role="alert"
        >
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
  const htmlIdPrefix = useHtmlId();

  const [state, action] = useActionState(
    updateWarehouseAction,
    initialClanState,
  );
  if (!canEdit || !warehouse.is_active) return null;
  return (
    <div className="mt-4 space-y-3">
      <form
        id={htmlId("clan_warehouse_actions_form", htmlIdPrefix)}
        action={action}
        className="grid gap-3 sm:grid-cols-[1fr_1.5fr_auto] sm:items-end"
      >
        <input
          id={htmlId("clan_warehouse_actions_clan_slug", htmlIdPrefix)}
          type="hidden"
          name="clanSlug"
          value={clanSlug}
        />
        <input
          id={htmlId("clan_warehouse_actions_warehouse_id", htmlIdPrefix)}
          type="hidden"
          name="warehouseId"
          value={warehouse.id}
        />
        <label
          id={htmlId("clan_warehouse_actions_label", htmlIdPrefix)}
          className="text-sm font-medium"
        >
          ชื่อ
          <input
            id={htmlId("clan_warehouse_actions_name", htmlIdPrefix)}
            name="name"
            defaultValue={warehouse.name}
            required
            maxLength={100}
            className={inputClass}
          />
        </label>
        <label
          id={htmlId("clan_warehouse_actions_label_2", htmlIdPrefix)}
          className="text-sm font-medium"
        >
          คำอธิบาย
          <input
            id={htmlId("clan_warehouse_actions_description", htmlIdPrefix)}
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
          <p
            id={htmlId("clan_warehouse_actions_state_message", htmlIdPrefix)}
            className="text-sm text-red-600 sm:col-span-3"
            role="alert"
          >
            {state.message}
          </p>
        )}
      </form>
      <div className="flex flex-wrap gap-2">
        {!warehouse.is_default && (
          <form
            id={htmlId("clan_warehouse_actions_form_2", htmlIdPrefix)}
            action={setDefaultWarehouseAction}
          >
            <input
              id={htmlId("clan_warehouse_actions_clan_slug_2", htmlIdPrefix)}
              type="hidden"
              name="clanSlug"
              value={clanSlug}
            />
            <input
              id={htmlId("clan_warehouse_actions_warehouse_id_2", htmlIdPrefix)}
              type="hidden"
              name="warehouseId"
              value={warehouse.id}
            />
            <PendingButton variant="warning">
              <Star className="size-4" aria-hidden="true" /> ตั้งเป็น Default
            </PendingButton>
          </form>
        )}
        {!warehouse.is_default && (
          <form
            id={htmlId("clan_warehouse_actions_form_3", htmlIdPrefix)}
            action={deactivateWarehouseAction}
            onSubmit={(event) => {
              if (!window.confirm(`ยืนยันปิดใช้งาน ${warehouse.name}?`))
                event.preventDefault();
            }}
          >
            <input
              id={htmlId("clan_warehouse_actions_clan_slug_3", htmlIdPrefix)}
              type="hidden"
              name="clanSlug"
              value={clanSlug}
            />
            <input
              id={htmlId("clan_warehouse_actions_warehouse_id_3", htmlIdPrefix)}
              type="hidden"
              name="warehouseId"
              value={warehouse.id}
            />
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
  const htmlIdPrefix = useHtmlId();

  const [state, action] = useActionState(createAssetAction, initialClanState);
  return (
    <form
      id={htmlId("clan_create_asset_form_form", htmlIdPrefix)}
      action={action}
      className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
    >
      <input
        id={htmlId("clan_create_asset_form_clan_slug", htmlIdPrefix)}
        type="hidden"
        name="clanSlug"
        value={clanSlug}
      />
      <label
        id={htmlId("clan_create_asset_form_code", htmlIdPrefix)}
        className="text-sm font-medium"
      >
        Code
        <input
          id={htmlId("clan_create_asset_form_code_2", htmlIdPrefix)}
          name="code"
          required
          maxLength={50}
          className={inputClass}
        />
      </label>
      <label
        id={htmlId("clan_create_asset_form_asset", htmlIdPrefix)}
        className="text-sm font-medium"
      >
        ชื่อ Asset
        <input
          id={htmlId("clan_create_asset_form_name", htmlIdPrefix)}
          name="name"
          required
          maxLength={100}
          className={inputClass}
        />
      </label>
      <label
        id={htmlId("clan_create_asset_form_label", htmlIdPrefix)}
        className="text-sm font-medium"
      >
        ประเภท
        <select
          id={htmlId("clan_create_asset_form_asset_type", htmlIdPrefix)}
          name="assetType"
          className={inputClass}
        >
          <option value="ITEM">Item</option>
          <option value="CURRENCY">Currency</option>
        </select>
      </label>
      <label
        id={htmlId("clan_create_asset_form_label_2", htmlIdPrefix)}
        className="text-sm font-medium"
      >
        หน่วย
        <input
          id={htmlId("clan_create_asset_form_unit", htmlIdPrefix)}
          name="unit"
          required
          maxLength={30}
          placeholder="ชิ้น, coin"
          className={inputClass}
        />
      </label>
      <label
        id={htmlId("clan_create_asset_form_label_3", htmlIdPrefix)}
        className="text-sm font-medium"
      >
        จำนวนที่ต้องส่ง
        <input
          id={htmlId("clan_create_asset_form_required_quantity", htmlIdPrefix)}
          name="requiredQuantity"
          type="number"
          min="0"
          step="any"
          required
          defaultValue="0"
          className={inputClass}
        />
      </label>
      <label
        id={htmlId("clan_create_asset_form_label_4", htmlIdPrefix)}
        className="text-sm font-medium"
      >
        แจ้งเตือนเมื่อเหลือต่ำกว่า
        <input
          id={htmlId(
            "clan_create_asset_form_low_stock_threshold",
            htmlIdPrefix,
          )}
          name="lowStockThreshold"
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
          id={htmlId("clan_create_asset_form_state_message", htmlIdPrefix)}
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
    low_stock_threshold: number;
    is_active: boolean;
  };
}) {
  const htmlIdPrefix = useHtmlId();

  const [state, action] = useActionState(updateAssetAction, initialClanState);
  if (!canManage || !asset.is_active) return null;
  return (
    <div className="border-input mt-5 border-t pt-5">
      <form
        id={htmlId("clan_asset_actions_form", htmlIdPrefix)}
        action={action}
        className="grid items-start gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)]"
      >
        <input
          id={htmlId("clan_asset_actions_clan_slug", htmlIdPrefix)}
          type="hidden"
          name="clanSlug"
          value={clanSlug}
        />
        <input
          id={htmlId("clan_asset_actions_asset_id", htmlIdPrefix)}
          type="hidden"
          name="assetId"
          value={asset.id}
        />
        <label
          id={htmlId("clan_asset_actions_label", htmlIdPrefix)}
          className="text-sm font-medium"
        >
          ชื่อ
          <input
            id={htmlId("clan_asset_actions_name", htmlIdPrefix)}
            name="name"
            defaultValue={asset.name}
            required
            maxLength={100}
            className={inputClass}
          />
        </label>
        <label
          id={htmlId("clan_asset_actions_label_2", htmlIdPrefix)}
          className="text-sm font-medium"
        >
          จำนวนที่ต้องส่ง
          <input
            id={htmlId("clan_asset_actions_required_quantity", htmlIdPrefix)}
            name="requiredQuantity"
            type="number"
            min="0"
            step="any"
            required
            defaultValue={asset.required_quantity}
            className={inputClass}
          />
        </label>
        <label
          id={htmlId("clan_asset_actions_label_3", htmlIdPrefix)}
          className="text-sm font-medium"
        >
          แจ้งเตือนเมื่อเหลือต่ำกว่า
          <input
            id={htmlId("clan_asset_actions_low_stock_threshold", htmlIdPrefix)}
            name="lowStockThreshold"
            type="number"
            min="0"
            step="any"
            required
            defaultValue={asset.low_stock_threshold}
            className={inputClass}
          />
        </label>
        <AssetImageField currentUrl={imagePreviewUrl} />
        {state.message && (
          <p
            id={htmlId("clan_asset_actions_state_message", htmlIdPrefix)}
            className="text-sm text-red-600 sm:col-span-2"
            role="alert"
          >
            {state.message}
          </p>
        )}
        <div className="flex flex-wrap items-center justify-end gap-2 sm:col-span-2">
          <Button
            id={htmlId("clan_asset_actions_button", htmlIdPrefix)}
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
