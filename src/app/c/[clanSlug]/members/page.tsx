import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { AddMemberForm } from "@/components/clan/add-member-form";
import { AppHeader } from "@/components/clan/app-header";
import {
  MemberRoleForm,
  MemberRowActions,
} from "@/components/clan/clan-management-forms";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function ClanMembersPage({
  params,
  searchParams,
}: {
  params: Promise<{ clanSlug: string }>;
  searchParams: Promise<{
    added?: string;
    updated?: string;
    roleUpdated?: string;
    removed?: string;
    error?: string;
  }>;
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

  const [{ data: members, error }, { data: roles }, { data: canManage }] =
    await Promise.all([
      supabase
        .from("clan_members")
        .select(
          "id,user_id,role_id,character_name,status,joined_at,role:clan_roles!clan_members_clan_id_role_id_fkey(name)",
        )
        .eq("clan_id", clan.id)
        .eq("status", "ACTIVE")
        .order("joined_at", { ascending: true }),
      supabase
        .from("clan_roles")
        .select("id,name")
        .eq("clan_id", clan.id)
        .order("name"),
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
        {query.updated === "1" && (
          <p
            className="mt-6 rounded-md bg-emerald-50 p-3 text-sm text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200"
            role="status"
          >
            แก้ไขชื่อสมาชิกแล้ว
          </p>
        )}
        {query.removed === "1" && (
          <p
            className="mt-6 rounded-md bg-emerald-50 p-3 text-sm text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200"
            role="status"
          >
            นำสมาชิกออกแล้ว
          </p>
        )}
        {query.roleUpdated === "1" && (
          <p
            className="mt-6 rounded-md bg-emerald-50 p-3 text-sm text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200"
            role="status"
          >
            เปลี่ยน Role สมาชิกแล้ว
          </p>
        )}
        {query.error && (
          <p
            className="mt-6 rounded-md bg-red-50 p-3 text-sm text-red-800 dark:bg-red-950 dark:text-red-200"
            role="alert"
          >
            {query.error === "last-manager"
              ? "ไม่สามารถนำ Manager คนสุดท้ายออกได้"
              : "นำสมาชิกออกไม่สำเร็จ"}
          </p>
        )}

        <div className="mt-8 space-y-6">
          {canManage ? (
            <section className="border-input rounded-xl border p-5 sm:p-6">
              <h2 className="text-lg font-semibold">เพิ่มสมาชิก</h2>
              <div className="mt-5 max-w-xl">
                <AddMemberForm clanSlug={clan.slug} />
              </div>
            </section>
          ) : (
            <section className="bg-muted rounded-xl p-5">
              <p className="text-sm">
                คุณดูรายชื่อสมาชิกได้ แต่ไม่มีสิทธิ์เพิ่มสมาชิก
              </p>
            </section>
          )}

          <section className="border-input overflow-hidden rounded-xl border">
            <div className="border-input flex items-center justify-between border-b px-5 py-4">
              <h2 className="font-semibold">รายชื่อสมาชิก</h2>
              <p className="text-muted-foreground text-sm">
                {members?.length ?? 0} คน
              </p>
            </div>
            {error ? (
              <p className="p-5 text-sm text-red-700" role="alert">
                โหลดรายชื่อสมาชิกไม่สำเร็จ
              </p>
            ) : members?.length ? (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[720px] text-left text-sm">
                  <thead className="bg-muted/50 text-muted-foreground">
                    <tr>
                      <th scope="col" className="px-5 py-3 font-medium">
                        ชื่อตัวละคร
                      </th>
                      <th scope="col" className="px-5 py-3 font-medium">
                        สถานะบัญชี
                      </th>
                      <th scope="col" className="px-5 py-3 font-medium">
                        Role
                      </th>
                      {canManage && (
                        <th scope="col" className="px-5 py-3 font-medium">
                          จัดการ
                        </th>
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-input divide-y">
                    {members.map((member) => (
                      <tr key={member.id} className="align-top">
                        <td className="px-5 py-4 font-medium">
                          {member.character_name}
                        </td>
                        <td className="text-muted-foreground px-5 py-4">
                          {member.user_id
                            ? "เชื่อมกับบัญชีแล้ว"
                            : "ยังไม่มีบัญชี"}
                        </td>
                        <td className="px-5 py-4">
                          {canManage && roles?.length ? (
                            <MemberRoleForm
                              clanSlug={clan.slug}
                              memberId={member.id}
                              roleId={member.role_id}
                              roles={roles}
                            />
                          ) : (
                            <span className="bg-muted rounded-full px-2.5 py-1 text-xs font-medium">
                              {member.role.name}
                            </span>
                          )}
                        </td>
                        {canManage && (
                          <td className="px-5 py-3">
                            <MemberRowActions
                              clanSlug={clan.slug}
                              memberId={member.id}
                              characterName={member.character_name}
                            />
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-muted-foreground p-5 text-sm">
                ยังไม่มีสมาชิก
              </p>
            )}
          </section>
        </div>
      </main>
    </>
  );
}
