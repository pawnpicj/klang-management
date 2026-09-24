"use client";

import {
  CheckCircle2,
  CircleAlert,
  PackageCheck,
  Save,
  Trash2,
  X,
} from "lucide-react";
import { useActionState, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import {
  deleteDeliveryAction,
  recordDeliveryAction,
  updateDeliveryAction,
} from "@/features/deliveries/actions";
import { initialClanState } from "@/features/clans/state";

const number = new Intl.NumberFormat("th-TH", { maximumFractionDigits: 4 });
const fieldClass =
  "border-input bg-background focus-visible:ring-ring mt-1 h-10 w-full rounded-md border px-3 outline-none focus-visible:ring-2";

type AssetOption = {
  id: string;
  name: string;
  unit: string;
  requiredQuantity: number;
};
type MemberRow = {
  id: string;
  characterName: string;
  roleName: string;
  complete: boolean;
  missingDates: string[];
  missingItems: Array<{
    id: string;
    name: string;
    unit: string;
    quantity: number;
  }>;
};
type DeliveryHistory = {
  id: string;
  memberId: string;
  assetId: string;
  deliveryDate: string;
  quantity: number;
};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "กำลังบันทึก…" : "บันทึกการส่ง"}
    </Button>
  );
}

function UpdateButton() {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      size="sm"
      className="size-10 px-0"
      disabled={pending}
      aria-label="บันทึกการแก้ไข"
      title="บันทึกการแก้ไข"
    >
      <Save className="size-4" />
    </Button>
  );
}

function DeliveryForm({
  clanSlug,
  member,
  assets,
  today,
  close,
}: {
  clanSlug: string;
  member: MemberRow;
  assets: AssetOption[];
  today: string;
  close: () => void;
}) {
  const [state, action] = useActionState(
    recordDeliveryAction,
    initialClanState,
  );
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="clanSlug" value={clanSlug} />
      <input type="hidden" name="memberId" value={member.id} />
      <label className="block text-sm font-medium">
        วันที่
        <input
          name="deliveryDate"
          type="date"
          defaultValue={today}
          max={today}
          required
          className={fieldClass}
        />
      </label>
      <fieldset className="space-y-3">
        <legend className="text-sm font-medium">Assets ที่ส่ง</legend>
        {assets.map((asset) => (
          <label
            key={asset.id}
            className="border-input grid gap-3 rounded-lg border p-3 sm:grid-cols-[minmax(0,1fr)_9rem] sm:items-center"
          >
            <span>
              <span className="block font-medium">
                {asset.name} ({asset.unit})
              </span>
              <span className="text-muted-foreground mt-1 block text-xs">
                {asset.requiredQuantity > 0
                  ? `ต้องส่งวันละ ${number.format(asset.requiredQuantity)} ${asset.unit}`
                  : "ส่งได้ตามต้องการ ไม่นำไปคำนวณยอดขาด"}
              </span>
            </span>
            <span>
              <span className="sr-only">จำนวน {asset.name}</span>
              <input type="hidden" name="assetId" value={asset.id} />
              <input
                name="quantity"
                type="number"
                min="0.0001"
                step="any"
                inputMode="decimal"
                placeholder="จำนวน"
                className={fieldClass}
              />
            </span>
          </label>
        ))}
      </fieldset>
      {state.message && (
        <p className="text-sm text-red-600" role="alert">
          {state.message}
        </p>
      )}
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={close}>
          ยกเลิก
        </Button>
        <SubmitButton />
      </div>
    </form>
  );
}

function DeliveryHistoryEditor({
  clanSlug,
  delivery,
  assets,
  today,
}: {
  clanSlug: string;
  delivery: DeliveryHistory;
  assets: AssetOption[];
  today: string;
}) {
  const [state, action] = useActionState(
    updateDeliveryAction,
    initialClanState,
  );

  return (
    <form
      action={action}
      className="border-input grid gap-2 rounded-lg border p-3 sm:grid-cols-[8.5rem_minmax(0,1fr)_7rem_auto] sm:items-end"
    >
      <input type="hidden" name="clanSlug" value={clanSlug} />
      <input type="hidden" name="deliveryId" value={delivery.id} />
      <label className="text-xs font-medium">
        วันที่
        <input
          name="deliveryDate"
          type="date"
          defaultValue={delivery.deliveryDate}
          max={today}
          required
          className={fieldClass}
        />
      </label>
      <label className="text-xs font-medium">
        Asset
        <select
          name="assetId"
          defaultValue={delivery.assetId}
          required
          className={fieldClass}
        >
          {assets.map((asset) => (
            <option key={asset.id} value={asset.id}>
              {asset.name} ({asset.unit})
            </option>
          ))}
        </select>
      </label>
      <label className="text-xs font-medium">
        จำนวน
        <input
          name="quantity"
          type="number"
          min="0.0001"
          step="any"
          inputMode="decimal"
          defaultValue={delivery.quantity}
          required
          className={fieldClass}
        />
      </label>
      <div className="flex gap-2">
        <UpdateButton />
        <Button
          type="submit"
          size="sm"
          variant="destructive"
          className="size-10 px-0"
          formAction={deleteDeliveryAction}
          formNoValidate
          onClick={(event) => {
            if (!window.confirm("ยืนยันการลบรายการส่งของนี้?")) {
              event.preventDefault();
            }
          }}
          aria-label="ลบรายการ"
          title="ลบรายการ"
        >
          <Trash2 className="size-4" />
        </Button>
      </div>
      {state.message && (
        <p className="text-sm text-red-600 sm:col-span-4" role="alert">
          {state.message}
        </p>
      )}
    </form>
  );
}

