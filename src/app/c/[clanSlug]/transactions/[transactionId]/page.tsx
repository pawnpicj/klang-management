import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { AppHeader } from "@/components/clan/app-header";
import {
  EvidenceUploadForm,
  VoidTransactionButton,
} from "@/components/clan/transaction-forms";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
const number = (value: number, decimals = 4) =>
  new Intl.NumberFormat("th-TH", { maximumFractionDigits: decimals }).format(
    value,
  );

export default async function TransactionDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ clanSlug: string; transactionId: string }>;
  searchParams: Promise<{
    created?: string;
    uploaded?: string;
    voided?: string;
    error?: string;
  }>;
}) {
  const [{ clanSlug, transactionId }, query] = await Promise.all([
    params,
    searchParams,
  ]);
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims?.sub;
  if (typeof userId !== "string")
    redirect(
      `/login?next=${encodeURIComponent(`/c/${clanSlug}/transactions/${transactionId}`)}`,
    );
  const { data: clan } = await supabase
    .from("clans")
    .select("id,name,slug")
    .eq("slug", clanSlug)
    .maybeSingle();
  if (!clan) notFound();
  const [
    { data: transaction },
    { data: items },
    { data: attachments },
    { data: canVoid },
    { data: canUpload },
  ] = await Promise.all([
    supabase
      .from("transactions")
      .select(
        "id,transaction_no,transaction_type,transaction_date,status,note,created_by,created_at,approved_at,voided_at,reversal_transaction_id,contributor:clan_members!transactions_clan_id_contributor_member_id_fkey(character_name)",
      )
      .eq("clan_id", clan.id)
      .eq("id", transactionId)
      .maybeSingle(),
    supabase
      .from("transaction_items")
      .select(
        "id,quantity,unit_value,note,asset:assets!transaction_items_clan_id_asset_id_fkey(code,name,unit,decimal_places),from_warehouse:warehouses!transaction_items_clan_id_from_warehouse_id_fkey(name),to_warehouse:warehouses!transaction_items_clan_id_to_warehouse_id_fkey(name)",
      )
      .eq("clan_id", clan.id)
      .eq("transaction_id", transactionId),
    supabase
      .from("attachments")
      .select("id,storage_path,original_name,mime_type,file_size,created_at")
      .eq("clan_id", clan.id)
      .eq("transaction_id", transactionId)
      .order("created_at"),
    supabase.rpc("has_clan_permission", {
      p_clan_id: clan.id,
      p_permission_code: "transaction.void",
    }),
    supabase.rpc("can_manage_transaction_evidence", {
      p_clan_id: clan.id,
      p_transaction_id: transactionId,
    }),
  ]);
  if (!transaction) notFound();
  const paths = attachments?.map((attachment) => attachment.storage_path) ?? [];
  const { data: signed } = paths.length
    ? await supabase.storage
        .from("transaction-evidence")
        .createSignedUrls(paths, 3600)
    : { data: [] };
  const signedUrls = new Map(
    (signed ?? []).map((item) => [item.path, item.signedUrl]),
  );
  const notice = query.created
    ? "บันทึกและ Post Transaction แล้ว"
    : query.uploaded
      ? "อัปโหลดหลักฐานแล้ว"
      : query.voided
        ? "Void Transaction แล้ว"
        : null;
  return (
    <>
      <AppHeader activeClan={clan.name} />
      <main className="mx-auto w-full max-w-5xl px-5 py-10 sm:px-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <Link
              href={`/c/${clan.slug}/transactions`}
              className="text-primary text-sm font-medium hover:underline"
            >
              ← กลับ Transactions
            </Link>
            <h1 className="mt-4 text-3xl font-bold">
              {transaction.transaction_no}
            </h1>
            <p className="text-muted-foreground mt-2">
              {transaction.transaction_type} · {transaction.transaction_date}
            </p>
          </div>
          {canVoid && transaction.status === "POSTED" && (
            <VoidTransactionButton
              clanSlug={clan.slug}
              transactionId={transaction.id}
            />
          )}
        </div>
        {notice && (
          <p
            className="mt-6 rounded-md bg-emerald-50 p-3 text-sm text-emerald-800"
            role="status"
          >
            {notice}
          </p>
        )}
        {query.error && (
          <p className="mt-6 rounded-md bg-red-50 p-3 text-sm text-red-700">
            Void ไม่สำเร็จ อาจมียอดไม่พอหรือรายการถูก Void แล้ว
          </p>
        )}
        <section className="mt-8 grid gap-4 sm:grid-cols-3">
          <div className="border-input rounded-xl border p-4">
            <p className="text-muted-foreground text-sm">สถานะ</p>
            <p className="mt-2 font-semibold">{transaction.status}</p>
          </div>
          <div className="border-input rounded-xl border p-4">
            <p className="text-muted-foreground text-sm">สมาชิก</p>
            <p className="mt-2 font-semibold">
              {transaction.contributor?.character_name ?? "ไม่ระบุ"}
            </p>
          </div>
          <div className="border-input rounded-xl border p-4">
            <p className="text-muted-foreground text-sm">ผู้ทำรายการ</p>
            <p className="mt-2 font-mono text-xs">
              {transaction.created_by === userId
                ? "บัญชีของคุณ"
                : transaction.created_by}
            </p>
          </div>
        </section>
        {transaction.note && (
          <p className="border-input mt-4 rounded-xl border p-4 text-sm">
            {transaction.note}
          </p>
        )}
        {transaction.reversal_transaction_id && (
          <p className="mt-4 text-sm">
            รายการที่เชื่อมโยง:{" "}
            <Link
              className="text-primary hover:underline"
              href={`/c/${clan.slug}/transactions/${transaction.reversal_transaction_id}`}
            >
              {transaction.reversal_transaction_id}
            </Link>
          </p>
        )}
        <section className="border-input mt-8 overflow-hidden rounded-xl border">
          <div className="border-input border-b px-5 py-4">
            <h2 className="font-semibold">รายการ Asset</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-5 py-3">Asset</th>
                  <th className="px-5 py-3">ต้นทาง</th>
                  <th className="px-5 py-3">ปลายทาง</th>
                  <th className="px-5 py-3 text-right">จำนวน</th>
                  <th className="px-5 py-3 text-right">มูลค่า/หน่วย</th>
                </tr>
              </thead>
              <tbody className="divide-input divide-y">
                {items?.map((item) => (
                  <tr key={item.id}>
                    <td className="px-5 py-4">
                      {item.asset.code} · {item.asset.name}
                    </td>
                    <td className="px-5 py-4">
                      {item.from_warehouse?.name ?? "—"}
                    </td>
                    <td className="px-5 py-4">
                      {item.to_warehouse?.name ?? "—"}
                    </td>
                    <td className="px-5 py-4 text-right tabular-nums">
                      {number(Number(item.quantity), item.asset.decimal_places)}{" "}
                      {item.asset.unit}
                    </td>
                    <td className="px-5 py-4 text-right tabular-nums">
                      {item.unit_value == null
                        ? "—"
                        : number(Number(item.unit_value))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
        <section className="border-input mt-8 rounded-xl border p-5 sm:p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">หลักฐาน</h2>
            <span className="text-muted-foreground text-sm">
              {attachments?.length ?? 0} ไฟล์
            </span>
          </div>
          {attachments?.length ? (
            <ul className="mt-4 divide-y">
              {attachments.map((attachment) => (
                <li
                  key={attachment.id}
                  className="flex items-center justify-between gap-4 py-3"
                >
                  <div>
                    <p className="font-medium">{attachment.original_name}</p>
                    <p className="text-muted-foreground text-xs">
                      {attachment.mime_type} ·{" "}
                      {number(attachment.file_size / 1024, 1)} KB
                    </p>
                  </div>
                  {signedUrls.get(attachment.storage_path) && (
                    <Button asChild size="sm" variant="outline">
                      <a
                        href={
                          signedUrls.get(attachment.storage_path) ?? undefined
                        }
                        target="_blank"
                        rel="noreferrer"
                      >
                        เปิดไฟล์
                      </a>
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-muted-foreground mt-4 text-sm">
              ยังไม่มีหลักฐาน
            </p>
          )}
          {canUpload && (
            <div className="mt-5 border-t pt-5">
              <EvidenceUploadForm
                clanSlug={clan.slug}
                transactionId={transaction.id}
              />
            </div>
          )}
        </section>
      </main>
    </>
  );
}
