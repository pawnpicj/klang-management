import { ActionNotice } from "@/components/ui/action-notice";
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
import { htmlId } from "@/lib/html-id";

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
      <main
        id={htmlId("members_clan_members_page_main")}
        className="mx-auto w-full max-w-5xl px-5 py-10 sm:px-6"
      >
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <Link
              id={htmlId("members_clan_members_page_dashboard")}
              href={`/c/${clan.slug}/dashboard`}
              className="text-primary text-sm font-medium underline-offset-4 hover:underline"
            >
              ← กลับ Dashboard
            </Link>
            <h1
              id={htmlId("members_clan_members_page_h1")}
              className="mt-4 text-3xl font-bold tracking-tight"
            >
              สมาชิก
            </h1>
            <p
              id={htmlId("members_clan_members_page_clan_name")}
              className="text-muted-foreground mt-2"
            >
              {clan.name}
            </p>
          </div>
          <Button
            id={htmlId("members_clan_members_page_button")}
            asChild
            variant="outline"
          >
            <Link id={htmlId("members_clan_members_page_clans")} href="/clans">
              เปลี่ยน Clan/Gang
            </Link>
          </Button>
        </div>

        {query.added === "1" && (
          <ActionNotice
            queryKeys={["added", "updated", "removed", "roleUpdated"]}
            className="mt-6 rounded-md bg-emerald-50 p-3 text-sm text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200"
          >
            เพิ่มสมาชิกแล้ว
          </ActionNotice>
        )}
        {query.updated === "1" && (
          <ActionNotice
            queryKeys={["added", "updated", "removed", "roleUpdated"]}
            className="mt-6 rounded-md bg-emerald-50 p-3 text-sm text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200"
          >
            แก้ไขชื่อสมาชิกแล้ว
          </ActionNotice>
        )}
        {query.removed === "1" && (
          <ActionNotice
            queryKeys={["added", "updated", "removed", "roleUpdated"]}
            className="mt-6 rounded-md bg-emerald-50 p-3 text-sm text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200"
          >
            นำสมาชิกออกแล้ว
          </ActionNotice>
        )}
        {query.roleUpdated === "1" && (
          <ActionNotice
            queryKeys={["added", "updated", "removed", "roleUpdated"]}
            className="mt-6 rounded-md bg-emerald-50 p-3 text-sm text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200"
          >
            เปลี่ยน Role สมาชิกแล้ว
          </ActionNotice>
        )}
        {query.error && (
          <p
            id={htmlId("members_clan_members_page_p")}
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
            <section
              id={htmlId("members_clan_members_page_section")}
              className="border-input rounded-xl border p-5 sm:p-6"
            >
              <h2
                id={htmlId("members_clan_members_page_h2")}
                className="text-lg font-semibold"
              >
                เพิ่มสมาชิก
              </h2>
              <div className="mt-5 max-w-xl">
                <AddMemberForm clanSlug={clan.slug} />
              </div>
            </section>
          ) : (
            <section
              id={htmlId("members_clan_members_page_section_2")}
              className="bg-muted rounded-xl p-5"
            >
              <p
                id={htmlId("members_clan_members_page_p_2")}
                className="text-sm"
              >
                คุณดูรายชื่อสมาชิกได้ แต่ไม่มีสิทธิ์เพิ่มสมาชิก
              </p>
            </section>
          )}

          <section
            id={htmlId("members_clan_members_page_section_3")}
            className="border-input overflow-hidden rounded-xl border"
          >
            <div className="border-input flex items-center justify-between border-b px-5 py-4">
              <h2
                id={htmlId("members_clan_members_page_h2_2")}
                className="font-semibold"
              >
                รายชื่อสมาชิก
              </h2>
              <p
                id={htmlId("members_clan_members_page_p_3")}
                className="text-muted-foreground text-sm"
              >
                {members?.length ?? 0} คน
              </p>
            </div>
            {error ? (
              <p
                id={htmlId("members_clan_members_page_p_4")}
                className="p-5 text-sm text-red-700 dark:text-red-200"
                role="alert"
              >
                โหลดรายชื่อสมาชิกไม่สำเร็จ
              </p>
            ) : members?.length ? (
              <div className="overflow-x-auto">
                <table
                  id={htmlId("members_clan_members_page_table")}
                  className="w-full min-w-[720px] text-left text-sm"
                >
                  <thead
                    id={htmlId("members_clan_members_page_thead")}
                    className="bg-muted/50 text-muted-foreground"
                  >
                    <tr id={htmlId("members_clan_members_page_tr")}>
                      <th
                        id={htmlId("members_clan_members_page_th")}
                        scope="col"
                        className="px-5 py-3 font-medium"
                      >
                        ชื่อตัวละคร
                      </th>
                      <th
                        id={htmlId("members_clan_members_page_th_2")}
                        scope="col"
                        className="px-5 py-3 font-medium"
                      >
                        สถานะบัญชี
                      </th>
                      <th
                        id={htmlId("members_clan_members_page_role")}
                        scope="col"
                        className="px-5 py-3 font-medium"
                      >
                        Role
                      </th>
                      {canManage && (
                        <th
                          id={htmlId("members_clan_members_page_th_3")}
                          scope="col"
                          className="px-5 py-3 font-medium"
                        >
                          จัดการ
                        </th>
                      )}
                    </tr>
                  </thead>
                  <tbody
                    id={htmlId("members_clan_members_page_tbody")}
                    className="divide-input divide-y"
                  >
                    {members.map((member, htmlRowIndex1) => (
                      <tr
                        id={htmlId(
                          "members_clan_members_page_tr_2",
                          htmlRowIndex1,
                        )}
                        key={member.id}
                        className="align-top"
                      >
                        <td
                          id={htmlId(
                            "members_clan_members_page_member_character_name",
                            htmlRowIndex1,
                          )}
                          className="px-5 py-4 font-medium"
                        >
                          {member.character_name}
                        </td>
                        <td
                          id={htmlId(
                            "members_clan_members_page_td",
                            htmlRowIndex1,
                          )}
                          className="text-muted-foreground px-5 py-4"
                        >
                          {member.user_id
                            ? "เชื่อมกับบัญชีแล้ว"
                            : "ยังไม่มีบัญชี"}
                        </td>
                        <td
                          id={htmlId(
                            "members_clan_members_page_td_2",
                            htmlRowIndex1,
                          )}
                          className="px-5 py-4"
                        >
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
                          <td
                            id={htmlId(
                              "members_clan_members_page_td_3",
                              htmlRowIndex1,
                            )}
                            className="px-5 py-3"
                          >
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
              <p
                id={htmlId("members_clan_members_page_p_5")}
                className="text-muted-foreground p-5 text-sm"
              >
                ยังไม่มีสมาชิก
              </p>
            )}
          </section>
        </div>
      </main>
    </>
  );
}
