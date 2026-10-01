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
import { htmlId } from "@/lib/html-id";
import { useId as useHtmlId } from "react";

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
  const htmlIdPrefix = useHtmlId();

  const { pending } = useFormStatus();
  return (
    <Button
      id={htmlId("clan_submit_button_button", htmlIdPrefix)}
      type="submit"
      disabled={pending}
    >
      {pending ? "กำลังบันทึก…" : "บันทึกการส่ง"}
    </Button>
  );
}

function UpdateButton() {
  const htmlIdPrefix = useHtmlId();

  const { pending } = useFormStatus();
  return (
    <Button
      id={htmlId("clan_update_button_button", htmlIdPrefix)}
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
  const htmlIdPrefix = useHtmlId();

  const [state, action] = useActionState(
    recordDeliveryAction,
    initialClanState,
  );
  return (
    <form
      id={htmlId("clan_delivery_form_form", htmlIdPrefix)}
      action={action}
      className="space-y-4"
    >
      <input
        id={htmlId("clan_delivery_form_clan_slug", htmlIdPrefix)}
        type="hidden"
        name="clanSlug"
        value={clanSlug}
      />
      <input
        id={htmlId("clan_delivery_form_member_id", htmlIdPrefix)}
        type="hidden"
        name="memberId"
        value={member.id}
      />
      <label
        id={htmlId("clan_delivery_form_label", htmlIdPrefix)}
        className="block text-sm font-medium"
      >
        วันที่
        <input
          id={htmlId("clan_delivery_form_delivery_date", htmlIdPrefix)}
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
        {assets.map((asset, htmlRowIndex1) => (
          <label
            id={htmlId(
              "clan_delivery_form_label_2",
              htmlIdPrefix,
              htmlRowIndex1,
            )}
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
              <input
                id={htmlId(
                  "clan_delivery_form_asset_id",
                  htmlIdPrefix,
                  htmlRowIndex1,
                )}
                type="hidden"
                name="assetId"
                value={asset.id}
              />
              <input
                id={htmlId(
                  "clan_delivery_form_quantity",
                  htmlIdPrefix,
                  htmlRowIndex1,
                )}
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
        <p
          id={htmlId("clan_delivery_form_state_message", htmlIdPrefix)}
          className="text-sm text-red-600"
          role="alert"
        >
          {state.message}
        </p>
      )}
      <div className="flex justify-end gap-2">
        <Button
          id={htmlId("clan_delivery_form_button", htmlIdPrefix)}
          type="button"
          variant="outline"
          onClick={close}
        >
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
  const htmlIdPrefix = useHtmlId();

  const [state, action] = useActionState(
    updateDeliveryAction,
    initialClanState,
  );

  return (
    <form
      id={htmlId("clan_delivery_history_editor_form", htmlIdPrefix)}
      action={action}
      className="border-input grid gap-2 rounded-lg border p-3 sm:grid-cols-[8.5rem_minmax(0,1fr)_7rem_auto] sm:items-end"
    >
      <input
        id={htmlId("clan_delivery_history_editor_clan_slug", htmlIdPrefix)}
        type="hidden"
        name="clanSlug"
        value={clanSlug}
      />
      <input
        id={htmlId("clan_delivery_history_editor_delivery_id", htmlIdPrefix)}
        type="hidden"
        name="deliveryId"
        value={delivery.id}
      />
      <label
        id={htmlId("clan_delivery_history_editor_label", htmlIdPrefix)}
        className="text-xs font-medium"
      >
        วันที่
        <input
          id={htmlId(
            "clan_delivery_history_editor_delivery_date",
            htmlIdPrefix,
          )}
          name="deliveryDate"
          type="date"
          defaultValue={delivery.deliveryDate}
          max={today}
          required
          className={fieldClass}
        />
      </label>
      <label
        id={htmlId("clan_delivery_history_editor_asset", htmlIdPrefix)}
        className="text-xs font-medium"
      >
        Asset
        <select
          id={htmlId("clan_delivery_history_editor_asset_id", htmlIdPrefix)}
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
      <label
        id={htmlId("clan_delivery_history_editor_label_2", htmlIdPrefix)}
        className="text-xs font-medium"
      >
        จำนวน
        <input
          id={htmlId("clan_delivery_history_editor_quantity", htmlIdPrefix)}
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
          id={htmlId("clan_delivery_history_editor_button", htmlIdPrefix)}
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
        <p
          id={htmlId(
            "clan_delivery_history_editor_state_message",
            htmlIdPrefix,
          )}
          className="text-sm text-red-600 sm:col-span-4"
          role="alert"
        >
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
  const htmlIdPrefix = useHtmlId();

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
        <table
          id={htmlId("clan_delivery_table_table", htmlIdPrefix)}
          className="w-full min-w-[720px] text-left text-sm"
        >
          <thead
            id={htmlId("clan_delivery_table_thead", htmlIdPrefix)}
            className="bg-muted/50 text-muted-foreground"
          >
            <tr id={htmlId("clan_delivery_table_tr", htmlIdPrefix)}>
              <th
                id={htmlId("clan_delivery_table_th", htmlIdPrefix)}
                className="px-5 py-3 font-medium"
              >
                สมาชิก
              </th>
              <th
                id={htmlId("clan_delivery_table_role", htmlIdPrefix)}
                className="px-5 py-3 font-medium"
              >
                Role
              </th>
              <th
                id={htmlId("clan_delivery_table_th_2", htmlIdPrefix)}
                className="px-5 py-3 text-center font-medium"
              >
                สถานะ
              </th>
              <th
                id={htmlId("clan_delivery_table_th_3", htmlIdPrefix)}
                className="px-5 py-3 font-medium"
              >
                ขาดส่งอะไรบ้าง
              </th>
            </tr>
          </thead>
          <tbody
            id={htmlId("clan_delivery_table_tbody", htmlIdPrefix)}
            className="divide-input divide-y"
          >
            {members.map((member, htmlRowIndex2) => (
              <tr
                id={htmlId(
                  "clan_delivery_table_tr_2",
                  htmlIdPrefix,
                  htmlRowIndex2,
                )}
                key={member.id}
              >
                <td
                  id={htmlId(
                    "clan_delivery_table_td",
                    htmlIdPrefix,
                    htmlRowIndex2,
                  )}
                  className="px-5 py-4 font-medium"
                >
                  {canManage && assets.length ? (
                    <button
                      id={htmlId(
                        "clan_delivery_table_member_character_name",
                        htmlIdPrefix,
                        htmlRowIndex2,
                      )}
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
                <td
                  id={htmlId(
                    "clan_delivery_table_member_role_name",
                    htmlIdPrefix,
                    htmlRowIndex2,
                  )}
                  className="px-5 py-4"
                >
                  {member.roleName}
                </td>
                <td
                  id={htmlId(
                    "clan_delivery_table_td_2",
                    htmlIdPrefix,
                    htmlRowIndex2,
                  )}
                  className="px-5 py-4 text-center"
                >
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
                <td
                  id={htmlId(
                    "clan_delivery_table_td_3",
                    htmlIdPrefix,
                    htmlRowIndex2,
                  )}
                  className="px-5 py-4"
                >
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
                    <span className="text-emerald-700 dark:text-emerald-200">
                      ครบแล้ว
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <dialog
        id={htmlId("clan_delivery_table_dialog", htmlIdPrefix)}
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
                <h2
                  id={htmlId(
                    "clan_delivery_table_selected_character_name",
                    htmlIdPrefix,
                  )}
                  className="text-xl font-semibold"
                >
                  ส่งของ: {selected.characterName}
                </h2>
              </div>
              <button
                id={htmlId("clan_delivery_table_button", htmlIdPrefix)}
                type="button"
                onClick={close}
                className="hover:bg-muted rounded-md p-1"
                aria-label="ปิด"
              >
                <X className="size-5" />
              </button>
            </div>
            <section
              id={htmlId("clan_delivery_table_section", htmlIdPrefix)}
              className="bg-muted/50 mb-5 rounded-lg p-4"
              aria-labelledby="missing-deliveries-heading"
            >
              <h3
                id="missing-deliveries-heading"
                className="text-sm font-semibold"
              >
                ขาดส่งอะไรบ้าง
              </h3>
              {selected.missingItems.length ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  {selected.missingItems.map((item) => (
                    <span
                      key={item.id}
                      className="rounded-full bg-amber-50 px-2.5 py-1 text-xs text-amber-900 dark:bg-amber-950 dark:text-amber-100"
                    >
                      {item.name} {number.format(item.quantity)} {item.unit}
                    </span>
                  ))}
                </div>
              ) : (
                <p
                  id={htmlId("clan_delivery_table_p", htmlIdPrefix)}
                  className="mt-2 text-sm font-medium text-emerald-700 dark:text-emerald-200"
                >
                  ส่งครบแล้ว
                </p>
              )}
            </section>
            <DeliveryForm
              key={selected.id}
              clanSlug={clanSlug}
              member={selected}
              assets={assets}
              today={today}
              close={close}
            />
            <section
              id={htmlId("clan_delivery_table_section_2", htmlIdPrefix)}
              className="border-input mt-6 border-t pt-5"
            >
              <div className="mb-3 flex items-center justify-between gap-4">
                <h3
                  id={htmlId("clan_delivery_table_h3", htmlIdPrefix)}
                  className="font-semibold"
                >
                  รายการที่บันทึกแล้ว
                </h3>
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
                <p
                  id={htmlId("clan_delivery_table_p_2", htmlIdPrefix)}
                  className="text-muted-foreground text-sm"
                >
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
