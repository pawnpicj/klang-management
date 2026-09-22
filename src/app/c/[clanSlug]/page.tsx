import { redirect } from "next/navigation";

export default async function ClanPage({
  params,
}: {
  params: Promise<{ clanSlug: string }>;
}) {
  const { clanSlug } = await params;
  redirect(`/c/${clanSlug}/dashboard`);
}
