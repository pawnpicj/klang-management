import { ActionNotice } from "@/components/ui/action-notice";
import { randomUUID } from "node:crypto";
import Image from "next/image";
import Link from "next/link";
import { AlertTriangle, Boxes, CircleCheck, PackageX } from "lucide-react";
import { notFound, redirect } from "next/navigation";
import { AppHeader } from "@/components/clan/app-header";
import {
  InventoryAdjustmentDialog,
  InventoryHistoryDialog,
  InventoryTransferDialog,
  type InventoryHistoryRow,
} from "@/components/clan/inventory-controls";
import { Button } from "@/components/ui/button";
import { getAssetImageUrls } from "@/lib/supabase/asset-images";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const formatQuantity = (value: number, decimals = 0) =>
  new Intl.NumberFormat("th-TH", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);

export default async function InventoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ clanSlug: string }>;
  searchParams: Promise<{
    q?: string;
    warehouse?: string;
    status?: string;
    updated?: string;
    transferred?: string;
  }>;
}) {
  const [{ clanSlug }, query] = await Promise.all([params, searchParams]);
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  if (typeof claims?.claims?.sub !== "string") {
    redirect(`/login?next=${encodeURIComponent(`/c/${clanSlug}/inventory`)}`);
  }
  const { data: clan } = await supabase
    .from("clans")
    .select("id,name,slug")
    .eq("slug", clanSlug)
    .maybeSingle();
  if (!clan) notFound();

  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Bangkok",
  }).format(new Date());
  const [
    { data: canView },
    { data: warehouses },
    { data: assets, error: assetError },
    { data: balances },
    { data: deliveries },
    { data: transactions },
    { data: canManage },
  ] = await Promise.all([
    supabase.rpc("has_clan_permission", {
      p_clan_id: clan.id,
      p_permission_code: "inventory.view",
    }),
    supabase
      .from("warehouses")
      .select("id,name,is_default,is_active")
      .eq("clan_id", clan.id)
      .eq("is_active", true)
      .order("is_default", { ascending: false })
      .order("name"),
    supabase
      .from("assets")
      .select(
        "id,code,name,unit,image_url,decimal_places,low_stock_threshold,is_active",
      )
      .eq("clan_id", clan.id)
      .eq("is_active", true)
      .order("name"),
    supabase
      .from("warehouse_asset_balances")
      .select("warehouse_id,asset_id,balance")
      .eq("clan_id", clan.id),
    supabase
      .from("member_deliveries")
      .select(
        "id,delivery_date,quantity,created_at,warehouse_id,asset_id,asset:assets!member_deliveries_clan_id_asset_id_fkey(name,unit,decimal_places),warehouse:warehouses!member_deliveries_clan_warehouse_fkey(name),member:clan_members!member_deliveries_clan_id_member_id_fkey(character_name)",
      )
      .eq("clan_id", clan.id)
      .order("created_at", { ascending: false })
      .limit(100),
    supabase
      .from("transactions")
      .select("id,transaction_date,transaction_type,status,note,created_at")
      .eq("clan_id", clan.id)
      .eq("status", "POSTED")
      .order("created_at", { ascending: false })
      .limit(100),
    supabase.rpc("has_clan_permission", {
      p_clan_id: clan.id,
      p_permission_code: "inventory.manage",
    }),
  ]);

  if (!canView) notFound();
  const imageUrlsPromise = getAssetImageUrls(supabase, assets ?? []);

  const transactionIds = (transactions ?? []).map(
    (transaction) => transaction.id,
  );
  const { data: transactionItems } = transactionIds.length
    ? await supabase
        .from("transaction_items")
        .select(
          "id,transaction_id,quantity,note,from_warehouse_id,to_warehouse_id,asset_id,asset:assets!transaction_items_clan_id_asset_id_fkey(name,unit,decimal_places),from_warehouse:warehouses!transaction_items_clan_id_from_warehouse_id_fkey(name),to_warehouse:warehouses!transaction_items_clan_id_to_warehouse_id_fkey(name)",
        )
        .eq("clan_id", clan.id)
        .in("transaction_id", transactionIds)
    : { data: [] };

  const activeWarehouses = warehouses ?? [];
  const selectedWarehouseId = activeWarehouses.some(
    (warehouse) => warehouse.id === query.warehouse,
  )
    ? query.warehouse!
    : (activeWarehouses.find((warehouse) => warehouse.is_default)?.id ??
      activeWarehouses[0]?.id ??
      "");
  const selectedWarehouse = activeWarehouses.find(
    (warehouse) => warehouse.id === selectedWarehouseId,
  );
  const balanceMap = new Map(
    (balances ?? []).map((row) => [
      `${row.warehouse_id}:${row.asset_id}`,
      Number(row.balance),
    ]),
  );
  const transactionMap = new Map(
    (transactions ?? []).map((transaction) => [transaction.id, transaction]),
  );
  const receivedToday = new Map<string, number>();
  for (const delivery of deliveries ?? []) {
    if (
      delivery.delivery_date === today &&
      delivery.warehouse_id === selectedWarehouseId
    ) {
      receivedToday.set(
        delivery.asset_id,
        (receivedToday.get(delivery.asset_id) ?? 0) + Number(delivery.quantity),
      );
    }
  }
  for (const item of transactionItems ?? []) {
    const transaction = transactionMap.get(item.transaction_id);
    if (
      transaction?.transaction_date === today &&
      item.to_warehouse_id === selectedWarehouseId
    ) {
      receivedToday.set(
        item.asset_id,
        (receivedToday.get(item.asset_id) ?? 0) + Number(item.quantity),
      );
    }
  }

  const imageUrls = await imageUrlsPromise;

  const allRows = (assets ?? []).map((asset) => {
    const balance = balanceMap.get(`${selectedWarehouseId}:${asset.id}`) ?? 0;
    const threshold = Number(asset.low_stock_threshold);
    const status: "normal" | "low" | "empty" =
      balance <= 0
        ? "empty"
        : threshold > 0 && balance < threshold
          ? "low"
          : "normal";
    return {
      ...asset,
      balance,
      threshold,
      status,
      receivedToday: receivedToday.get(asset.id) ?? 0,
    };
  });
  const search = query.q?.trim().toLocaleLowerCase("th-TH") ?? "";
  const statusFilter = ["normal", "low", "empty"].includes(query.status ?? "")
    ? query.status
    : "";
  const rows = allRows.filter(
    (row) =>
      (!search ||
        row.name.toLocaleLowerCase("th-TH").includes(search) ||
        row.code.toLocaleLowerCase("th-TH").includes(search)) &&
      (!statusFilter || row.status === statusFilter),
  );
  const emptyCount = allRows.filter((row) => row.status === "empty").length;
  const lowCount = allRows.filter((row) => row.status === "low").length;

  const historyRows: InventoryHistoryRow[] = [];
  for (const delivery of deliveries ?? []) {
    historyRows.push({
      id: `delivery-${delivery.id}`,
      date: delivery.delivery_date,
      type: "รับจาก Delivery",
      assetName: delivery.asset.name,
      warehouseName: delivery.warehouse.name,
      quantity: `+${formatQuantity(Number(delivery.quantity), delivery.asset.decimal_places)} ${delivery.asset.unit}`,
      note: delivery.member.character_name,
    });
  }
  for (const item of transactionItems ?? []) {
    const transaction = transactionMap.get(item.transaction_id);
    if (!transaction) continue;
    const isTransfer = Boolean(item.from_warehouse_id && item.to_warehouse_id);
    const incoming = Boolean(item.to_warehouse_id);
    historyRows.push({
      id: `transaction-${item.id}`,
      date: transaction.transaction_date,
      type: isTransfer
        ? "Transfer"
        : incoming
          ? "เพิ่ม/ปรับขึ้น"
          : "นำออก/ปรับลง",
      assetName: item.asset.name,
      warehouseName: isTransfer
        ? `${item.from_warehouse?.name ?? "—"} → ${item.to_warehouse?.name ?? "—"}`
        : (item.to_warehouse?.name ?? item.from_warehouse?.name ?? "—"),
      quantity: `${isTransfer ? "" : incoming ? "+" : "-"}${formatQuantity(Number(item.quantity), item.asset.decimal_places)} ${item.asset.unit}`,
      note: item.note ?? transaction.note,
    });
  }
  historyRows.sort(
    (a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id),
  );

  const balanceRecord = Object.fromEntries(balanceMap.entries());
  const statusLabel = {
    normal: { label: "ปกติ", className: "bg-emerald-100 text-emerald-800" },
    low: { label: "ใกล้หมด", className: "bg-amber-100 text-amber-800" },
    empty: { label: "หมด", className: "bg-red-100 text-red-700" },
  } as const;

  return (
    <>
      <AppHeader activeClan={clan.name} />
      <main className="mx-auto w-full max-w-6xl px-5 py-10 sm:px-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <Link
              href={`/c/${clan.slug}/dashboard`}
              className="text-primary text-sm font-medium hover:underline"
            >
              ← กลับ Dashboard
            </Link>
            <h1 className="mt-4 text-3xl font-bold">Inventory</h1>
            <p className="text-muted-foreground mt-2">
              ยอดคงเหลือของ {clan.name}
              {selectedWarehouse ? ` · ${selectedWarehouse.name}` : ""}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <InventoryHistoryDialog rows={historyRows} />
            {canManage && (
              <InventoryTransferDialog
                clanSlug={clan.slug}
                assets={(assets ?? []).map((asset) => ({
                  id: asset.id,
                  name: asset.name,
                  code: asset.code,
                  unit: asset.unit,
                }))}
                warehouses={activeWarehouses.map((warehouse) => ({
                  id: warehouse.id,
                  name: warehouse.name,
                  isDefault: warehouse.is_default,
                }))}
                balances={balanceRecord}
                today={today}
                initialRequestId={randomUUID()}
              />
            )}
            {canManage && (
              <InventoryAdjustmentDialog
                clanSlug={clan.slug}
                assets={(assets ?? []).map((asset) => ({
                  id: asset.id,
                  name: asset.name,
                  code: asset.code,
                  unit: asset.unit,
                }))}
                warehouses={activeWarehouses.map((warehouse) => ({
                  id: warehouse.id,
                  name: warehouse.name,
                  isDefault: warehouse.is_default,
                }))}
                balances={balanceRecord}
                today={today}
                initialRequestId={randomUUID()}
              />
            )}
          </div>
        </div>

        {(query.updated === "1" || query.transferred === "1") && (
          <ActionNotice
            queryKeys={["updated", "transferred"]}
            className="mt-6 rounded-md bg-emerald-50 p-3 text-sm text-emerald-800"
          >
            {query.transferred === "1"
              ? "Transfer สินค้าแล้ว"
              : "ปรับยอด Inventory แล้ว"}
          </ActionNotice>
        )}

        <section className="mt-8 grid gap-4 sm:grid-cols-3">
          <article className="border-input rounded-xl border p-5">
            <div className="flex items-center gap-2">
              <Boxes className="text-primary size-5" aria-hidden="true" />
              <p className="text-muted-foreground text-sm">Asset ทั้งหมด</p>
            </div>
            <p className="mt-3 text-2xl font-semibold">{allRows.length}</p>
          </article>
          <article className="border-input rounded-xl border p-5">
            <div className="flex items-center gap-2">
              <AlertTriangle
                className="size-5 text-amber-600"
                aria-hidden="true"
              />
              <p className="text-muted-foreground text-sm">ใกล้หมด</p>
            </div>
            <p className="mt-3 text-2xl font-semibold">{lowCount}</p>
          </article>
          <article className="border-input rounded-xl border p-5">
            <div className="flex items-center gap-2">
              <PackageX className="size-5 text-red-600" aria-hidden="true" />
              <p className="text-muted-foreground text-sm">หมด</p>
            </div>
            <p className="mt-3 text-2xl font-semibold">{emptyCount}</p>
          </article>
        </section>

        <form className="border-input mt-6 grid gap-3 rounded-xl border p-4 sm:grid-cols-[1fr_220px_180px_auto] sm:items-end">
          <label className="text-sm font-medium">
            ค้นหา Asset
            <input
              name="q"
              defaultValue={query.q ?? ""}
              placeholder="ชื่อหรือ Code"
              className="border-input bg-background mt-1 h-10 w-full rounded-md border px-3"
            />
          </label>
          <label className="text-sm font-medium">
            คลัง
            <select
              name="warehouse"
              defaultValue={selectedWarehouseId}
              className="border-input bg-background mt-1 h-10 w-full rounded-md border px-3"
            >
              {activeWarehouses.map((warehouse) => (
                <option key={warehouse.id} value={warehouse.id}>
                  {warehouse.name}
                  {warehouse.is_default ? " (คลังหลัก)" : ""}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm font-medium">
            สถานะ
            <select
              name="status"
              defaultValue={statusFilter}
              className="border-input bg-background mt-1 h-10 w-full rounded-md border px-3"
            >
              <option value="">ทั้งหมด</option>
              <option value="normal">ปกติ</option>
              <option value="low">ใกล้หมด</option>
              <option value="empty">หมด</option>
            </select>
          </label>
          <Button type="submit" variant="outline">
            กรอง
          </Button>
        </form>

        <section className="border-input mt-6 overflow-hidden rounded-xl border">
          {assetError ? (
            <p className="p-5 text-sm text-red-600">โหลด Inventory ไม่สำเร็จ</p>
          ) : rows.length ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[840px] text-left text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="px-5 py-3">Asset</th>
                    <th className="px-5 py-3">คลัง</th>
                    <th className="px-5 py-3 text-right">คงเหลือ</th>
                    <th className="px-5 py-3 text-right">รับเข้าวันนี้</th>
                    <th className="px-5 py-3">สถานะ</th>
                  </tr>
                </thead>
                <tbody className="divide-input divide-y">
                  {rows.map((row) => {
                    const status = statusLabel[row.status];
                    return (
                      <tr key={row.id}>
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            {imageUrls.get(row.id) ? (
                              <div className="border-input relative size-11 shrink-0 overflow-hidden rounded-lg border">
                                <Image
                                  src={imageUrls.get(row.id)!}
                                  alt={`รูป ${row.name}`}
                                  fill
                                  sizes="44px"
                                  className="object-cover"
                                  unoptimized
                                />
                              </div>
                            ) : (
                              <div className="bg-muted flex size-11 shrink-0 items-center justify-center rounded-lg">
                                <Boxes
                                  className="text-muted-foreground size-5"
                                  aria-hidden="true"
                                />
                              </div>
                            )}
                            <div>
                              <p className="font-medium">{row.name}</p>
                              <p className="text-muted-foreground text-xs">
                                {row.code}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          {selectedWarehouse?.name ?? "—"}
                        </td>
                        <td className="px-5 py-4 text-right font-medium tabular-nums">
                          {formatQuantity(row.balance, row.decimal_places)}{" "}
                          {row.unit}
                        </td>
                        <td className="px-5 py-4 text-right text-emerald-700 tabular-nums">
                          +
                          {formatQuantity(
                            row.receivedToday,
                            row.decimal_places,
                          )}{" "}
                          {row.unit}
                        </td>
                        <td className="px-5 py-4">
                          <span
                            className={`rounded-full px-2.5 py-1 text-xs ${status.className}`}
                          >
                            {status.label}
                          </span>
                          {row.threshold > 0 && (
                            <p className="text-muted-foreground mt-2 text-xs">
                              แจ้งเตือนต่ำกว่า{" "}
                              {formatQuantity(
                                row.threshold,
                                row.decimal_places,
                              )}{" "}
                              {row.unit}
                            </p>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-8 text-center">
              <CircleCheck
                className="mx-auto size-8 text-emerald-600"
                aria-hidden="true"
              />
              <p className="mt-3 font-medium">ไม่พบ Asset ตามตัวกรอง</p>
            </div>
          )}
        </section>
      </main>
    </>
  );
}
