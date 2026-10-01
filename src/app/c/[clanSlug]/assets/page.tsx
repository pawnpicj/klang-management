import { ActionNotice } from "@/components/ui/action-notice";
import Image from "next/image";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { AppHeader } from "@/components/clan/app-header";
import {
  AssetActions,
  CreateAssetForm,
} from "@/components/clan/inventory-management-forms";
import { Button } from "@/components/ui/button";
import { getAssetImageUrls } from "@/lib/supabase/asset-images";
import { createClient } from "@/lib/supabase/server";
import { htmlId } from "@/lib/html-id";

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
        "id,code,name,required_quantity,low_stock_threshold,image_url,is_active",
      )
      .eq("clan_id", clan.id)
      .order("is_active", { ascending: false })
      .order("code"),
    supabase.rpc("has_clan_permission", {
      p_clan_id: clan.id,
      p_permission_code: "asset.manage",
    }),
  ]);
  const imageUrls = await getAssetImageUrls(supabase, assets ?? []);
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
      <main
        id={htmlId("assets_assets_page_main")}
        className="mx-auto w-full max-w-5xl px-5 py-10 sm:px-6"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <Link
              id={htmlId("assets_assets_page_dashboard")}
              href={`/c/${clan.slug}/dashboard`}
              className="text-primary text-sm font-medium hover:underline"
            >
              ← กลับ Dashboard
            </Link>
            <h1
              id={htmlId("assets_assets_page_assets")}
              className="mt-4 text-3xl font-bold"
            >
              Assets
            </h1>
            <p
              id={htmlId("assets_assets_page_clan_name")}
              className="text-muted-foreground mt-2"
            >
              เงินและไอเทมของ {clan.name}
            </p>
          </div>
          <Button
            id={htmlId("assets_assets_page_button")}
            asChild
            variant="outline"
          >
            <Link
              id={htmlId("assets_assets_page_warehouses")}
              href={`/c/${clan.slug}/warehouses`}
            >
              Warehouses
            </Link>
          </Button>
        </div>
        {notice && (
          <ActionNotice
            queryKeys={["created", "updated", "deactivated"]}
            className="mt-6 rounded-md bg-emerald-50 p-3 text-sm text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200"
          >
            {notice}
          </ActionNotice>
        )}
        {query.error && (
          <p
            id={htmlId("assets_assets_page_p")}
            className="mt-6 rounded-md bg-red-50 p-3 text-sm text-red-800 dark:bg-red-950 dark:text-red-200"
            role="alert"
          >
            {query.error === "asset-balance"
              ? "ปิด Asset ไม่ได้ เพราะยังมียอดคงเหลือ"
              : "ปิด Asset ไม่สำเร็จ"}
          </p>
        )}
        {canManage && (
          <section
            id={htmlId("assets_assets_page_section")}
            className="border-input mt-8 rounded-xl border p-5 sm:p-6"
          >
            <h2
              id={htmlId("assets_assets_page_asset")}
              className="text-lg font-semibold"
            >
              สร้าง Asset
            </h2>
            <div className="mt-5">
              <CreateAssetForm clanSlug={clan.slug} />
            </div>
          </section>
        )}
        <section
          id={htmlId("assets_assets_page_section_2")}
          className="mt-8 space-y-4"
        >
          <div className="flex items-center justify-between">
            <h2
              id={htmlId("assets_assets_page_asset_2")}
              className="text-xl font-semibold"
            >
              Asset ทั้งหมด
            </h2>
            <span className="text-muted-foreground text-sm">
              {assets?.length ?? 0} รายการ
            </span>
          </div>
          {error ? (
            <p
              id={htmlId("assets_assets_page_assets_2")}
              className="text-sm text-red-600"
            >
              โหลด Assets ไม่สำเร็จ
            </p>
          ) : assets?.length ? (
            assets.map((asset, htmlRowIndex1) => (
              <article
                id={htmlId("assets_assets_page_article", htmlRowIndex1)}
                key={asset.id}
                className="border-input bg-background rounded-xl border p-5 shadow-sm sm:p-6"
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="flex items-start gap-4">
                    {imageUrls.get(asset.id) && (
                      <div className="border-input relative size-14 shrink-0 overflow-hidden rounded-lg border">
                        <Image
                          id={htmlId("assets_assets_page_image", htmlRowIndex1)}
                          src={imageUrls.get(asset.id)!}
                          alt={`รูป ${asset.name}`}
                          fill
                          sizes="56px"
                          className="object-cover"
                          unoptimized
                        />
                      </div>
                    )}
                    <div className="flex flex-wrap items-center gap-2">
                      <h3
                        id={htmlId(
                          "assets_assets_page_asset_name",
                          htmlRowIndex1,
                        )}
                        className="text-lg font-semibold"
                      >
                        {asset.name}
                      </h3>
                      <span className="bg-muted rounded-full px-2.5 py-1 text-xs">
                        {asset.code}
                      </span>
                    </div>
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
                  imagePreviewUrl={imageUrls.get(asset.id) ?? null}
                  canManage={Boolean(canManage)}
                />
              </article>
            ))
          ) : (
            <p
              id={htmlId("assets_assets_page_asset_3")}
              className="text-muted-foreground rounded-xl border p-5 text-sm"
            >
              ยังไม่มี Asset
            </p>
          )}
        </section>
      </main>
    </>
  );
}
