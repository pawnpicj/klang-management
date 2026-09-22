import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { AppHeader } from "@/components/clan/app-header";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function ClanDashboardPage({
  params,
}: {
  params: Promise<{ clanSlug: string }>;
}) {
  const { clanSlug } = await params;
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;
  if (typeof userId !== "string") {
    redirect(`/login?next=${encodeURIComponent(`/c/${clanSlug}/dashboard`)}`);
  }

  const { data: clan } = await supabase
    .from("clans")
    .select("id,name,slug,type,status,game_name,server_name")
    .eq("slug", clanSlug)
    .maybeSingle();
  if (!clan) notFound();

  const [{ data: membership }, { data: warehouse }] = await Promise.all([
    supabase
      .from("clan_members")
      .select(
        "character_name, role:clan_roles!clan_members_clan_id_role_id_fkey(name)",
      )
      .eq("clan_id", clan.id)
      .eq("user_id", userId)
      .eq("status", "ACTIVE")
      .maybeSingle(),
    supabase
      .from("warehouses")
      .select("id,name")
      .eq("clan_id", clan.id)
      .eq("is_default", true)
      .eq("is_active", true)
      .maybeSingle(),
  ]);
  if (!membership) notFound();

  return (
    <>
      <AppHeader activeClan={clan.name} />
      <main className="mx-auto w-full max-w-5xl px-5 py-10 sm:px-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-primary text-sm font-semibold">
              {clan.type === "CLAN" ? "Clan" : "Gang"} · {clan.slug}
            </p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight">
              {clan.name}
            </h1>
            {(clan.game_name || clan.server_name) && (
              <p className="text-muted-foreground mt-2">
                {[clan.game_name, clan.server_name].filter(Boolean).join(" · ")}
              </p>
            )}
          </div>
          <Button asChild variant="outline">
            <Link href="/clans">เปลี่ยน Clan/Gang</Link>
          </Button>
        </div>

        <section className="mt-8 grid gap-4 sm:grid-cols-3">
          <div className="border-input rounded-xl border p-5">
            <p className="text-muted-foreground text-sm">ตัวละคร</p>
            <p className="mt-2 text-lg font-semibold">
              {membership.character_name}
            </p>
          </div>
          <div className="border-input rounded-xl border p-5">
            <p className="text-muted-foreground text-sm">บทบาท</p>
            <p className="mt-2 text-lg font-semibold">{membership.role.name}</p>
          </div>
          <div className="border-input rounded-xl border p-5">
            <p className="text-muted-foreground text-sm">คลังหลัก</p>
            <p className="mt-2 text-lg font-semibold">
              {warehouse?.name ?? "ไม่พบข้อมูล"}
            </p>
          </div>
        </section>

        <section className="border-input mt-8 rounded-xl border p-6">
          <h2 className="text-xl font-semibold">พื้นที่พร้อมใช้งาน</h2>
          <p className="text-muted-foreground mt-2 leading-7">
            โครงสร้าง Clan, บทบาทเริ่มต้น และ Main Warehouse ถูกสร้างครบแล้ว
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            <Button asChild>
              <Link href={`/c/${clan.slug}/members`}>จัดการสมาชิก</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href={`/c/${clan.slug}/settings`}>แก้ไข Clan/Gang</Link>
            </Button>
          </div>
        </section>
      </main>
    </>
  );
}
