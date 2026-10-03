import { redirect } from "next/navigation";
import { memberPreviewPath } from "@/features/clans/member-preview";
export default async function PreviewMembersPage({
  searchParams,
}: {
  searchParams: Promise<{ clan?: string }>;
}) {
  const query = await searchParams;
  if (typeof query.clan === "string" && query.clan)
    redirect(memberPreviewPath(query.clan));
  return (
    <main
      id="preview_members_page"
      className="mx-auto max-w-5xl px-5 py-8 sm:px-6"
    >
      <h1 id="preview_members_title" className="text-3xl font-bold">
        รายชื่อสมาชิก
      </h1>
      <p id="preview_members_empty" className="text-muted-foreground mt-6">
        กรุณาเปิดลิงก์รายชื่อสมาชิกของ Clan/Gang ที่ต้องการ
      </p>
    </main>
  );
}
