import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { AppHeader } from "@/components/clan/app-header";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";
import { htmlId } from "@/lib/html-id";

export const dynamic = "force-dynamic";

const labels: Record<string, string> = {
  DEPOSIT: "Deposit",
  WITHDRAW: "Withdraw",
  TRANSFER: "Transfer",
  ADJUSTMENT: "Adjustment",
  REVERSAL: "Reversal",
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
  const [{ data: transactions, error }, deposit, withdraw, transfer] =
    await Promise.all([
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
    ]);
  return (
    <>
      <AppHeader activeClan={clan.name} />
      <main
        id={htmlId("transactions_transactions_page_main")}
        className="mx-auto w-full max-w-6xl px-5 py-10 sm:px-6"
      >
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <Link
              id={htmlId("transactions_transactions_page_dashboard")}
              href={`/c/${clan.slug}/dashboard`}
              className="text-primary text-sm font-medium hover:underline"
            >
              ← กลับ Dashboard
            </Link>
            <h1
              id={htmlId("transactions_transactions_page_transactions")}
              className="mt-4 text-3xl font-bold"
            >
              Transactions
            </h1>
            <p
              id={htmlId("transactions_transactions_page_clan_name")}
              className="text-muted-foreground mt-2"
            >
              รายการเคลื่อนไหวคลังของ {clan.name}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {deposit.data && (
              <Button
                id={htmlId("transactions_transactions_page_button")}
                asChild
              >
                <Link
                  id={htmlId("transactions_transactions_page_deposit")}
                  href={`/c/${clan.slug}/transactions/new/deposit`}
                >
                  Deposit
                </Link>
              </Button>
            )}
            {withdraw.data && (
              <Button
                id={htmlId("transactions_transactions_page_button_2")}
                asChild
                variant="warning"
              >
                <Link
                  id={htmlId("transactions_transactions_page_withdraw")}
                  href={`/c/${clan.slug}/transactions/new/withdraw`}
                >
                  Withdraw
                </Link>
              </Button>
            )}
            {transfer.data && (
              <Button
                id={htmlId("transactions_transactions_page_button_3")}
                asChild
                variant="outline"
              >
                <Link
                  id={htmlId("transactions_transactions_page_transfer")}
                  href={`/c/${clan.slug}/transactions/new/transfer`}
                >
                  Transfer
                </Link>
              </Button>
            )}
          </div>
        </div>
        {filters.error === "permission" && (
          <p
            id={htmlId("transactions_transactions_page_p")}
            className="mt-6 rounded-md bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-200"
          >
            คุณไม่มีสิทธิ์ทำรายการประเภทนี้
          </p>
        )}
        <form
          id={htmlId("transactions_transactions_page_form")}
          className="border-input mt-8 grid gap-3 rounded-xl border p-4 sm:grid-cols-5 sm:items-end"
        >
          <label
            id={htmlId("transactions_transactions_page_label")}
            className="text-sm"
          >
            ประเภท
            <select
              id={htmlId("transactions_transactions_page_type")}
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
          <label
            id={htmlId("transactions_transactions_page_label_2")}
            className="text-sm"
          >
            สถานะ
            <select
              id={htmlId("transactions_transactions_page_status")}
              name="status"
              defaultValue={filters.status ?? ""}
              className="border-input bg-background mt-1 h-10 w-full rounded-md border px-2"
            >
              <option value="">ทั้งหมด</option>
              {["POSTED", "VOIDED", "PENDING", "DRAFT", "REJECTED"].map(
                (value) => (
                  <option key={value}>{value}</option>
                ),
              )}
            </select>
          </label>
          <label
            id={htmlId("transactions_transactions_page_label_3")}
            className="text-sm"
          >
            จากวันที่
            <input
              id={htmlId("transactions_transactions_page_from")}
              type="date"
              name="from"
              defaultValue={filters.from ?? ""}
              className="border-input bg-background mt-1 h-10 w-full rounded-md border px-2"
            />
          </label>
          <label
            id={htmlId("transactions_transactions_page_label_4")}
            className="text-sm"
          >
            ถึงวันที่
            <input
              id={htmlId("transactions_transactions_page_to")}
              type="date"
              name="to"
              defaultValue={filters.to ?? ""}
              className="border-input bg-background mt-1 h-10 w-full rounded-md border px-2"
            />
          </label>
          <Button
            id={htmlId("transactions_transactions_page_button_4")}
            type="submit"
            variant="outline"
          >
            กรองรายการ
          </Button>
        </form>
        <section
          id={htmlId("transactions_transactions_page_section")}
          className="border-input mt-6 overflow-hidden rounded-xl border"
        >
          {error ? (
            <p
              id={htmlId("transactions_transactions_page_transactions_2")}
              className="p-5 text-sm text-red-600"
            >
              โหลด Transactions ไม่สำเร็จ
            </p>
          ) : transactions?.length ? (
            <div className="overflow-x-auto">
              <table
                id={htmlId("transactions_transactions_page_table")}
                className="w-full min-w-[800px] text-left text-sm"
              >
                <thead
                  id={htmlId("transactions_transactions_page_thead")}
                  className="bg-muted/50"
                >
                  <tr id={htmlId("transactions_transactions_page_tr")}>
                    <th
                      id={htmlId("transactions_transactions_page_th")}
                      className="px-5 py-3"
                    >
                      เลขที่
                    </th>
                    <th
                      id={htmlId("transactions_transactions_page_th_2")}
                      className="px-5 py-3"
                    >
                      วันที่
                    </th>
                    <th
                      id={htmlId("transactions_transactions_page_th_3")}
                      className="px-5 py-3"
                    >
                      ประเภท
                    </th>
                    <th
                      id={htmlId("transactions_transactions_page_th_4")}
                      className="px-5 py-3"
                    >
                      สมาชิก
                    </th>
                    <th
                      id={htmlId("transactions_transactions_page_th_5")}
                      className="px-5 py-3"
                    >
                      สถานะ
                    </th>
                  </tr>
                </thead>
                <tbody
                  id={htmlId("transactions_transactions_page_tbody")}
                  className="divide-input divide-y"
                >
                  {transactions.map((transaction, htmlRowIndex1) => (
                    <tr
                      id={htmlId(
                        "transactions_transactions_page_tr_2",
                        htmlRowIndex1,
                      )}
                      key={transaction.id}
                    >
                      <td
                        id={htmlId(
                          "transactions_transactions_page_td",
                          htmlRowIndex1,
                        )}
                        className="px-5 py-4"
                      >
                        <Link
                          id={htmlId(
                            "transactions_transactions_page_transaction_transaction_no",
                            htmlRowIndex1,
                          )}
                          href={`/c/${clan.slug}/transactions/${transaction.id}`}
                          className="text-primary font-medium hover:underline"
                        >
                          {transaction.transaction_no}
                        </Link>
                      </td>
                      <td
                        id={htmlId(
                          "transactions_transactions_page_transaction_transaction_date",
                          htmlRowIndex1,
                        )}
                        className="px-5 py-4"
                      >
                        {transaction.transaction_date}
                      </td>
                      <td
                        id={htmlId(
                          "transactions_transactions_page_td_2",
                          htmlRowIndex1,
                        )}
                        className="px-5 py-4"
                      >
                        {labels[transaction.transaction_type] ??
                          transaction.transaction_type}
                      </td>
                      <td
                        id={htmlId(
                          "transactions_transactions_page_td_3",
                          htmlRowIndex1,
                        )}
                        className="px-5 py-4"
                      >
                        {transaction.contributor?.character_name ?? "—"}
                      </td>
                      <td
                        id={htmlId(
                          "transactions_transactions_page_td_4",
                          htmlRowIndex1,
                        )}
                        className="px-5 py-4"
                      >
                        <span className="bg-muted rounded-full px-2.5 py-1 text-xs">
                          {transaction.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p
              id={htmlId("transactions_transactions_page_transaction")}
              className="text-muted-foreground p-5 text-sm"
            >
              ยังไม่มี Transaction
            </p>
          )}
        </section>
      </main>
    </>
  );
}
