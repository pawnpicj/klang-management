import { ActionNotice } from "@/components/ui/action-notice";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { AppHeader } from "@/components/clan/app-header";
import {
  ArchiveClanButton,
  ClanSettingsForm,
} from "@/components/clan/clan-management-forms";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function ClanSettingsPage({
  params,
  searchParams,
}: {
  params: Promise<{ clanSlug: string }>;
  searchParams: Promise<{ updated?: string }>;
}) {
  const [{ clanSlug }, query] = await Promise.all([params, searchParams]);
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  if (typeof claimsData?.claims?.sub !== "string") {
    redirect(`/login?next=${encodeURIComponent(`/c/${clanSlug}/settings`)}`);
  }
  const userId = claimsData.claims.sub;
  const { data: memberships, error: membershipError } = await supabase
    .from("clan_members")
    .select(
      "clan:clans!clan_members_clan_id_fkey(id,name,slug,type,status,note,rules,discord_url,line_url,telegram_url,facebook_url,tiktok_url)",
    )
    .eq("user_id", userId)
    .eq("status", "ACTIVE");
  if (membershipError) {
    console.error(
      "Clan settings membership could not be loaded",
      membershipError.code,
      membershipError.message,
    );
  }
  const clan = memberships?.find(
    (membership) =>
      membership.clan.slug === clanSlug && membership.clan.status === "ACTIVE",
  )?.clan;
  if (!clan) notFound();
  const { data: canManage } = await supabase.rpc("has_clan_permission", {
    p_clan_id: clan.id,
    p_permission_code: "clan.manage",
  });
  if (!canManage) redirect(`/c/${clan.slug}/dashboard`);

  return (
    <>
      <AppHeader activeClan={clan.name} />
      <main className="mx-auto w-full max-w-xl px-5 py-10 sm:px-6">
        <Link
          href={`/c/${clan.slug}/dashboard`}
          className="text-primary text-sm font-medium underline-offset-4 hover:underline"
        >
          ← กลับ Dashboard
        </Link>
        <h1 className="mt-5 text-3xl font-bold tracking-tight">
          แก้ไข Clan/Gang
        </h1>
        {query.updated === "1" && (
          <ActionNotice
            queryKeys={["updated"]}
            className="mt-5 rounded-md bg-emerald-50 p-3 text-sm text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200"
          >
            บันทึกข้อมูลแล้ว
          </ActionNotice>
        )}
        <section className="border-input mt-8 rounded-xl border p-5 sm:p-6">
          <ClanSettingsForm
            clanSlug={clan.slug}
            name={clan.name}
            type={clan.type}
            note={clan.note}
            rules={clan.rules}
            socialLinks={{
              discordUrl: clan.discord_url,
              lineUrl: clan.line_url,
              telegramUrl: clan.telegram_url,
              facebookUrl: clan.facebook_url,
              tiktokUrl: clan.tiktok_url,
            }}
          />
        </section>
        <section className="border-input mt-6 rounded-xl border p-5 sm:p-6">
          <h2 className="font-semibold">ลบ Clan/Gang</h2>
          <p className="text-muted-foreground mt-2 text-sm leading-6">
            ระบบจะ Archive พื้นที่นี้เพื่อรักษาประวัติธุรกรรมและ Audit Log
          </p>
          <div className="mt-4">
            <ArchiveClanButton clanSlug={clan.slug} />
          </div>
        </section>
      </main>
    </>
  );
}
