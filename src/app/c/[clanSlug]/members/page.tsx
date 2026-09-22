import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { AddMemberForm } from "@/components/clan/add-member-form";
import { AppHeader } from "@/components/clan/app-header";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function ClanMembersPage({
  params,
  searchParams,
}: {
  params: Promise<{ clanSlug: string }>;
  searchParams: Promise<{ added?: string }>;
}) {
  const [{ clanSlug }, query] = await Promise.all([params, searchParams]);
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  if (typeof claimsData?.claims?.sub !== "string") {
    redirect(`/login?next=${encodeURIComponent(`/c/${clanSlug}/members`)}`);
  }

  const { data: clan } = await supabase
    .from("clans")
    .select("id,name,slug")
    .eq("slug", clanSlug)
    .maybeSingle();
  if (!clan) notFound();

  const [{ data: members, error }, { data: canManage }] = await Promise.all([
    supabase
      .from("clan_members")
      .select(
        "id,user_id,character_name,status,joined_at,role:clan_roles!clan_members_clan_id_role_id_fkey(name)",
      )
      .eq("clan_id", clan.id)
      .eq("status", "ACTIVE")
      .order("joined_at", { ascending: true }),
    supabase.rpc("has_clan_permission", {
      p_clan_id: clan.id,
      p_permission_code: "member.manage",
    }),
  ]);

  return (
    <>
      <AppHeader activeClan={clan.name} />
      <main className="mx-auto w-full max-w-5xl px-5 py-10 sm:px-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <Link
              href={`/c/${clan.slug}/dashboard`}
              className="text-primary text-sm font-medium underline-offset-4 hover:underline"
            >
              ← กลับ Dashboard
            </Link>
            <h1 className="mt-4 text-3xl font-bold tracking-tight">สมาชิก</h1>
            <p className="text-muted-foreground mt-2">{clan.name}</p>
          </div>
          <Button asChild variant="outline">
            <Link href="/clans">เปลี่ยน Clan/Gang</Link>
          </Button>
        </div>

        {query.added === "1" && (
          <p
            className="mt-6 rounded-md bg-emerald-50 p-3 text-sm text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200"
            role="status"
          >
            เพิ่มสมาชิกแล้ว
          </p>
        )}

        <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
          <section className="border-input overflow-hidden rounded-xl border">
            <div className="border-input border-b px-5 py-4">
              <h2 className="font-semibold">รายชื่อสมาชิก</h2>
              <p className="text-muted-foreground mt-1 text-sm">
                {members?.length ?? 0} คน
              </p>
            </div>
            {error ? (
              <p className="p-5 text-sm text-red-700" role="alert">
                โหลดรายชื่อสมาชิกไม่สำเร็จ
              </p>
            ) : members?.length ? (
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
              <p className="text-muted-foreground p-5 text-sm">
                ยังไม่มีสมาชิก
              </p>
            )}
          </section>

          {canManage ? (
            <section className="border-input h-fit rounded-xl border p-5">
              <h2 className="text-lg font-semibold">เพิ่มสมาชิก</h2>
              <p className="text-muted-foreground mt-2 text-sm leading-6">
                สมาชิกไม่จำเป็นต้องสมัครบัญชี และจะได้รับ Role Member อัตโนมัติ
              </p>
              <div className="mt-5">
                <AddMemberForm clanSlug={clan.slug} />
              </div>
            </section>
          ) : (
            <section className="bg-muted h-fit rounded-xl p-5">
              <p className="text-sm">
                คุณดูรายชื่อสมาชิกได้ แต่ไม่มีสิทธิ์เพิ่มสมาชิก
              </p>
            </section>
          )}
        </div>
      </main>
    </>
  );
}
