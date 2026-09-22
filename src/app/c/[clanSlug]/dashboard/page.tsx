import Link from "next/link";
import {
  Package,
  Settings2,
  ShieldCheck,
  UsersRound,
  Warehouse,
} from "lucide-react";
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

  const [{ data: membership }, { data: warehouse }, { data: members }] =
    await Promise.all([
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
      supabase
        .from("clan_members")
        .select(
          "id,character_name,user_id,role:clan_roles!clan_members_clan_id_role_id_fkey(name)",
        )
        .eq("clan_id", clan.id)
        .eq("status", "ACTIVE")
        .order("joined_at", { ascending: true }),
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
            <div className="mt-2 flex items-center gap-3">
              <h1 className="text-3xl font-bold tracking-tight">{clan.name}</h1>
              <div className="flex items-center gap-2">
                <Button
                  asChild
                  size="sm"
                  className="size-9 p-0"
                  aria-label="จัดการสมาชิก"
                  title="จัดการสมาชิก"
                >
                  <Link href={`/c/${clan.slug}/members`}>
                    <UsersRound className="size-4" aria-hidden="true" />
                  </Link>
                </Button>
                <Button
                  asChild
                  size="sm"
                  variant="warning"
                  className="size-9 p-0"
                  aria-label="แก้ไข Clan/Gang"
                  title="แก้ไข Clan/Gang"
                >
                  <Link href={`/c/${clan.slug}/settings`}>
                    <Settings2 className="size-4" aria-hidden="true" />
                  </Link>
                </Button>
              </div>
            </div>
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

        <section className="mt-8 grid gap-3 sm:grid-cols-3">
          <Button
            asChild
            variant="outline"
            className="h-auto justify-start p-4"
          >
            <Link href={`/c/${clan.slug}/roles`}>
              <ShieldCheck className="text-primary size-5" aria-hidden="true" />{" "}
              Roles และ Permissions
            </Link>
          </Button>
          <Button
            asChild
            variant="outline"
            className="h-auto justify-start p-4"
          >
            <Link href={`/c/${clan.slug}/assets`}>
              <Package className="text-primary size-5" aria-hidden="true" />{" "}
              Assets
            </Link>
          </Button>
          <Button
            asChild
            variant="outline"
            className="h-auto justify-start p-4"
          >
            <Link href={`/c/${clan.slug}/warehouses`}>
              <Warehouse className="text-primary size-5" aria-hidden="true" />{" "}
              Warehouses
            </Link>
          </Button>
        </section>

        <section className="border-input mt-8 overflow-hidden rounded-xl border">
          <div className="border-input flex items-center justify-between border-b px-5 py-4">
            <div className="flex items-center gap-2">
              <UsersRound className="text-primary size-5" aria-hidden="true" />
              <h2 className="text-xl font-semibold">รายชื่อสมาชิก</h2>
            </div>
            <span className="text-muted-foreground text-sm">
              {members?.length ?? 0} คน
            </span>
          </div>
          {members?.length ? (
            <ul className="divide-input divide-y">
              {members.map((member) => (
                <li
                  key={member.id}
                  className="flex items-center justify-between gap-4 px-5 py-4"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium">
                      {member.character_name}
                    </p>
                    <p className="text-muted-foreground mt-1 text-xs">
                      {member.user_id
                        ? "เชื่อมกับบัญชีแล้ว"
                        : "สมาชิกที่ยังไม่มีบัญชี"}
                    </p>
                  </div>
                  <span className="bg-muted shrink-0 rounded-full px-2.5 py-1 text-xs font-medium">
                    {member.role.name}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-muted-foreground px-5 py-6 text-sm">
              ยังไม่มีสมาชิก
            </p>
          )}
        </section>
      </main>
    </>
  );
}
