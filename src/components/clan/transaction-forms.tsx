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
  clientRequestId,
  assets,
  warehouses,
  members,
}: {
  clanSlug: string;
  transactionType: TransactionType;
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
  const title =
    transactionType === "DEPOSIT"
      ? "Deposit"
      : transactionType === "WITHDRAW"
        ? "Withdraw"
        : "Transfer";
  return (
    <form
      action={action}
      className="space-y-6"
      onSubmit={(event) => {
        if (!window.confirm(`ยืนยัน Post รายการ ${title}?`))
          event.preventDefault();
      }}
    >
      <input type="hidden" name="clanSlug" value={clanSlug} />
      <input type="hidden" name="transactionType" value={transactionType} />
      <input type="hidden" name="clientRequestId" value={clientRequestId} />
      <div className="grid gap-4 sm:grid-cols-2">
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
        {transactionType !== "DEPOSIT" && (
          <label className="text-sm font-medium">
            Warehouse ต้นทาง
            <select name="fromWarehouseId" required className={fieldClass}>
              <option value="">เลือก Warehouse</option>
              {warehouses.map((warehouse) => (
                <option key={warehouse.id} value={warehouse.id}>
                  {warehouse.name}
                  {warehouse.is_default ? " (Default)" : ""}
                </option>
              ))}
            </select>
          </label>
        )}
        {transactionType === "TRANSFER" && (
          <label className="text-sm font-medium">
            Warehouse ปลายทาง
            <select name="toWarehouseId" required className={fieldClass}>
              <option value="">เลือก Warehouse</option>
              {warehouses.map((warehouse) => (
                <option key={warehouse.id} value={warehouse.id}>
                  {warehouse.name}
                  {warehouse.is_default ? " (Default)" : ""}
                </option>
              ))}
            </select>
          </label>
        )}
        {transactionType === "DEPOSIT" && (
          <div className="bg-muted rounded-md p-3 text-sm">
            ปลายทาง:{" "}
            {warehouses.find((warehouse) => warehouse.is_default)?.name ??
              "Default Warehouse"}
          </div>
        )}
      </div>

      <fieldset className="space-y-3">
        <div className="flex items-center justify-between">
          <legend className="font-semibold">รายการ Asset</legend>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() =>
              setRows((current) => [...current, Math.max(...current) + 1])
            }
          >
            <Plus className="size-4" /> เพิ่มรายการ
          </Button>
        </div>
        {rows.map((row, index) => (
          <div
            key={row}
            className="border-input grid gap-3 rounded-lg border p-4 sm:grid-cols-[1.5fr_1fr_1fr_auto] sm:items-end"
          >
            <label className="text-sm font-medium">
              Asset
              <select name="assetId" required className={fieldClass}>
                <option value="">เลือก Asset</option>
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
            <label className="text-sm font-medium">
              มูลค่าต่อหน่วย
              <input
                name="unitValue"
                type="number"
                min="0"
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
      <label className="block text-sm font-medium">
        หมายเหตุ
        <textarea
          name="note"
          maxLength={1000}
          rows={3}
          className="border-input bg-background focus-visible:ring-ring mt-1 w-full rounded-md border p-3 outline-none focus-visible:ring-2"
        />
      </label>
      {state.message && (
        <p
          className="rounded-md bg-red-50 p-3 text-sm text-red-700"
          role="alert"
        >
          {state.message}
        </p>
      )}
      <SubmitButton>ยืนยันและ Post {title}</SubmitButton>
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
