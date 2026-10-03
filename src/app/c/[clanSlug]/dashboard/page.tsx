import { ShareMemberPreview } from "@/components/clan/share-member-preview";
import { MembersTable } from "@/components/clan/members-table";
import {
  readMemberEquipment,
  readMemberSocialLinks,
} from "@/features/clans/member-profile";
import { isSocialLink, socialPlatforms } from "@/features/clans/social-links";
import { SocialLogo } from "@/components/clan/social-logo";
import { ActionNotice } from "@/components/ui/action-notice";
import Link from "next/link";
import { Settings2, UsersRound } from "lucide-react";
import { DashboardNavigation } from "@/components/clan/dashboard-navigation";
import { notFound, redirect } from "next/navigation";
import { AppHeader } from "@/components/clan/app-header";
import { DashboardMemberEditor } from "@/components/clan/dashboard-member-editor";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";
import { htmlId } from "@/lib/html-id";

export const dynamic = "force-dynamic";

export default async function ClanDashboardPage({
  params,
  searchParams,
}: {
  params: Promise<{ clanSlug: string }>;
  searchParams: Promise<{ memberUpdated?: string }>;
}) {
  const [{ clanSlug }, query] = await Promise.all([params, searchParams]);
  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Bangkok",
  }).format(new Date());
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;
  if (typeof userId !== "string") {
    redirect(`/login?next=${encodeURIComponent(`/c/${clanSlug}/dashboard`)}`);
  }

  const { data: clan } = await supabase
    .from("clans")
    .select(
      "id,name,slug,type,status,game_name,server_name,note,rules,discord_url,line_url,telegram_url,facebook_url,tiktok_url,members_preview_public,delivery_tracking_started_on",
    )
    .eq("slug", clanSlug)
    .maybeSingle();
  // The clans_read RLS policy validates active Clan membership on this lookup.
  if (!clan) notFound();

  const [
    { data: members },
    { data: roles },
    { data: canManageMembers },
    { data: canManageClan },
    { data: memberAssets },
  ] = await Promise.all([
    supabase
      .from("clan_members")
      .select(
        "id,character_name,user_id,role_id,joined_at,delivery_started_on,social_links,equipment,role:clan_roles!clan_members_clan_id_role_id_fkey(name)",
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
    supabase.rpc("has_clan_permission", {
      p_clan_id: clan.id,
      p_permission_code: "clan.manage",
    }),
    supabase
      .from("assets")
      .select("id,name")
      .eq("clan_id", clan.id)
      .eq("is_active", true)
      .order("name"),
  ]);

  return (
    <>
      <AppHeader activeClan={clan.name} />
      <main
        id={htmlId("dashboard_clan_dashboard_page_main")}
        className="mx-auto w-full max-w-5xl px-5 py-10 sm:px-6"
      >
        <div className="relative pt-12 sm:pt-0">
          <div className="w-full">
            <div className="flex flex-wrap items-center gap-3 sm:pr-60">
              <h1
                id="clan_game_name"
                className="text-3xl font-bold tracking-tight"
              >
                {clan.name}
              </h1>
              <div className="flex items-center gap-2">
                {canManageClan && (
                  <Button
                    id={htmlId("dashboard_clan_dashboard_page_clan_gang")}
                    asChild
                    size="sm"
                    variant="warning"
                    className="size-6 rounded-md p-0"
                    aria-label="แก้ไข Clan/Gang"
                    title="แก้ไข Clan/Gang"
                  >
                    <Link
                      id={htmlId("dashboard_clan_dashboard_page_link")}
                      href={`/c/${clan.slug}/settings`}
                    >
                      <Settings2 className="size-3" aria-hidden="true" />
                    </Link>
                  </Button>
                )}
              </div>
              {[
                clan.discord_url,
                clan.line_url,
                clan.telegram_url,
                clan.facebook_url,
                clan.tiktok_url,
              ].some(Boolean) && (
                <section
                  id={htmlId("dashboard_clan_dashboard_page_social_media")}
                  aria-label="Social Media"
                  className="ml-auto flex flex-wrap justify-end gap-3"
                >
                  {socialPlatforms.map((platform, index) => {
                    const url = [
                      clan.discord_url,
                      clan.line_url,
                      clan.telegram_url,
                      clan.facebook_url,
                      clan.tiktok_url,
                    ][index];
                    if (!url || !isSocialLink(url, platform.hosts)) return null;
                    return (
                      <Button
                        id={htmlId(
                          "dashboard_clan_dashboard_page_button",
                          index,
                        )}
                        key={platform.key}
                        asChild
                        variant="outline"
                        className="size-8 rounded-full border-0 bg-transparent p-0 hover:bg-transparent hover:opacity-80"
                      >
                        <a
                          id={htmlId("dashboard_clan_dashboard_page_a", index)}
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          aria-label={`เปิด ${platform.label}`}
                          title={platform.label}
                        >
                          <SocialLogo platform={platform.key} />
                        </a>
                      </Button>
                    );
                  })}
                </section>
              )}
            </div>
            {(clan.game_name || clan.server_name) && (
              <p
                id={htmlId("dashboard_clan_dashboard_page_p")}
                className="text-muted-foreground mt-2"
              >
                {[clan.game_name, clan.server_name].filter(Boolean).join(" · ")}
              </p>
            )}
          </div>
          <div
            id="dashboard_clan_actions"
            className="absolute top-0 right-0 flex items-center gap-2"
          >
            <Button
              id={htmlId("dashboard_clan_dashboard_page_button_2")}
              asChild
              variant="outline"
              size="sm"
              className="h-8 px-3 text-xs"
            >
              <Link
                id={htmlId("dashboard_clan_dashboard_page_clans")}
                href="/clans"
              >
                เปลี่ยน Clan/Gang
              </Link>
            </Button>
            <ShareMemberPreview
              clanSlug={clan.slug}
              clanName={clan.name}
              enabled={clan.members_preview_public}
            />
          </div>
        </div>

        {query.memberUpdated === "1" && (
          <ActionNotice
            queryKeys={["memberUpdated"]}
            className="mt-6 rounded-md bg-emerald-50 p-3 text-sm text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200"
          >
            แก้ไขข้อมูลสมาชิกแล้ว
          </ActionNotice>
        )}

        <DashboardNavigation
          clanSlug={clan.slug}
          canManageMembers={Boolean(canManageMembers)}
        />

        <section
          id={htmlId("dashboard_clan_dashboard_page_section")}
          className="mt-8 grid gap-4 md:grid-cols-2"
        >
          <article
            id={htmlId("dashboard_clan_dashboard_page_article")}
            className="border-input rounded-xl border p-5"
          >
            <h2
              id={htmlId("dashboard_clan_dashboard_page_note")}
              className="text-lg font-semibold"
            >
              Note
            </h2>
            <p
              id={htmlId("dashboard_clan_dashboard_page_p_2")}
              className="text-muted-foreground mt-3 text-sm leading-6 break-words whitespace-pre-wrap"
            >
              {clan.note || "ยังไม่ได้ระบุ Note"}
            </p>
          </article>
          <article
            id={htmlId("dashboard_clan_dashboard_page_article_2")}
            className="border-input rounded-xl border p-5"
          >
            <h2
              id={htmlId("dashboard_clan_dashboard_page_rule")}
              className="text-lg font-semibold"
            >
              Rule
            </h2>
            <p
              id={htmlId("dashboard_clan_dashboard_page_p_3")}
              className="text-muted-foreground mt-3 text-sm leading-6 break-words whitespace-pre-wrap"
            >
              {clan.rules || "ยังไม่ได้ระบุ Rule"}
            </p>
          </article>
        </section>

        <section
          id={htmlId("dashboard_clan_dashboard_page_section_2")}
          className="border-input mt-8 overflow-hidden rounded-xl border"
        >
          <div className="border-input flex items-center justify-between border-b px-5 py-4">
            <div className="flex items-center gap-2">
              <UsersRound className="text-primary size-5" aria-hidden="true" />
              <h2
                id={htmlId("dashboard_clan_dashboard_page_h2")}
                className="text-xl font-semibold"
              >
                รายชื่อสมาชิก
              </h2>
            </div>
            <span className="text-muted-foreground text-sm">
              {members?.length ?? 0} คน
            </span>
          </div>
          <MembersTable
            members={members ?? []}
            editControls={
              canManageMembers
                ? Object.fromEntries(
                    (members ?? []).map((member) => [
                      member.id,
                      <DashboardMemberEditor
                        key={member.id}
                        clanSlug={clan.slug}
                        member={{
                          id: member.id,
                          characterName: member.character_name,
                          roleId: member.role_id,
                          deliveryStartedOn:
                            member.delivery_started_on ??
                            member.joined_at?.slice(0, 10) ??
                            today,
                          socialLinks: readMemberSocialLinks(
                            member.social_links,
                          ),
                          equipment: readMemberEquipment(member.equipment),
                        }}
                        roles={roles ?? []}
                        trackingStartedOn={clan.delivery_tracking_started_on}
                        today={today}
                        assets={memberAssets ?? []}
                      />,
                    ]),
                  )
                : undefined
            }
          />
        </section>
      </main>
    </>
  );
}
