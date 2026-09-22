"use client";

import { Plus, Trash2, Upload } from "lucide-react";
import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import { initialClanState } from "@/features/clans/state";
import {
  createAndPostTransactionAction,
  uploadEvidenceAction,
  voidTransactionAction,
} from "@/features/transactions/actions";

type TransactionType = "DEPOSIT" | "WITHDRAW" | "TRANSFER";
type Asset = {
  id: string;
  code: string;
  name: string;
  unit: string;
  decimal_places: number;
};
type Warehouse = { id: string; name: string; is_default: boolean };
type Member = { id: string; character_name: string };

const fieldClass =
  "border-input bg-background focus-visible:ring-ring mt-1 h-10 w-full rounded-md border px-3 outline-none focus-visible:ring-2";

function SubmitButton({ children }: { children: React.ReactNode }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "กำลังบันทึก…" : children}
    </Button>
  );
}

export function TransactionForm({
  clanSlug,
  transactionType,
  availableTypes,
  clientRequestId,
  assets,
  warehouses,
  members,
}: {
  clanSlug: string;
  transactionType: TransactionType;
  availableTypes?: TransactionType[];
  clientRequestId: string;
  assets: Asset[];
  warehouses: Warehouse[];
  members: Member[];
}) {
  const [state, action] = useActionState(
    createAndPostTransactionAction,
    initialClanState,
  );
  const [rows, setRows] = useState([0]);
  const [selectedType, setSelectedType] = useState(transactionType);
  const title =
    selectedType === "DEPOSIT"
      ? "รับเข้าคลัง"
      : selectedType === "WITHDRAW"
        ? "นำออกจากคลัง"
        : "ย้ายระหว่างคลัง";
  return (
    <form
      action={action}
      className="space-y-6"
      onSubmit={(event) => {
        if (!window.confirm(`ยืนยันบันทึกรายการ ${title}?`))
          event.preventDefault();
      }}
    >
      <input type="hidden" name="clanSlug" value={clanSlug} />
      <input type="hidden" name="transactionType" value={selectedType} />
      <input type="hidden" name="clientRequestId" value={clientRequestId} />
      <div className="grid gap-4 sm:grid-cols-2">
        {availableTypes && availableTypes.length > 1 && (
          <label className="text-sm font-medium">
            ต้องการทำรายการอะไร
            <select
              value={selectedType}
              onChange={(event) =>
                setSelectedType(event.target.value as TransactionType)
              }
              className={fieldClass}
            >
              {availableTypes.includes("DEPOSIT") && (
                <option value="DEPOSIT">รับของเข้าคลัง</option>
              )}
              {availableTypes.includes("WITHDRAW") && (
                <option value="WITHDRAW">นำของออกจากคลัง</option>
              )}
              {availableTypes.includes("TRANSFER") && (
                <option value="TRANSFER">ย้ายของระหว่างคลัง</option>
              )}
            </select>
          </label>
        )}
        {selectedType !== "DEPOSIT" && (
          <label className="text-sm font-medium">
            นำออกจากคลัง
            <select name="fromWarehouseId" required className={fieldClass}>
              <option value="">เลือกคลัง</option>
              {warehouses.map((warehouse) => (
                <option key={warehouse.id} value={warehouse.id}>
                  {warehouse.name}
                  {warehouse.is_default ? " (Default)" : ""}
                </option>
              ))}
            </select>
          </label>
        )}
        {selectedType === "TRANSFER" && (
          <label className="text-sm font-medium">
            ย้ายไปคลัง
            <select name="toWarehouseId" required className={fieldClass}>
              <option value="">เลือกคลัง</option>
              {warehouses.map((warehouse) => (
                <option key={warehouse.id} value={warehouse.id}>
                  {warehouse.name}
                  {warehouse.is_default ? " (Default)" : ""}
                </option>
              ))}
            </select>
          </label>
        )}
        {selectedType === "DEPOSIT" && (
          <div className="bg-muted flex items-center rounded-md p-3 text-sm">
            รับเข้า:{" "}
            {warehouses.find((warehouse) => warehouse.is_default)?.name ??
              "Default Warehouse"}
          </div>
        )}
      </div>

      <fieldset className="space-y-3">
        <div className="flex items-center justify-between">
          <legend className="font-semibold">สินค้า</legend>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() =>
              setRows((current) => [...current, Math.max(...current) + 1])
            }
          >
            <Plus className="size-4" /> เพิ่มสินค้าอื่น
          </Button>
        </div>
        {rows.map((row, index) => (
          <div
            key={row}
            className="border-input grid gap-3 rounded-lg border p-4 sm:grid-cols-[2fr_1fr_auto] sm:items-end"
          >
            <label className="text-sm font-medium">
              สินค้า
              <select name="assetId" required className={fieldClass}>
                <option value="">เลือกสินค้า</option>
                {assets.map((asset) => (
                  <option key={asset.id} value={asset.id}>
                    {asset.code} · {asset.name} ({asset.unit})
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm font-medium">
              จำนวน
              <input
                name="quantity"
                type="number"
                required
                min="0.0001"
                step="0.0001"
                className={fieldClass}
              />
            </label>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              className="size-10 p-0"
              disabled={rows.length === 1}
              onClick={() =>
                setRows((current) => current.filter((id) => id !== row))
              }
              aria-label={`ลบรายการที่ ${index + 1}`}
            >
              <Trash2 className="size-4" />
            </Button>
          </div>
        ))}
      </fieldset>
      <details className="border-input rounded-lg border p-4">
        <summary className="cursor-pointer text-sm font-medium">
          ข้อมูลเพิ่มเติม (ไม่บังคับ)
        </summary>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="text-sm font-medium">
            สมาชิกที่เกี่ยวข้อง
            <select name="contributorMemberId" className={fieldClass}>
              <option value="">ไม่ระบุ</option>
              {members.map((member) => (
                <option key={member.id} value={member.id}>
                  {member.character_name}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm font-medium sm:col-span-2">
            หมายเหตุ
            <textarea
              name="note"
              maxLength={1000}
              rows={2}
              className="border-input bg-background focus-visible:ring-ring mt-1 w-full rounded-md border p-3 outline-none focus-visible:ring-2"
            />
          </label>
        </div>
      </details>
      {state.message && (
        <p
          className="rounded-md bg-red-50 p-3 text-sm text-red-700"
          role="alert"
        >
          {state.message}
        </p>
      )}
      <SubmitButton>บันทึก{title}</SubmitButton>
    </form>
  );
}

export function EvidenceUploadForm({
  clanSlug,
  transactionId,
}: {
  clanSlug: string;
  transactionId: string;
}) {
  const [state, action] = useActionState(
    uploadEvidenceAction,
    initialClanState,
  );
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="clanSlug" value={clanSlug} />
      <input type="hidden" name="transactionId" value={transactionId} />
      <label className="block text-sm font-medium">
        ไฟล์หลักฐาน
        <input
          name="evidence"
          type="file"
          required
          accept="image/jpeg,image/png,image/webp,application/pdf"
          className="border-input mt-1 block w-full rounded-md border p-2 text-sm"
        />
      </label>
      <p className="text-muted-foreground text-xs">
        JPG, PNG, WebP หรือ PDF ไม่เกิน 10 MB
      </p>
      {state.message && (
        <p className="text-sm text-red-600" role="alert">
          {state.message}
        </p>
      )}
      <SubmitButton>
        <Upload className="size-4" /> อัปโหลดหลักฐาน
      </SubmitButton>
    </form>
  );
}

export function VoidTransactionButton({
  clanSlug,
  transactionId,
}: {
  clanSlug: string;
  transactionId: string;
}) {
  return (
    <form
      action={voidTransactionAction}
      onSubmit={(event) => {
        if (
          !window.confirm(
            "ยืนยัน Void รายการนี้? ระบบจะสร้าง Reversal และไม่สามารถย้อนกลับได้",
          )
        )
          event.preventDefault();
      }}
    >
      <input type="hidden" name="clanSlug" value={clanSlug} />
      <input type="hidden" name="transactionId" value={transactionId} />
      <SubmitButton>Void Transaction</SubmitButton>
    </form>
  );
}
