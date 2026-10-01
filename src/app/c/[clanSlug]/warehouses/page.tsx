import { ActionNotice } from "@/components/ui/action-notice";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { AppHeader } from "@/components/clan/app-header";
import {
  CreateWarehouseForm,
  WarehouseActions,
} from "@/components/clan/inventory-management-forms";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function WarehousesPage({
  params,
  searchParams,
}: {
  params: Promise<{ clanSlug: string }>;
  searchParams: Promise<{
    created?: string;
    updated?: string;
    defaultChanged?: string;
    deactivated?: string;
    error?: string;
  }>;
}) {
  const [{ clanSlug }, query] = await Promise.all([params, searchParams]);
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  if (typeof claims?.claims?.sub !== "string")
    redirect(`/login?next=${encodeURIComponent(`/c/${clanSlug}/warehouses`)}`);
  const { data: clan } = await supabase
    .from("clans")
    .select("id,name,slug")
    .eq("slug", clanSlug)
    .maybeSingle();
  if (!clan) notFound();
  const [
    { data: warehouses, error },
    { data: balances },
    { data: canCreate },
    { data: canEdit },
  ] = await Promise.all([
    supabase
      .from("warehouses")
      .select("id,name,description,is_default,is_active,sort_order")
      .eq("clan_id", clan.id)
      .order("is_active", { ascending: false })
      .order("is_default", { ascending: false })
      .order("sort_order")
      .order("name"),
    supabase
      .from("warehouse_asset_balances")
      .select("warehouse_id,balance")
      .eq("clan_id", clan.id),
    supabase.rpc("has_clan_permission", {
      p_clan_id: clan.id,
      p_permission_code: "warehouse.create",
    }),
    supabase.rpc("has_clan_permission", {
      p_clan_id: clan.id,
      p_permission_code: "warehouse.edit",
    }),
  ]);
  const balanceCounts = new Map<string, number>();
  for (const row of balances ?? [])
    if (row.warehouse_id && Number(row.balance) !== 0)
      balanceCounts.set(
        row.warehouse_id,
        (balanceCounts.get(row.warehouse_id) ?? 0) + 1,
      );
  const notice = query.created
    ? "สร้าง Warehouse แล้ว"
    : query.updated
      ? "แก้ไข Warehouse แล้ว"
      : query.defaultChanged
        ? "เปลี่ยน Default Warehouse แล้ว"
        : query.deactivated
          ? "ปิดใช้งาน Warehouse แล้ว"
          : null;
  return (
    <>
      <AppHeader activeClan={clan.name} />
      <main className="mx-auto w-full max-w-5xl px-5 py-10 sm:px-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <Link
              href={`/c/${clan.slug}/dashboard`}
              className="text-primary text-sm font-medium hover:underline"
            >
              ← กลับ Dashboard
            </Link>
            <h1 className="mt-4 text-3xl font-bold">Warehouses</h1>
            <p className="text-muted-foreground mt-2">คลังของ {clan.name}</p>
          </div>
          <Button asChild variant="outline">
            <Link href={`/c/${clan.slug}/assets`}>Assets</Link>
          </Button>
        </div>
        {notice && (
          <ActionNotice
            queryKeys={["created", "updated", "defaultChanged", "deactivated"]}
            className="mt-6 rounded-md bg-emerald-50 p-3 text-sm text-emerald-800"
          >
            {notice}
          </ActionNotice>
        )}
        {query.error && (
          <p
            className="mt-6 rounded-md bg-red-50 p-3 text-sm text-red-800"
            role="alert"
          >
            {query.error === "warehouse-balance"
              ? "ปิด Warehouse ไม่ได้: ต้องไม่ใช่ Default และต้องไม่มียอดคงเหลือ"
              : "ดำเนินการกับ Warehouse ไม่สำเร็จ"}
          </p>
        )}
        {canCreate && (
          <section className="border-input mt-8 rounded-xl border p-5 sm:p-6">
            <h2 className="text-lg font-semibold">สร้าง Warehouse</h2>
            <div className="mt-5">
              <CreateWarehouseForm clanSlug={clan.slug} />
            </div>
          </section>
        )}
        <section className="mt-8 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Warehouse ทั้งหมด</h2>
            <span className="text-muted-foreground text-sm">
              {warehouses?.length ?? 0} แห่ง
            </span>
          </div>
          {error ? (
            <p className="text-sm text-red-600">โหลด Warehouses ไม่สำเร็จ</p>
          ) : (
            warehouses?.map((warehouse) => (
              <article
                key={warehouse.id}
                className="border-input rounded-xl border p-5 sm:p-6"
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/c/${clan.slug}/warehouses/${warehouse.id}`}
                        className="text-lg font-semibold hover:underline"
                      >
                        {warehouse.name}
                      </Link>
                      {warehouse.is_default && (
                        <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs text-amber-800">
                          Default
                        </span>
                      )}
                    </div>
                    <p className="text-muted-foreground mt-2 text-sm">
                      {warehouse.description || "ไม่มีคำอธิบาย"} ·{" "}
                      {balanceCounts.get(warehouse.id) ?? 0} Asset ที่มียอด
                    </p>
                  </div>
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs ${warehouse.is_active ? "bg-emerald-100 text-emerald-800" : "bg-muted text-muted-foreground"}`}
                  >
                    {warehouse.is_active ? "Active" : "Inactive"}
                  </span>
                </div>
                <WarehouseActions
                  clanSlug={clan.slug}
                  warehouse={warehouse}
                  canEdit={Boolean(canEdit)}
                />
              </article>
            ))
          )}
        </section>
      </main>
    </>
  );
}
