import { PublicMemberPreview } from "@/components/clan/public-member-preview";
import { createPublicClient } from "@/lib/supabase/public";
import { hasPublicEnv } from "@/lib/env";
import { memberPreviewColumnsSchema } from "@/features/clans/member-preview";
export const dynamic = "force-dynamic";
export default async function ClanMemberPreviewPage({
  params,
}: {
  params: Promise<{ clanSlug: string }>;
}) {
  const { clanSlug } = await params;
  const supabase = hasPublicEnv() ? createPublicClient() : null;
  const { data: settings, error: settingsError } = supabase
    ? await supabase.rpc("get_public_member_preview_settings", {
        p_clan_slug: clanSlug,
      })
    : { data: [], error: null };
  const selected = settings?.[0];
  const { data: members, error: memberError } =
    selected && supabase
      ? await supabase.rpc("get_public_member_preview", {
          p_clan_slug: clanSlug,
        })
      : { data: [], error: null };
  const columns = memberPreviewColumnsSchema.safeParse(selected?.columns);
  return (
    <PublicMemberPreview
      selected={selected}
      members={members ?? []}
      failed={Boolean(settingsError || memberError)}
      columns={columns.success ? columns.data : []}
    />
  );
}
