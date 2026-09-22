import { randomUUID } from "node:crypto";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { AppHeader } from "@/components/clan/app-header";
import { TransactionForm } from "@/components/clan/transaction-forms";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const labels: Record<string, string> = {
  DEPOSIT: "รับเข้าคลัง",
  WITHDRAW: "นำออกจากคลัง",
  TRANSFER: "ย้ายคลัง",
  ADJUSTMENT: "ปรับยอด",
  REVERSAL: "รายการย้อนกลับ",
};

const statusLabels: Record<string, string> = {
  POSTED: "สำเร็จ",
  VOIDED: "ยกเลิกแล้ว",
  PENDING: "รอดำเนินการ",
  DRAFT: "ฉบับร่าง",
  REJECTED: "ไม่สำเร็จ",
};

export default async function TransactionsPage({
  params,
  searchParams,
}: {
  params: Promise<{ clanSlug: string }>;
  searchParams: Promise<{
    type?: string;
    status?: string;
    from?: string;
    to?: string;
    error?: string;
  }>;
}) {
  const [{ clanSlug }, filters] = await Promise.all([params, searchParams]);
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  if (typeof claims?.claims?.sub !== "string")
    redirect(
      `/login?next=${encodeURIComponent(`/c/${clanSlug}/transactions`)}`,
    );
  const { data: clan } = await supabase
    .from("clans")
    .select("id,name,slug")
    .eq("slug", clanSlug)
    .maybeSingle();
  if (!clan) notFound();
  let transactionQuery = supabase
    .from("transactions")
    .select(
      "id,transaction_no,transaction_type,transaction_date,status,note,created_at,contributor:clan_members!transactions_clan_id_contributor_member_id_fkey(character_name)",
    )
    .eq("clan_id", clan.id)
    .order("transaction_date", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(200);
  if (filters.type && labels[filters.type])
    transactionQuery = transactionQuery.eq("transaction_type", filters.type);
  if (
    filters.status &&
    ["POSTED", "VOIDED", "PENDING", "DRAFT", "REJECTED"].includes(
      filters.status,
    )
  )
    transactionQuery = transactionQuery.eq("status", filters.status);
  if (filters.from && /^\d{4}-\d{2}-\d{2}$/.test(filters.from))
    transactionQuery = transactionQuery.gte("transaction_date", filters.from);
  if (filters.to && /^\d{4}-\d{2}-\d{2}$/.test(filters.to))
    transactionQuery = transactionQuery.lte("transaction_date", filters.to);
  const [
    { data: transactions, error },
    deposit,
    withdraw,
    transfer,
    { data: assets },
    { data: warehouses },
    { data: members },
  ] = await Promise.all([
    transactionQuery,
    supabase.rpc("has_clan_permission", {
      p_clan_id: clan.id,
      p_permission_code: "transaction.deposit",
    }),
    supabase.rpc("has_clan_permission", {
      p_clan_id: clan.id,
      p_permission_code: "transaction.withdraw",
    }),
    supabase.rpc("has_clan_permission", {
      p_clan_id: clan.id,
      p_permission_code: "warehouse.transfer",
    }),
    supabase
      .from("assets")
      .select("id,code,name,unit,decimal_places")
      .eq("clan_id", clan.id)
      .eq("is_active", true)
      .order("code"),
    supabase
      .from("warehouses")
      .select("id,name,is_default")
      .eq("clan_id", clan.id)
      .eq("is_active", true)
      .order("is_default", { ascending: false })
      .order("name"),
    supabase
      .from("clan_members")
      .select("id,character_name")
      .eq("clan_id", clan.id)
      .eq("status", "ACTIVE")
      .order("character_name"),
  ]);
  const availableTypes = [
    deposit.data ? ("DEPOSIT" as const) : null,
    withdraw.data ? ("WITHDRAW" as const) : null,
    transfer.data ? ("TRANSFER" as const) : null,
  ].filter((type): type is "DEPOSIT" | "WITHDRAW" | "TRANSFER" => !!type);
  return (
    <>
      <AppHeader activeClan={clan.name} />
      <main className="mx-auto w-full max-w-6xl px-5 py-10 sm:px-6">
        <div>
          <div>
            <Link
              href={`/c/${clan.slug}/dashboard`}
              className="text-primary text-sm font-medium hover:underline"
            >
              ← กลับ Dashboard
            </Link>
            <h1 className="mt-4 text-3xl font-bold">รายการคลัง</h1>
            <p className="text-muted-foreground mt-2">
              รับเข้า นำออก และย้ายสินค้าในคลังของ {clan.name}
            </p>
          </div>
        </div>
        {filters.error === "permission" && (
          <p className="mt-6 rounded-md bg-red-50 p-3 text-sm text-red-700">
            คุณไม่มีสิทธิ์ทำรายการประเภทนี้
          </p>
        )}
        {availableTypes.length > 0 && (
          <section className="border-input mt-8 rounded-xl border p-5 sm:p-6">
            <h2 className="text-xl font-semibold">ทำรายการใหม่</h2>
            <p className="text-muted-foreground mt-1 text-sm">
              เลือกประเภท สินค้า และจำนวนที่ต้องการ
            </p>
            {assets?.length ? (
              <div className="mt-5">
                <TransactionForm
                  clanSlug={clan.slug}
                  transactionType={availableTypes[0]}
                  availableTypes={availableTypes}
                  clientRequestId={randomUUID()}
                  assets={assets}
                  warehouses={warehouses ?? []}
                  members={members ?? []}
                />
              </div>
            ) : (
              <p className="mt-4 text-sm">กรุณาสร้างสินค้าก่อนทำรายการ</p>
            )}
          </section>
        )}
        <details className="border-input mt-8 rounded-xl border p-4">
          <summary className="cursor-pointer font-medium">
            ค้นหาและกรองรายการ
          </summary>
          <form className="mt-4 grid gap-3 sm:grid-cols-5 sm:items-end">
            <label className="text-sm">
              ประเภท
              <select
                name="type"
                defaultValue={filters.type ?? ""}
                className="border-input bg-background mt-1 h-10 w-full rounded-md border px-2"
              >
                <option value="">ทั้งหมด</option>
                {Object.entries(labels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm">
              สถานะ
              <select
                name="status"
                defaultValue={filters.status ?? ""}
                className="border-input bg-background mt-1 h-10 w-full rounded-md border px-2"
              >
                <option value="">ทั้งหมด</option>
                {["POSTED", "VOIDED", "PENDING", "DRAFT", "REJECTED"].map(
                  (value) => (
                    <option key={value} value={value}>
                      {statusLabels[value] ?? value}
                    </option>
                  ),
                )}
              </select>
            </label>
            <label className="text-sm">
              จากวันที่
              <input
                type="date"
                name="from"
                defaultValue={filters.from ?? ""}
                className="border-input bg-background mt-1 h-10 w-full rounded-md border px-2"
              />
            </label>
            <label className="text-sm">
              ถึงวันที่
              <input
                type="date"
                name="to"
                defaultValue={filters.to ?? ""}
                className="border-input bg-background mt-1 h-10 w-full rounded-md border px-2"
              />
            </label>
            <Button type="submit" variant="outline">
              ค้นหา
            </Button>
          </form>
        </details>
        <h2 className="mt-8 text-xl font-semibold">ประวัติรายการ</h2>
        <section className="border-input mt-6 overflow-hidden rounded-xl border">
          {error ? (
            <p className="p-5 text-sm text-red-600">โหลดรายการไม่สำเร็จ</p>
          ) : transactions?.length ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[800px] text-left text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="px-5 py-3">เลขที่</th>
                    <th className="px-5 py-3">วันที่</th>
                    <th className="px-5 py-3">ประเภท</th>
                    <th className="px-5 py-3">สมาชิก</th>
                    <th className="px-5 py-3">สถานะ</th>
                  </tr>
                </thead>
                <tbody className="divide-input divide-y">
                  {transactions.map((transaction) => (
                    <tr key={transaction.id}>
                      <td className="px-5 py-4">
                        <Link
                          href={`/c/${clan.slug}/transactions/${transaction.id}`}
                          className="text-primary font-medium hover:underline"
                        >
                          {transaction.transaction_no}
                        </Link>
                      </td>
                      <td className="px-5 py-4">
                        {transaction.transaction_date}
                      </td>
                      <td className="px-5 py-4">
                        {labels[transaction.transaction_type] ??
                          transaction.transaction_type}
                      </td>
                      <td className="px-5 py-4">
                        {transaction.contributor?.character_name ?? "—"}
                      </td>
                      <td className="px-5 py-4">
                        <span className="bg-muted rounded-full px-2.5 py-1 text-xs">
                          {statusLabels[transaction.status] ??
                            transaction.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-muted-foreground p-5 text-sm">
              ยังไม่มีรายการคลัง
            </p>
          )}
        </section>
      </main>
    </>
  );
}
