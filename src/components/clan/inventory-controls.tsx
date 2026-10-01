"use client";

import { ArrowRightLeft, History, PackagePlus, X } from "lucide-react";
import { useActionState, useMemo, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import { initialClanState } from "@/features/clans/state";
import {
  adjustInventoryAction,
  transferInventoryAction,
} from "@/features/inventory/actions";

const fieldClass =
  "border-input bg-background focus-visible:ring-ring mt-1 h-11 w-full rounded-md border px-3 outline-none focus-visible:ring-2";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "กำลังบันทึก…" : "บันทึกการปรับยอด"}
    </Button>
  );
}

export type InventoryAssetOption = {
  id: string;
  name: string;
  code: string;
  unit: string;
};

export type InventoryWarehouseOption = {
  id: string;
  name: string;
  isDefault: boolean;
};

export type InventoryHistoryRow = {
  id: string;
  date: string;
  type: string;
  assetName: string;
  warehouseName: string;
  quantity: string;
  note: string | null;
};

export function InventoryAdjustmentDialog({
  clanSlug,
  assets,
  warehouses,
  balances,
  today,
  initialRequestId,
}: {
  clanSlug: string;
  assets: InventoryAssetOption[];
  warehouses: InventoryWarehouseOption[];
  balances: Record<string, number>;
  today: string;
  initialRequestId: string;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [state, action] = useActionState(
    adjustInventoryAction,
    initialClanState,
  );
  const [mode, setMode] = useState("ADD");
  const [assetId, setAssetId] = useState(assets[0]?.id ?? "");
  const [warehouseId, setWarehouseId] = useState(
    warehouses.find((warehouse) => warehouse.isDefault)?.id ??
      warehouses[0]?.id ??
      "",
  );
  const currentBalance = balances[`${warehouseId}:${assetId}`] ?? 0;
  const asset = assets.find((item) => item.id === assetId);
  const canAdjust = assets.length > 0 && warehouses.length > 0;

  return (
    <>
      <Button
        type="button"
        onClick={() => dialogRef.current?.showModal()}
        disabled={!canAdjust}
      >
        <PackagePlus className="size-4" aria-hidden="true" /> ปรับยอด Inventory
      </Button>
      <dialog
        ref={dialogRef}
        onClick={(event) => {
          if (event.target === event.currentTarget) dialogRef.current?.close();
        }}
        className="bg-background text-foreground fixed inset-0 m-auto max-h-[90vh] w-[min(92vw,34rem)] overflow-y-auto rounded-xl border p-0 shadow-xl backdrop:bg-black/40"
      >
        <div className="p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <PackagePlus
                className="text-primary mb-2 size-6"
                aria-hidden="true"
              />
              <h2 className="text-xl font-semibold">ปรับยอด Inventory</h2>
              <p className="text-muted-foreground mt-1 text-sm">
                เพิ่ม นำออก หรือแก้ไขยอดให้ตรงกับของจริง
              </p>
            </div>
            <button
              type="button"
              onClick={() => dialogRef.current?.close()}
              className="hover:bg-muted rounded-md p-1"
              aria-label="ปิด"
            >
              <X className="size-5" />
            </button>
          </div>

          <form action={action} className="mt-6 space-y-4">
            <input type="hidden" name="clanSlug" value={clanSlug} />
            <input
              type="hidden"
              name="clientRequestId"
              value={initialRequestId}
            />
            <label className="block text-sm font-medium">
              รูปแบบรายการ
              <select
                name="mode"
                value={mode}
                onChange={(event) => setMode(event.target.value)}
                className={fieldClass}
              >
                <option value="ADD">เพิ่ม</option>
                <option value="REMOVE">นำออก</option>
                <option value="SET">แก้ไขยอดจริง</option>
              </select>
            </label>
            <label className="block text-sm font-medium">
              คลัง
              <select
                name="warehouseId"
                value={warehouseId}
                onChange={(event) => setWarehouseId(event.target.value)}
                className={fieldClass}
              >
                {warehouses.map((warehouse) => (
                  <option key={warehouse.id} value={warehouse.id}>
                    {warehouse.name}
                    {warehouse.isDefault ? " (คลังหลัก)" : ""}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm font-medium">
              Asset
              <select
                name="assetId"
                value={assetId}
                onChange={(event) => setAssetId(event.target.value)}
                className={fieldClass}
              >
                {assets.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name} ({item.unit})
                  </option>
                ))}
              </select>
            </label>
            <div className="bg-muted/50 rounded-lg px-4 py-3 text-sm">
              ยอดปัจจุบัน:{" "}
              <strong>
                {currentBalance.toLocaleString("th-TH")} {asset?.unit}
              </strong>
            </div>
            <label className="block text-sm font-medium">
              {mode === "SET" ? "ยอดจริง" : "จำนวน"}
              <input
                name="quantity"
                type="number"
                min="0"
                step="any"
                required
                className={fieldClass}
              />
            </label>
            <label className="block text-sm font-medium">
              วันที่
              <input
                name="transactionDate"
                type="date"
                max={today}
                defaultValue={today}
                required
                className={fieldClass}
              />
            </label>
            <label className="block text-sm font-medium">
              Note {mode === "SET" ? "(จำเป็น)" : ""}
              <textarea
                name="note"
                required={mode === "SET"}
                maxLength={1000}
                rows={3}
                className="border-input bg-background focus-visible:ring-ring mt-1 w-full rounded-md border px-3 py-2 outline-none focus-visible:ring-2"
              />
            </label>
            {state.message && (
              <p className="text-sm text-red-600" role="alert">
                {state.message}
              </p>
            )}
            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => dialogRef.current?.close()}
              >
                ยกเลิก
              </Button>
              <SubmitButton />
            </div>
          </form>
        </div>
      </dialog>
    </>
  );
}

