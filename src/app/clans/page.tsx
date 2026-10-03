import { ActionNotice } from "@/components/ui/action-notice";
import Link from "next/link";
import { Swords, UsersRound } from "lucide-react";
import { redirect } from "next/navigation";
import { AppHeader } from "@/components/clan/app-header";
import { ArchiveClanButton } from "@/components/clan/clan-management-forms";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";
import { htmlId } from "@/lib/html-id";

export const dynamic = "force-dynamic";

export default async function ClansPage({
  searchParams,
}: {
  searchParams: Promise<{ archived?: string; error?: string }>;
}) {
  const query = await searchParams;
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;
  if (typeof userId !== "string") redirect("/login?next=/clans");

  const { data: memberships, error } = await supabase
    .from("clan_members")
    .select(
      "joined_at, clan:clans!clan_members_clan_id_fkey(id,name,slug,type,status), role:clan_roles!clan_members_clan_id_role_id_fkey(name)",
    )
    .eq("user_id", userId)
    .eq("status", "ACTIVE")
    .order("joined_at", { ascending: false });

  if (error) {
    console.error("Clan memberships could not be loaded", error.code);
  }

  const memberCounts = new Map<string, number>();
  if (memberships?.length) {
    const clanIds = memberships.map((membership) => membership.clan.id);
    const { data: memberRows, error: memberCountError } = await supabase
      .from("clan_members")
      .select("clan_id")
      .in("clan_id", clanIds)
      .eq("status", "ACTIVE");
    if (memberCountError) {
      console.error(
        "Clan member counts could not be loaded",
        memberCountError.code,
      );
    } else {
      memberRows?.forEach(({ clan_id }) => {
        memberCounts.set(clan_id, (memberCounts.get(clan_id) ?? 0) + 1);
      });
    }
  }

  return (
    <>
      <AppHeader />
      <main
        id={htmlId("clans_clans_page_main")}
        className="mx-auto w-full max-w-5xl px-5 py-10 sm:px-6"
      >
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p
              id={htmlId("clans_clans_page_p")}
              className="text-primary text-sm font-semibold"
            >
              พื้นที่ของฉัน
            </p>
            <h1
              id={htmlId("clans_clans_page_clan_gang")}
              className="mt-2 text-3xl font-bold tracking-tight"
            >
              Clan/Gang
            </h1>
            <p
              id={htmlId("clans_clans_page_p_2")}
              className="text-muted-foreground mt-2"
            >
              เลือกพื้นที่ที่ต้องการจัดการ หรือสร้างพื้นที่ใหม่
            </p>
          </div>
          <Button id={htmlId("clans_clans_page_button")} asChild>
            <Link id={htmlId("clans_clans_page_clans_new")} href="/clans/new">
              สร้าง Clan/Gang
            </Link>
          </Button>
        </div>

        {query.archived === "1" && (
          <ActionNotice
            queryKeys={["archived"]}
            className="mt-6 rounded-md bg-emerald-50 p-3 text-sm text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200"
          >
            ลบ Clan/Gang แล้ว โดยเก็บประวัติไว้ในสถานะ Archive
          </ActionNotice>
        )}
        {query.error && (
          <p
            id={htmlId("clans_clans_page_clan_gang_2")}
            className="mt-6 rounded-md bg-red-50 p-3 text-sm text-red-800 dark:bg-red-950 dark:text-red-200"
            role="alert"
          >
            ลบ Clan/Gang ไม่สำเร็จ กรุณาตรวจสอบสิทธิ์แล้วลองใหม่
          </p>
        )}

        {error ? (
          <p
            id={htmlId("clans_clans_page_p_3")}
            className="mt-8 rounded-xl bg-red-50 p-4 text-red-800 dark:bg-red-950 dark:text-red-200"
            role="alert"
          >
            โหลดรายการไม่สำเร็จ กรุณาลองใหม่
          </p>
        ) : memberships?.length ? (
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {memberships.map((membership, htmlRowIndex1) => {
              const canManage = ["Manager", "Leader"].includes(
                membership.role.name,
              );
              const isClan = membership.clan.type === "CLAN";
              const ClanIcon = isClan ? UsersRound : Swords;
              return (
                <article
                  id={htmlId("clans_clans_page_article", htmlRowIndex1)}
                  key={membership.clan.id}
                  className="clan-card brand-panel border-input rounded-xl border p-5"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <span
                        className="bg-primary/10 text-primary flex size-10 shrink-0 items-center justify-center rounded-xl"
                        aria-hidden="true"
                      >
                        <ClanIcon className="size-5" strokeWidth={2.25} />
                      </span>
                      <h2
                        id={htmlId("clans_clans_page_h2", htmlRowIndex1)}
                        className="truncate text-lg font-semibold"
                      >
                        <Link
                          id={htmlId(
                            "clans_clans_page_membership_clan_name",
                            htmlRowIndex1,
                          )}
                          href={`/c/${membership.clan.slug}/dashboard`}
                          className="hover:text-primary focus-visible:ring-ring rounded-sm focus-visible:ring-2 focus-visible:outline-none"
                        >
                          {membership.clan.name}
                        </Link>
                      </h2>
                    </div>
                    <span className="bg-primary/10 text-primary rounded-full px-2 py-1 text-xs font-medium">
                      {isClan ? "Clan" : "Gang"}
                    </span>
                  </div>
                  <dl className="text-muted-foreground mt-5 space-y-2 text-sm">
                    <div className="flex items-center justify-between gap-3">
                      <dt className="flex items-center gap-2">
                        <UsersRound
                          className="text-primary size-4"
                          aria-hidden="true"
                        />
                        สมาชิก
                      </dt>
                      <dd className="text-foreground font-medium">
                        {memberCounts.get(membership.clan.id) ?? 0} คน
                      </dd>
                    </div>
                  </dl>
                  <div className="mt-5 flex flex-wrap gap-2">
                    <Button
                      id={htmlId("clans_clans_page_button_2", htmlRowIndex1)}
                      asChild
                      size="sm"
                      className="min-w-14"
                    >
                      <Link
                        id={htmlId("clans_clans_page_link", htmlRowIndex1)}
                        href={`/c/${membership.clan.slug}/dashboard`}
                      >
                        เปิด
                      </Link>
                    </Button>
                    {canManage && (
                      <>
                        <Button
                          id={htmlId(
                            "clans_clans_page_button_3",
                            htmlRowIndex1,
                          )}
                          asChild
                          size="sm"
                          variant="outline"
                          className="min-w-14"
                        >
                          <Link
                            id={htmlId(
                              "clans_clans_page_link_2",
                              htmlRowIndex1,
                            )}
                            href={`/c/${membership.clan.slug}/settings`}
                          >
                            แก้ไข
                          </Link>
                        </Button>
                        <ArchiveClanButton clanSlug={membership.clan.slug} />
                      </>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <section
            id={htmlId("clans_clans_page_section")}
            className="border-input mt-8 rounded-xl border border-dashed p-8 text-center"
          >
            <h2
              id={htmlId("clans_clans_page_clan_gang_3")}
              className="text-lg font-semibold"
            >
              ยังไม่มี Clan หรือ Gang
            </h2>
            <p
              id={htmlId("clans_clans_page_p_4")}
              className="text-muted-foreground mt-2"
            >
              สร้างพื้นที่แรกเพื่อเริ่มจัดการคลัง
            </p>
            <Button
              id={htmlId("clans_clans_page_button_4")}
              asChild
              className="mt-5"
            >
              <Link
                id={htmlId("clans_clans_page_clans_new_2")}
                href="/clans/new"
              >
                สร้างพื้นที่แรก
              </Link>
            </Button>
          </section>
        )}
      </main>
    </>
  );
}
