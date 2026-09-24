import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { AppHeader } from "@/components/clan/app-header";
import { DeliveryTable } from "@/components/clan/delivery-table";
import { Button } from "@/components/ui/button";
import { summarizeMemberDeliveries } from "@/features/deliveries/summary";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function DeliveriesPage({
  params,
  searchParams,
}: {
  params: Promise<{ clanSlug: string }>;
  searchParams: Promise<{
    recorded?: string;
    updated?: string;
    deleted?: string;
    deleteError?: string;
  }>;
}) {
  const [{ clanSlug }, query] = await Promise.all([params, searchParams]);
  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Bangkok",
  }).format(new Date());
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  if (typeof claims?.claims?.sub !== "string")
    redirect(`/login?next=${encodeURIComponent(`/c/${clanSlug}/deliveries`)}`);

  const { data: clan } = await supabase
    .from("clans")
    .select("id,name,slug,delivery_tracking_started_on")
    .eq("slug", clanSlug)
    .maybeSingle();
  if (!clan) notFound();

  const [
    { data: membership },
    { data: members, error: membersError },
    { data: assets, error: assetsError },
    { data: deliveries, error: deliveriesError },
    { data: canManage },
  ] = await Promise.all([
    supabase
      .from("clan_members")
      .select("id")
      .eq("clan_id", clan.id)
      .eq("user_id", claims.claims.sub)
      .eq("status", "ACTIVE")
      .maybeSingle(),
    supabase
      .from("clan_members")
      .select(
        "id,character_name,joined_at,role:clan_roles!clan_members_clan_id_role_id_fkey(name)",
      )
      .eq("clan_id", clan.id)
      .eq("status", "ACTIVE")
      .order("joined_at"),
    supabase
      .from("assets")
      .select("id,name,unit,required_quantity,created_at")
      .eq("clan_id", clan.id)
      .eq("is_active", true)
      .order("name"),
    supabase
      .from("member_deliveries")
      .select("id,member_id,asset_id,delivery_date,quantity,created_at")
      .eq("clan_id", clan.id)
      .gte("delivery_date", clan.delivery_tracking_started_on)
      .lte("delivery_date", today)
      .order("delivery_date", { ascending: false })
      .order("created_at", { ascending: false }),
    supabase.rpc("has_clan_permission", {
      p_clan_id: clan.id,
      p_permission_code: "member.manage",
    }),
  ]);
  if (!membership) notFound();

  const loadError = membersError || assetsError || deliveriesError;
  const rows = (members ?? []).map((member) => {
    const summary = summarizeMemberDeliveries({
      member: { ...member, joined_at: member.joined_at ?? today },
      assets: assets ?? [],
      deliveries: deliveries ?? [],
      trackingStartedOn: clan.delivery_tracking_started_on,
      throughDate: today,
    });
    return {
      id: member.id,
      characterName: member.character_name,
      roleName: member.role.name,
      complete: summary.complete,
      missingDates: summary.missingDates,
      missingItems: summary.missingByAsset.map((item) => ({
        id: item.id,
        name: item.name,
        unit: item.unit,
        quantity: item.quantity,
      })),
    };
  });

  return (
    <>
      <AppHeader activeClan={clan.name} />
      <main className="mx-auto w-full max-w-5xl px-5 py-10 sm:px-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <Link
              href={`/c/${clan.slug}/dashboard`}
              className="text-primary text-sm font-medium hover:underline"
            >
              ← กลับ Dashboard
            </Link>
            <h1 className="mt-4 text-3xl font-bold">Delivery</h1>
            <p className="text-muted-foreground mt-2">
              บันทึกและตรวจสอบการส่งของรายวันของ {clan.name}
            </p>
          </div>
          <Button asChild variant="outline">
            <Link href={`/c/${clan.slug}/assets`}>ตั้งค่า Assets</Link>
          </Button>
        </div>
        {query.recorded === "1" && (
          <p
            className="mt-6 rounded-md bg-emerald-50 p-3 text-sm text-emerald-800"
            role="status"
          >
            บันทึกการส่งของแล้ว
          </p>
        )}
        {query.updated === "1" && (
          <p
            className="mt-6 rounded-md bg-emerald-50 p-3 text-sm text-emerald-800"
            role="status"
          >
            แก้ไขรายการส่งของแล้ว
          </p>
        )}
        {query.deleted === "1" && (
          <p
            className="mt-6 rounded-md bg-emerald-50 p-3 text-sm text-emerald-800"
            role="status"
          >
            ลบรายการส่งของแล้ว
          </p>
        )}
        {query.deleteError === "1" && (
          <p
            className="mt-6 rounded-md bg-red-50 p-3 text-sm text-red-700"
            role="alert"
          >
            ลบรายการส่งของไม่สำเร็จ
          </p>
        )}
        {!assets?.length && (
          <p className="mt-6 rounded-md bg-amber-50 p-3 text-sm text-amber-900">
            ยังไม่มี Asset กรุณาตั้งค่าในหน้า Assets
          </p>
        )}
        <section className="border-input mt-8 overflow-hidden rounded-xl border">
          <div className="border-input flex items-center justify-between border-b px-5 py-4">
            <h2 className="text-xl font-semibold">รายชื่อสมาชิก</h2>
            <span className="text-muted-foreground text-sm">
              {members?.length ?? 0} คน
            </span>
          </div>
          {loadError ? (
            <p className="p-5 text-sm text-red-600">
              โหลดข้อมูล Delivery ไม่สำเร็จ
            </p>
          ) : rows.length ? (
            <DeliveryTable
              clanSlug={clan.slug}
              members={rows}
              assets={(assets ?? []).map(
                ({ id, name, unit, required_quantity }) => ({
                  id,
                  name,
                  unit,
                  requiredQuantity: required_quantity,
                }),
              )}
              deliveries={(deliveries ?? []).map(
                ({ id, member_id, asset_id, delivery_date, quantity }) => ({
                  id,
                  memberId: member_id,
                  assetId: asset_id,
                  deliveryDate: delivery_date,
                  quantity,
                }),
              )}
              today={today}
              canManage={Boolean(canManage)}
            />
          ) : (
            <p className="text-muted-foreground p-5 text-sm">ยังไม่มีสมาชิก</p>
          )}
        </section>
      </main>
    </>
  );
}
