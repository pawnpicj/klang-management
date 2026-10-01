import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { AppHeader } from "@/components/clan/app-header";
import { CraftItem } from "@/components/clan/craft-item";
import { createClient } from "@/lib/supabase/server";
import { getAssetImageUrls } from "@/lib/supabase/asset-images";
import { resolveRecipes } from "@/features/crafting/recipes";
import { htmlId } from "@/lib/html-id";

export const dynamic = "force-dynamic";
export default async function CraftItemPage({
  params,
}: {
  params: Promise<{ clanSlug: string }>;
}) {
  const { clanSlug } = await params;
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  if (typeof claims?.claims?.sub !== "string")
    redirect(`/login?next=${encodeURIComponent(`/c/${clanSlug}/craft-item`)}`);
  const { data: clan } = await supabase
    .from("clans")
    .select("id,name,slug")
    .eq("slug", clanSlug)
    .maybeSingle();
  if (!clan) notFound();
  const [
    view,
    manage,
    inventory,
    recipeRows,
    assetRows,
    warehouseRows,
    balanceRows,
    settings,
  ] = await Promise.all([
    supabase.rpc("has_clan_permission", {
      p_clan_id: clan.id,
      p_permission_code: "craft.view",
    }),
    supabase.rpc("has_clan_permission", {
      p_clan_id: clan.id,
      p_permission_code: "craft.manage",
    }),
    supabase.rpc("has_clan_permission", {
      p_clan_id: clan.id,
      p_permission_code: "inventory.view",
    }),
    supabase
      .from("craft_recipes")
      .select("id,name,output,materials,updated_at")
      .eq("clan_id", clan.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("assets")
      .select("id,name,unit,image_url,is_active")
      .eq("clan_id", clan.id)
      .order("name"),
    supabase
      .from("warehouses")
      .select("id,name,is_default")
      .eq("clan_id", clan.id)
      .eq("is_active", true)
      .order("name"),
    supabase
      .from("warehouse_asset_balances")
      .select("warehouse_id,asset_id,balance")
      .eq("clan_id", clan.id),
    supabase
      .from("craft_settings")
      .select("warehouse_id")
      .eq("clan_id", clan.id)
      .maybeSingle(),
  ]);
  if (!view.data) notFound();
  if (recipeRows.error || assetRows.error || settings.error)
    throw new Error("โหลดสูตรคราฟต์ไม่สำเร็จ");
  const [recipes, images] = await Promise.all([
    resolveRecipes(supabase, recipeRows.data ?? []),
    getAssetImageUrls(supabase, assetRows.data ?? []),
  ]);
  const activeWarehouses = warehouseRows.data ?? [];
  const warehouseId = activeWarehouses.some(
    (warehouse) => warehouse.id === settings.data?.warehouse_id,
  )
    ? settings.data!.warehouse_id
    : (activeWarehouses.find((warehouse) => warehouse.is_default)?.id ??
      activeWarehouses[0]?.id ??
      "");
  return (
    <>
      <AppHeader activeClan={clan.name} />
      <main
        id={htmlId("craft_item_craft_item_page_main")}
        className="mx-auto w-full max-w-6xl px-5 py-10 sm:px-6"
      >
        <Link
          id={htmlId("craft_item_craft_item_page_dashboard")}
          className="text-primary text-sm hover:underline"
          href={`/c/${clan.slug}/dashboard`}
        >
          ← กลับ Dashboard
        </Link>
        <h1
          id={htmlId("craft_item_craft_item_page_craft_item")}
          className="mt-4 text-3xl font-bold"
        >
          Craft Item
        </h1>
        <CraftItem
          key={
            (recipeRows.data ?? [])
              .map((row) => `${row.id}:${row.updated_at}`)
              .join(",") + warehouseId
          }
          clanSlug={clan.slug}
          initialRecipes={recipes}
          assets={(assetRows.data ?? []).map((asset) => ({
            id: asset.id,
            name: asset.name,
            unit: asset.unit,
            isActive: asset.is_active,
            imageUrl: images.get(asset.id) ?? null,
          }))}
          warehouseId={warehouseId}
          balances={Object.fromEntries(
            (balanceRows.data ?? []).map((row) => [
              `${row.warehouse_id}:${row.asset_id}`,
              Number(row.balance),
            ]),
          )}
          canManage={Boolean(manage.data)}
          canViewInventory={
            Boolean(inventory.data) &&
            !balanceRows.error &&
            !warehouseRows.error
          }
        />
      </main>
    </>
  );
}
