import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { AppHeader } from "@/components/clan/app-header";
import {
  AssetActions,
  CreateAssetForm,
} from "@/components/clan/inventory-management-forms";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function AssetsPage({
  params,
  searchParams,
}: {
  params: Promise<{ clanSlug: string }>;
  searchParams: Promise<{
    created?: string;
    updated?: string;
    deactivated?: string;
    error?: string;
  }>;
}) {
  const [{ clanSlug }, query] = await Promise.all([params, searchParams]);
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  if (typeof claims?.claims?.sub !== "string")
    redirect(`/login?next=${encodeURIComponent(`/c/${clanSlug}/assets`)}`);
  const { data: clan } = await supabase
    .from("clans")
    .select("id,name,slug")
    .eq("slug", clanSlug)
    .maybeSingle();
  if (!clan) notFound();
  const [{ data: assets, error }, { data: canManage }] = await Promise.all([
    supabase
      .from("assets")
      .select(
        "id,code,name,asset_type,unit,image_url,decimal_places,allow_negative,is_active",
      )
      .eq("clan_id", clan.id)
      .order("is_active", { ascending: false })
      .order("code"),
    supabase.rpc("has_clan_permission", {
      p_clan_id: clan.id,
      p_permission_code: "asset.manage",
    }),
  ]);
  const notice = query.created
    ? "สร้าง Asset แล้ว"
    : query.updated
      ? "แก้ไข Asset แล้ว"
      : query.deactivated
        ? "ปิดใช้งาน Asset แล้ว"
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
            <h1 className="mt-4 text-3xl font-bold">Assets</h1>
            <p className="text-muted-foreground mt-2">
              เงินและไอเทมของ {clan.name}
            </p>
          </div>
          <Button asChild variant="outline">
            <Link href={`/c/${clan.slug}/warehouses`}>Warehouses</Link>
          </Button>
        </div>
        {notice && (
          <p
            className="mt-6 rounded-md bg-emerald-50 p-3 text-sm text-emerald-800"
            role="status"
          >
            {notice}
          </p>
        )}
        {query.error && (
          <p
            className="mt-6 rounded-md bg-red-50 p-3 text-sm text-red-800"
            role="alert"
          >
            {query.error === "asset-balance"
              ? "ปิด Asset ไม่ได้ เพราะยังมียอดคงเหลือ"
              : "ปิด Asset ไม่สำเร็จ"}
          </p>
        )}
        {canManage && (
          <section className="border-input mt-8 rounded-xl border p-5 sm:p-6">
            <h2 className="text-lg font-semibold">สร้าง Asset</h2>
            <div className="mt-5">
              <CreateAssetForm clanSlug={clan.slug} />
            </div>
          </section>
        )}
        <section className="mt-8 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Asset ทั้งหมด</h2>
            <span className="text-muted-foreground text-sm">
              {assets?.length ?? 0} รายการ
            </span>
          </div>
          {error ? (
            <p className="text-sm text-red-600">โหลด Assets ไม่สำเร็จ</p>
          ) : assets?.length ? (
            assets.map((asset) => (
              <article
                key={asset.id}
                className="border-input rounded-xl border p-5 sm:p-6"
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-semibold">{asset.name}</h3>
                      <span className="bg-muted rounded-full px-2.5 py-1 text-xs">
                        {asset.code}
                      </span>
                    </div>
                    <p className="text-muted-foreground mt-2 text-sm">
                      {asset.asset_type === "CURRENCY" ? "Currency" : "Item"} ·
                      หน่วย {asset.unit} · ทศนิยม {asset.decimal_places} ตำแหน่ง
                      {asset.allow_negative ? " · อนุญาตยอดติดลบ" : ""}
                    </p>
                  </div>
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs ${asset.is_active ? "bg-emerald-100 text-emerald-800" : "bg-muted text-muted-foreground"}`}
                  >
                    {asset.is_active ? "Active" : "Inactive"}
                  </span>
                </div>
                <AssetActions
                  clanSlug={clan.slug}
                  asset={asset}
                  canManage={Boolean(canManage)}
                />
              </article>
            ))
          ) : (
            <p className="text-muted-foreground rounded-xl border p-5 text-sm">
              ยังไม่มี Asset
            </p>
          )}
        </section>
      </main>
    </>
  );
}
