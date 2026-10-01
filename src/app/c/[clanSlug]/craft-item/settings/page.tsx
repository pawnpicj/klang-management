import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { AppHeader } from "@/components/clan/app-header";
import { CraftSettingsForm } from "@/components/clan/craft-settings-form";
import { ActionNotice } from "@/components/ui/action-notice";
import { createClient } from "@/lib/supabase/server";
export const dynamic = "force-dynamic";
export default async function CraftSettingsPage({
  params,
  searchParams,
}: {
  params: Promise<{ clanSlug: string }>;
  searchParams: Promise<{ saved?: string }>;
}) {
  const [{ clanSlug }, query] = await Promise.all([params, searchParams]);
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  if (typeof claims?.claims?.sub !== "string")
    redirect(
      `/login?next=${encodeURIComponent(`/c/${clanSlug}/craft-item/settings`)}`,
    );
  const { data: clan } = await supabase
    .from("clans")
    .select("id,name,slug")
    .eq("slug", clanSlug)
    .maybeSingle();
  if (!clan) notFound();
  const [permission, warehouses, settings] = await Promise.all([
    supabase.rpc("has_clan_permission", {
      p_clan_id: clan.id,
      p_permission_code: "craft.manage",
    }),
    supabase
      .from("warehouses")
      .select("id,name,is_default")
      .eq("clan_id", clan.id)
      .eq("is_active", true)
      .order("name"),
    supabase
      .from("craft_settings")
      .select("warehouse_id")
      .eq("clan_id", clan.id)
      .maybeSingle(),
  ]);
  if (!permission.data) notFound();
  if (warehouses.error || settings.error)
    throw new Error("โหลดการตั้งค่า Craft Item ไม่สำเร็จ");
  const rows = warehouses.data ?? [];
  const selected = rows.some(
    (warehouse) => warehouse.id === settings.data?.warehouse_id,
  )
    ? settings.data!.warehouse_id
    : (rows.find((warehouse) => warehouse.is_default)?.id ?? rows[0]?.id ?? "");
  return (
    <>
      <AppHeader activeClan={clan.name} />
      <main className="mx-auto w-full max-w-3xl px-5 py-10 sm:px-6">
        <Link
          className="text-primary text-sm hover:underline"
          href={`/c/${clan.slug}/craft-item`}
        >
          ← กลับ Craft Item
        </Link>
        <h1 className="mt-4 text-3xl font-bold">ตั้งค่า Craft Item</h1>
        {query.saved === "1" && (
          <ActionNotice
            queryKeys={["saved"]}
            className="mt-6 rounded-md bg-emerald-50 p-3 text-sm text-emerald-800"
          >
            บันทึกการตั้งค่าแล้ว
          </ActionNotice>
        )}
        <section className="border-input mt-6 rounded-xl border p-5">
          <CraftSettingsForm
            key={selected}
            clanSlug={clan.slug}
            warehouses={rows}
            selectedWarehouseId={selected}
          />
        </section>
      </main>
    </>
  );
}
