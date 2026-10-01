import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { AppHeader } from "@/components/clan/app-header";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";
import { htmlId } from "@/lib/html-id";

export const dynamic = "force-dynamic";
const quantity = (value: number, decimals: number) =>
  new Intl.NumberFormat("th-TH", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);

export default async function WarehouseDetailPage({
  params,
}: {
  params: Promise<{ clanSlug: string; warehouseId: string }>;
}) {
  const { clanSlug, warehouseId } = await params;
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  if (typeof claims?.claims?.sub !== "string")
    redirect(
      `/login?next=${encodeURIComponent(`/c/${clanSlug}/warehouses/${warehouseId}`)}`,
    );
  const { data: clan } = await supabase
    .from("clans")
    .select("id,name,slug")
    .eq("slug", clanSlug)
    .maybeSingle();
  if (!clan) notFound();
  const [{ data: warehouse }, { data: balances }, { data: assets }] =
    await Promise.all([
      supabase
        .from("warehouses")
        .select("id,name,description,is_default,is_active")
        .eq("clan_id", clan.id)
        .eq("id", warehouseId)
        .maybeSingle(),
      supabase
        .from("warehouse_asset_balances")
        .select("asset_id,balance")
        .eq("clan_id", clan.id)
        .eq("warehouse_id", warehouseId),
      supabase
        .from("assets")
        .select("id,code,name,unit,decimal_places,is_active")
        .eq("clan_id", clan.id)
        .order("code"),
    ]);
  if (!warehouse) notFound();
  const balanceMap = new Map(
    (balances ?? []).map((row) => [row.asset_id, Number(row.balance)]),
  );
  const rows = (assets ?? []).filter(
    (asset) => (balanceMap.get(asset.id) ?? 0) !== 0,
  );
  return (
    <>
      <AppHeader activeClan={clan.name} />
      <main
        id={htmlId("warehouse_id_warehouse_detail_page_main")}
        className="mx-auto w-full max-w-5xl px-5 py-10 sm:px-6"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <Link
              id={htmlId("warehouse_id_warehouse_detail_page_warehouses")}
              href={`/c/${clan.slug}/warehouses`}
              className="text-primary text-sm font-medium hover:underline"
            >
              ← กลับ Warehouses
            </Link>
            <div className="mt-4 flex items-center gap-2">
              <h1
                id={htmlId("warehouse_id_warehouse_detail_page_warehouse_name")}
                className="text-3xl font-bold"
              >
                {warehouse.name}
              </h1>
              {warehouse.is_default && (
                <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs text-amber-800 dark:bg-amber-900 dark:text-amber-200">
                  Default
                </span>
              )}
            </div>
            <p
              id={htmlId("warehouse_id_warehouse_detail_page_p")}
              className="text-muted-foreground mt-2"
            >
              {warehouse.description || "ไม่มีคำอธิบาย"}
            </p>
          </div>
          <Button
            id={htmlId("warehouse_id_warehouse_detail_page_button")}
            asChild
            variant="outline"
          >
            <Link
              id={htmlId("warehouse_id_warehouse_detail_page_assets")}
              href={`/c/${clan.slug}/assets`}
            >
              จัดการ Assets
            </Link>
          </Button>
        </div>
        <section
          id={htmlId("warehouse_id_warehouse_detail_page_section")}
          className="border-input mt-8 overflow-hidden rounded-xl border"
        >
          <div className="border-input flex items-center justify-between border-b px-5 py-4">
            <h2
              id={htmlId("warehouse_id_warehouse_detail_page_asset")}
              className="font-semibold"
            >
              ยอดคงเหลือแยกตาม Asset
            </h2>
            <span className="text-muted-foreground text-sm">
              {rows.length} รายการ
            </span>
          </div>
          {rows.length ? (
            <div className="overflow-x-auto">
              <table
                id={htmlId("warehouse_id_warehouse_detail_page_table")}
                className="w-full min-w-[560px] text-left text-sm"
              >
                <thead
                  id={htmlId("warehouse_id_warehouse_detail_page_thead")}
                  className="bg-muted/50"
                >
                  <tr id={htmlId("warehouse_id_warehouse_detail_page_tr")}>
                    <th
                      id={htmlId("warehouse_id_warehouse_detail_page_code")}
                      className="px-5 py-3"
                    >
                      Code
                    </th>
                    <th
                      id={htmlId("warehouse_id_warehouse_detail_page_asset_2")}
                      className="px-5 py-3"
                    >
                      Asset
                    </th>
                    <th
                      id={htmlId("warehouse_id_warehouse_detail_page_th")}
                      className="px-5 py-3 text-right"
                    >
                      ยอดคงเหลือ
                    </th>
                  </tr>
                </thead>
                <tbody
                  id={htmlId("warehouse_id_warehouse_detail_page_tbody")}
                  className="divide-input divide-y"
                >
                  {rows.map((asset, htmlRowIndex1) => (
                    <tr
                      id={htmlId(
                        "warehouse_id_warehouse_detail_page_tr_2",
                        htmlRowIndex1,
                      )}
                      key={asset.id}
                    >
                      <td
                        id={htmlId(
                          "warehouse_id_warehouse_detail_page_asset_code",
                          htmlRowIndex1,
                        )}
                        className="px-5 py-4 font-medium"
                      >
                        {asset.code}
                      </td>
                      <td
                        id={htmlId(
                          "warehouse_id_warehouse_detail_page_asset_name",
                          htmlRowIndex1,
                        )}
                        className="px-5 py-4"
                      >
                        {asset.name}
                        {!asset.is_active && (
                          <span className="text-muted-foreground ml-2 text-xs">
                            Inactive
                          </span>
                        )}
                      </td>
                      <td
                        id={htmlId(
                          "warehouse_id_warehouse_detail_page_td",
                          htmlRowIndex1,
                        )}
                        className="px-5 py-4 text-right tabular-nums"
                      >
                        {quantity(
                          balanceMap.get(asset.id) ?? 0,
                          asset.decimal_places,
                        )}{" "}
                        {asset.unit}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p
              id={htmlId("warehouse_id_warehouse_detail_page_warehouse")}
              className="text-muted-foreground p-5 text-sm"
            >
              Warehouse นี้ยังไม่มียอดคงเหลือ
            </p>
          )}
        </section>
      </main>
    </>
  );
}