export function DeliveryTable({
  clanSlug,
  members,
  assets,
  deliveries,
  today,
  canManage,
}: {
  clanSlug: string;
  members: MemberRow[];
  assets: AssetOption[];
  deliveries: DeliveryHistory[];
  today: string;
  canManage: boolean;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [selected, setSelected] = useState<MemberRow | null>(null);
  const open = (member: MemberRow) => {
    setSelected(member);
    dialogRef.current?.showModal();
  };
  const close = () => dialogRef.current?.close();
  const selectedDeliveries = selected
    ? deliveries.filter((delivery) => delivery.memberId === selected.id)
    : [];

  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="bg-muted/50 text-muted-foreground">
            <tr>
              <th className="px-5 py-3 font-medium">สมาชิก</th>
              <th className="px-5 py-3 font-medium">Role</th>
              <th className="px-5 py-3 text-center font-medium">สถานะ</th>
              <th className="px-5 py-3 font-medium">ขาดส่งอะไรบ้าง</th>
            </tr>
          </thead>
          <tbody className="divide-input divide-y">
            {members.map((member) => (
              <tr key={member.id}>
                <td className="px-5 py-4 font-medium">
                  {canManage && assets.length ? (
                    <button
                      type="button"
                      onClick={() => open(member)}
                      className="text-primary rounded-sm font-semibold hover:underline focus-visible:ring-2 focus-visible:outline-none"
                    >
                      {member.characterName}
                    </button>
                  ) : (
                    member.characterName
                  )}
                </td>
                <td className="px-5 py-4">{member.roleName}</td>
                <td className="px-5 py-4 text-center">
                  {member.complete ? (
                    <CheckCircle2
                      className="mx-auto size-5 text-emerald-600"
                      aria-label="ส่งครบ"
                    />
                  ) : (
                    <span
                      title={`วันที่ขาดส่ง: ${member.missingDates.join(", ")}`}
                    >
                      <CircleAlert
                        className="mx-auto size-5 text-amber-600"
                        aria-label="ส่งไม่ครบ"
                      />
                    </span>
                  )}
                </td>
                <td className="px-5 py-4">
                  {member.missingItems.length ? (
                    <div className="flex flex-wrap gap-2">
                      {member.missingItems.map((item) => (
                        <span
                          key={item.id}
                          className="rounded-full bg-amber-50 px-2.5 py-1 text-xs text-amber-900 dark:bg-amber-950 dark:text-amber-100"
                        >
                          {item.name} {number.format(item.quantity)} {item.unit}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span className="text-emerald-700">ครบแล้ว</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <dialog
        ref={dialogRef}
        onClick={(event) => {
          if (event.target === event.currentTarget) close();
        }}
        className="bg-background text-foreground fixed inset-0 m-auto max-h-[90vh] w-[min(94vw,48rem)] overflow-y-auto rounded-xl border p-0 shadow-xl backdrop:bg-black/40"
      >
        {selected && (
          <div className="p-6">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <PackageCheck className="text-primary mb-2 size-6" />
                <h2 className="text-xl font-semibold">
                  ส่งของ: {selected.characterName}
                </h2>
              </div>
              <button
                type="button"
                onClick={close}
                className="hover:bg-muted rounded-md p-1"
                aria-label="ปิด"
              >
                <X className="size-5" />
              </button>
            </div>
            <DeliveryForm
              key={selected.id}
              clanSlug={clanSlug}
              member={selected}
              assets={assets}
              today={today}
              close={close}
            />
            <section className="border-input mt-6 border-t pt-5">
              <div className="mb-3 flex items-center justify-between gap-4">
                <h3 className="font-semibold">รายการที่บันทึกแล้ว</h3>
                <span className="text-muted-foreground text-sm">
                  {selectedDeliveries.length} รายการ
                </span>
              </div>
              {selectedDeliveries.length ? (
                <div className="space-y-3">
                  {selectedDeliveries.map((delivery) => (
                    <DeliveryHistoryEditor
                      key={delivery.id}
                      clanSlug={clanSlug}
                      delivery={delivery}
                      assets={assets}
                      today={today}
                    />
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-sm">
                  ยังไม่มีรายการส่งของ
                </p>
              )}
            </section>
          </div>
        )}
      </dialog>
    </>
  );
}
