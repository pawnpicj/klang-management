import { ActionNotice } from "@/components/ui/action-notice";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { AppHeader } from "@/components/clan/app-header";
import {
  EvidenceUploadForm,
  VoidTransactionButton,
} from "@/components/clan/transaction-forms";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";
import { htmlId } from "@/lib/html-id";

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
      <main
        id={htmlId("transaction_id_transaction_detail_page_main")}
        className="mx-auto w-full max-w-5xl px-5 py-10 sm:px-6"
      >
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <Link
              id={htmlId("transaction_id_transaction_detail_page_transactions")}
              href={`/c/${clan.slug}/transactions`}
              className="text-primary text-sm font-medium hover:underline"
            >
              ← กลับ Transactions
            </Link>
            <h1
              id={htmlId(
                "transaction_id_transaction_detail_page_transaction_transaction_no",
              )}
              className="mt-4 text-3xl font-bold"
            >
              {transaction.transaction_no}
            </h1>
            <p
              id={htmlId(
                "transaction_id_transaction_detail_page_transaction_transaction_type",
              )}
              className="text-muted-foreground mt-2"
            >
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
          <ActionNotice
            queryKeys={["created", "uploaded", "voided"]}
            className="mt-6 rounded-md bg-emerald-50 p-3 text-sm text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200"
          >
            {notice}
          </ActionNotice>
        )}
        {query.error && (
          <p
            id={htmlId("transaction_id_transaction_detail_page_void_void")}
            className="mt-6 rounded-md bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-200"
          >
            Void ไม่สำเร็จ อาจมียอดไม่พอหรือรายการถูก Void แล้ว
          </p>
        )}
        <section
          id={htmlId("transaction_id_transaction_detail_page_section")}
          className="mt-8 grid gap-4 sm:grid-cols-3"
        >
          <div className="border-input rounded-xl border p-4">
            <p
              id={htmlId("transaction_id_transaction_detail_page_p")}
              className="text-muted-foreground text-sm"
            >
              สถานะ
            </p>
            <p
              id={htmlId(
                "transaction_id_transaction_detail_page_transaction_status",
              )}
              className="mt-2 font-semibold"
            >
              {transaction.status}
            </p>
          </div>
          <div className="border-input rounded-xl border p-4">
            <p
              id={htmlId("transaction_id_transaction_detail_page_p_2")}
              className="text-muted-foreground text-sm"
            >
              สมาชิก
            </p>
            <p
              id={htmlId("transaction_id_transaction_detail_page_p_3")}
              className="mt-2 font-semibold"
            >
              {transaction.contributor?.character_name ?? "ไม่ระบุ"}
            </p>
          </div>
          <div className="border-input rounded-xl border p-4">
            <p
              id={htmlId("transaction_id_transaction_detail_page_p_4")}
              className="text-muted-foreground text-sm"
            >
              ผู้ทำรายการ
            </p>
            <p
              id={htmlId("transaction_id_transaction_detail_page_p_5")}
              className="mt-2 font-mono text-xs"
            >
              {transaction.created_by === userId
                ? "บัญชีของคุณ"
                : transaction.created_by}
            </p>
          </div>
        </section>
        {transaction.note && (
          <p
            id={htmlId(
              "transaction_id_transaction_detail_page_transaction_note",
            )}
            className="border-input mt-4 rounded-xl border p-4 text-sm"
          >
            {transaction.note}
          </p>
        )}
        {transaction.reversal_transaction_id && (
          <p
            id={htmlId("transaction_id_transaction_detail_page_p_6")}
            className="mt-4 text-sm"
          >
            รายการที่เชื่อมโยง:{" "}
            <Link
              id={htmlId(
                "transaction_id_transaction_detail_page_transaction_reversal_transaction_id",
              )}
              className="text-primary hover:underline"
              href={`/c/${clan.slug}/transactions/${transaction.reversal_transaction_id}`}
            >
              {transaction.reversal_transaction_id}
            </Link>
          </p>
        )}
        <section
          id={htmlId("transaction_id_transaction_detail_page_section_2")}
          className="border-input mt-8 overflow-hidden rounded-xl border"
        >
          <div className="border-input border-b px-5 py-4">
            <h2
              id={htmlId("transaction_id_transaction_detail_page_asset")}
              className="font-semibold"
            >
              รายการ Asset
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table
              id={htmlId("transaction_id_transaction_detail_page_table")}
              className="w-full min-w-[720px] text-left text-sm"
            >
              <thead
                id={htmlId("transaction_id_transaction_detail_page_thead")}
                className="bg-muted/50"
              >
                <tr id={htmlId("transaction_id_transaction_detail_page_tr")}>
                  <th
                    id={htmlId(
                      "transaction_id_transaction_detail_page_asset_2",
                    )}
                    className="px-5 py-3"
                  >
                    Asset
                  </th>
                  <th
                    id={htmlId("transaction_id_transaction_detail_page_th")}
                    className="px-5 py-3"
                  >
                    ต้นทาง
                  </th>
                  <th
                    id={htmlId("transaction_id_transaction_detail_page_th_2")}
                    className="px-5 py-3"
                  >
                    ปลายทาง
                  </th>
                  <th
                    id={htmlId("transaction_id_transaction_detail_page_th_3")}
                    className="px-5 py-3 text-right"
                  >
                    จำนวน
                  </th>
                  <th
                    id={htmlId("transaction_id_transaction_detail_page_th_4")}
                    className="px-5 py-3 text-right"
                  >
                    มูลค่า/หน่วย
                  </th>
                </tr>
              </thead>
              <tbody
                id={htmlId("transaction_id_transaction_detail_page_tbody")}
                className="divide-input divide-y"
              >
                {items?.map((item, htmlRowIndex1) => (
                  <tr
                    id={htmlId(
                      "transaction_id_transaction_detail_page_tr_2",
                      htmlRowIndex1,
                    )}
                    key={item.id}
                  >
                    <td
                      id={htmlId(
                        "transaction_id_transaction_detail_page_item_asset_code",
                        htmlRowIndex1,
                      )}
                      className="px-5 py-4"
                    >
                      {item.asset.code} · {item.asset.name}
                    </td>
                    <td
                      id={htmlId(
                        "transaction_id_transaction_detail_page_td",
                        htmlRowIndex1,
                      )}
                      className="px-5 py-4"
                    >
                      {item.from_warehouse?.name ?? "—"}
                    </td>
                    <td
                      id={htmlId(
                        "transaction_id_transaction_detail_page_td_2",
                        htmlRowIndex1,
                      )}
                      className="px-5 py-4"
                    >
                      {item.to_warehouse?.name ?? "—"}
                    </td>
                    <td
                      id={htmlId(
                        "transaction_id_transaction_detail_page_td_3",
                        htmlRowIndex1,
                      )}
                      className="px-5 py-4 text-right tabular-nums"
                    >
                      {number(Number(item.quantity), item.asset.decimal_places)}{" "}
                      {item.asset.unit}
                    </td>
                    <td
                      id={htmlId(
                        "transaction_id_transaction_detail_page_td_4",
                        htmlRowIndex1,
                      )}
                      className="px-5 py-4 text-right tabular-nums"
                    >
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
        <section
          id={htmlId("transaction_id_transaction_detail_page_section_3")}
          className="border-input mt-8 rounded-xl border p-5 sm:p-6"
        >
          <div className="flex items-center justify-between">
            <h2
              id={htmlId("transaction_id_transaction_detail_page_h2")}
              className="text-lg font-semibold"
            >
              หลักฐาน
            </h2>
            <span className="text-muted-foreground text-sm">
              {attachments?.length ?? 0} ไฟล์
            </span>
          </div>
          {attachments?.length ? (
            <ul
              id={htmlId("transaction_id_transaction_detail_page_ul")}
              className="mt-4 divide-y"
            >
              {attachments.map((attachment, htmlRowIndex2) => (
                <li
                  id={htmlId(
                    "transaction_id_transaction_detail_page_li",
                    htmlRowIndex2,
                  )}
                  key={attachment.id}
                  className="flex items-center justify-between gap-4 py-3"
                >
                  <div>
                    <p
                      id={htmlId(
                        "transaction_id_transaction_detail_page_attachment_original_name",
                        htmlRowIndex2,
                      )}
                      className="font-medium"
                    >
                      {attachment.original_name}
                    </p>
                    <p
                      id={htmlId(
                        "transaction_id_transaction_detail_page_kb",
                        htmlRowIndex2,
                      )}
                      className="text-muted-foreground text-xs"
                    >
                      {attachment.mime_type} ·{" "}
                      {number(attachment.file_size / 1024, 1)} KB
                    </p>
                  </div>
                  {signedUrls.get(attachment.storage_path) && (
                    <Button
                      id={htmlId(
                        "transaction_id_transaction_detail_page_button",
                        htmlRowIndex2,
                      )}
                      asChild
                      size="sm"
                      variant="outline"
                    >
                      <a
                        id={htmlId(
                          "transaction_id_transaction_detail_page_a",
                          htmlRowIndex2,
                        )}
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
            <p
              id={htmlId("transaction_id_transaction_detail_page_p_7")}
              className="text-muted-foreground mt-4 text-sm"
            >
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