export function InventoryHistoryDialog({
  rows,
}: {
  rows: InventoryHistoryRow[];
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const groupedRows = useMemo(() => rows.slice(0, 100), [rows]);
  return (
    <>
      <Button
        type="button"
        variant="outline"
        onClick={() => dialogRef.current?.showModal()}
      >
        <History className="size-4" aria-hidden="true" /> ดูประวัติ
      </Button>
      <dialog
        ref={dialogRef}
        onClick={(event) => {
          if (event.target === event.currentTarget) dialogRef.current?.close();
        }}
        className="bg-background text-foreground fixed inset-0 m-auto max-h-[90vh] w-[min(94vw,56rem)] overflow-y-auto rounded-xl border p-0 shadow-xl backdrop:bg-black/40"
      >
        <div className="p-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold">ประวัติ Inventory</h2>
              <p className="text-muted-foreground mt-1 text-sm">
                รายการล่าสุดไม่เกิน 100 รายการ
              </p>
            </div>
            <button
              type="button"
              onClick={() => dialogRef.current?.close()}
              className="hover:bg-muted rounded-md p-1"
              aria-label="ปิด"
            >
              <X className="size-5" />
            </button>
          </div>
          {groupedRows.length ? (
            <div className="mt-5 overflow-x-auto rounded-lg border">
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="px-4 py-3">วันที่</th>
                    <th className="px-4 py-3">รายการ</th>
                    <th className="px-4 py-3">Asset</th>
                    <th className="px-4 py-3">คลัง</th>
                    <th className="px-4 py-3 text-right">จำนวน</th>
                    <th className="px-4 py-3">Note</th>
                  </tr>
                </thead>
                <tbody className="divide-input divide-y">
                  {groupedRows.map((row) => (
                    <tr key={row.id}>
                      <td className="px-4 py-3">{row.date}</td>
                      <td className="px-4 py-3">{row.type}</td>
                      <td className="px-4 py-3">{row.assetName}</td>
                      <td className="px-4 py-3">{row.warehouseName}</td>
                      <td className="px-4 py-3 text-right tabular-nums">
                        {row.quantity}
                      </td>
                      <td
                        className="text-muted-foreground max-w-64 truncate px-4 py-3"
                        title={row.note ?? undefined}
                      >
                        {row.note || "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-muted-foreground mt-6 text-sm">
              ยังไม่มีประวัติ Inventory
            </p>
          )}
        </div>
      </dialog>
    </>
  );
}

function TransferSubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "กำลัง Transfer…" : "ยืนยัน Transfer"}
    </Button>
  );
}

export function InventoryTransferDialog({
  clanSlug,
  assets,
  warehouses,
  balances,
  today,
  initialRequestId,
}: {
  clanSlug: string;
  assets: InventoryAssetOption[];
  warehouses: InventoryWarehouseOption[];
  balances: Record<string, number>;
  today: string;
  initialRequestId: string;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [state, action] = useActionState(
    transferInventoryAction,
    initialClanState,
  );
  const defaultWarehouseId =
    warehouses.find((warehouse) => warehouse.isDefault)?.id ??
    warehouses[0]?.id ??
    "";
  const [fromWarehouseId, setFromWarehouseId] = useState(defaultWarehouseId);
  const [toWarehouseId, setToWarehouseId] = useState(
    warehouses.find((warehouse) => warehouse.id !== defaultWarehouseId)?.id ??
      "",
  );
  const [assetId, setAssetId] = useState(assets[0]?.id ?? "");
  const asset = assets.find((item) => item.id === assetId);
  const currentBalance = balances[`${fromWarehouseId}:${assetId}`] ?? 0;
  const canTransfer = assets.length > 0 && warehouses.length > 1;

  function changeSource(nextSource: string) {
    setFromWarehouseId(nextSource);
    if (nextSource === toWarehouseId) {
      setToWarehouseId(
        warehouses.find((warehouse) => warehouse.id !== nextSource)?.id ?? "",
      );
    }
  }

  return (
    <>
      <Button
        type="button"
        variant="outline"
        onClick={() => dialogRef.current?.showModal()}
        disabled={!canTransfer}
        title={
          warehouses.length < 2 ? "ต้องมีอย่างน้อย 2 Warehouse" : undefined
        }
      >
        <ArrowRightLeft className="size-4" aria-hidden="true" /> Transfer สินค้า
      </Button>
      <dialog
        ref={dialogRef}
        onClick={(event) => {
          if (event.target === event.currentTarget) dialogRef.current?.close();
        }}
        className="bg-background text-foreground fixed inset-0 m-auto max-h-[90vh] w-[min(92vw,34rem)] overflow-y-auto rounded-xl border p-0 shadow-xl backdrop:bg-black/40"
      >
        <div className="p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <ArrowRightLeft
                className="text-primary mb-2 size-6"
                aria-hidden="true"
              />
              <h2 className="text-xl font-semibold">Transfer สินค้า</h2>
              <p className="text-muted-foreground mt-1 text-sm">
                ย้าย Asset ระหว่าง Warehouse โดยยอดรวมไม่เปลี่ยน
              </p>
            </div>
            <button
              type="button"
              onClick={() => dialogRef.current?.close()}
              className="hover:bg-muted rounded-md p-1"
              aria-label="ปิด"
            >
              <X className="size-5" />
            </button>
          </div>

          <form action={action} className="mt-6 space-y-4">
            <input type="hidden" name="clanSlug" value={clanSlug} />
            <input
              type="hidden"
              name="clientRequestId"
              value={initialRequestId}
            />
            <label className="block text-sm font-medium">
              คลังต้นทาง
              <select
                name="fromWarehouseId"
                value={fromWarehouseId}
                onChange={(event) => changeSource(event.target.value)}
                className={fieldClass}
              >
                {warehouses.map((warehouse) => (
                  <option key={warehouse.id} value={warehouse.id}>
                    {warehouse.name}
                    {warehouse.isDefault ? " (คลังหลัก)" : ""}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm font-medium">
              คลังปลายทาง
              <select
                name="toWarehouseId"
                value={toWarehouseId}
                onChange={(event) => setToWarehouseId(event.target.value)}
                className={fieldClass}
              >
                {warehouses
                  .filter((warehouse) => warehouse.id !== fromWarehouseId)
                  .map((warehouse) => (
                    <option key={warehouse.id} value={warehouse.id}>
                      {warehouse.name}
                      {warehouse.isDefault ? " (คลังหลัก)" : ""}
                    </option>
                  ))}
              </select>
            </label>
            <label className="block text-sm font-medium">
              Asset
              <select
                name="assetId"
                value={assetId}
                onChange={(event) => setAssetId(event.target.value)}
                className={fieldClass}
              >
                {assets.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name} ({item.unit})
                  </option>
                ))}
              </select>
            </label>
            <div className="bg-muted/50 rounded-lg px-4 py-3 text-sm">
              ยอดในคลังต้นทาง:{" "}
              <strong>
                {currentBalance.toLocaleString("th-TH")} {asset?.unit}
              </strong>
            </div>
            <label className="block text-sm font-medium">
              จำนวนที่ Transfer
              <input
                name="quantity"
                type="number"
                min="0"
                step="any"
                required
                className={fieldClass}
              />
            </label>
            <label className="block text-sm font-medium">
              วันที่
              <input
                name="transactionDate"
                type="date"
                max={today}
                defaultValue={today}
                required
                className={fieldClass}
              />
            </label>
            <label className="block text-sm font-medium">
              Note
              <textarea
                name="note"
                maxLength={1000}
                rows={3}
                className="border-input bg-background focus-visible:ring-ring mt-1 w-full rounded-md border px-3 py-2 outline-none focus-visible:ring-2"
              />
            </label>
            {state.message && (
              <p className="text-sm text-red-600" role="alert">
                {state.message}
              </p>
            )}
            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => dialogRef.current?.close()}
              >
                ยกเลิก
              </Button>
              <TransferSubmitButton />
            </div>
          </form>
        </div>
      </dialog>
    </>
  );
}
