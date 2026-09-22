import Link from "next/link";
import { redirect } from "next/navigation";
import { AppHeader } from "@/components/clan/app-header";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function ClansPage() {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;
  if (typeof userId !== "string") redirect("/login?next=/clans");

  const { data: memberships, error } = await supabase
    .from("clan_members")
    .select(
      "character_name, joined_at, clan:clans!clan_members_clan_id_fkey(id,name,slug,type,status), role:clan_roles!clan_members_clan_id_role_id_fkey(name)",
    )
    .eq("user_id", userId)
    .eq("status", "ACTIVE")
    .order("joined_at", { ascending: false });

  if (error) {
    console.error("Clan memberships could not be loaded", error.code);
  }

  return (
    <>
      <AppHeader />
      <main className="mx-auto w-full max-w-5xl px-5 py-10 sm:px-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-primary text-sm font-semibold">พื้นที่ของฉัน</p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight">
              Clan และ Gang
            </h1>
            <p className="text-muted-foreground mt-2">
              เลือกพื้นที่ที่ต้องการจัดการ หรือสร้างพื้นที่ใหม่
            </p>
          </div>
          <Button asChild>
            <Link href="/clans/new">สร้าง Clan/Gang</Link>
          </Button>
        </div>

        {error ? (
          <p
            className="mt-8 rounded-xl bg-red-50 p-4 text-red-800 dark:bg-red-950 dark:text-red-200"
            role="alert"
          >
            โหลดรายการไม่สำเร็จ กรุณาลองใหม่
          </p>
        ) : memberships?.length ? (
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {memberships.map((membership) => (
              <Link
                key={membership.clan.id}
                href={`/c/${membership.clan.slug}/dashboard`}
                className="border-input hover:border-ring focus-visible:ring-ring rounded-xl border p-5 transition-colors focus-visible:ring-2 focus-visible:outline-none"
              >
                <div className="flex items-start justify-between gap-3">
                  <h2 className="text-lg font-semibold">
                    {membership.clan.name}
                  </h2>
                  <span className="bg-muted rounded-full px-2 py-1 text-xs font-medium">
                    {membership.clan.type === "CLAN" ? "Clan" : "Gang"}
                  </span>
                </div>
                <dl className="text-muted-foreground mt-5 space-y-2 text-sm">
                  <div className="flex justify-between gap-3">
                    <dt>ตัวละคร</dt>
                    <dd className="text-foreground truncate font-medium">
                      {membership.character_name}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt>บทบาท</dt>
                    <dd className="text-foreground font-medium">
                      {membership.role.name}
                    </dd>
                  </div>
                </dl>
              </Link>
            ))}
          </div>
        ) : (
          <section className="border-input mt-8 rounded-xl border border-dashed p-8 text-center">
            <h2 className="text-lg font-semibold">ยังไม่มี Clan หรือ Gang</h2>
            <p className="text-muted-foreground mt-2">
              สร้างพื้นที่แรกเพื่อเริ่มจัดการคลัง
            </p>
            <Button asChild className="mt-5">
              <Link href="/clans/new">สร้างพื้นที่แรก</Link>
            </Button>
          </section>
        )}
      </main>
    </>
  );
}
