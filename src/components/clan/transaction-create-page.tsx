import { randomUUID } from "node:crypto";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { AppHeader } from "@/components/clan/app-header";
import { TransactionForm } from "@/components/clan/transaction-forms";
import { createClient } from "@/lib/supabase/server";
import { htmlId } from "@/lib/html-id";

export async function TransactionCreatePage({
  clanSlug,
  transactionType,
}: {
  clanSlug: string;
  transactionType: "DEPOSIT" | "WITHDRAW" | "TRANSFER";
}) {
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  if (typeof claims?.claims?.sub !== "string")
    redirect(
      `/login?next=${encodeURIComponent(`/c/${clanSlug}/transactions/new/${transactionType.toLowerCase()}`)}`,
    );
  const { data: clan } = await supabase
    .from("clans")
    .select("id,name,slug")
    .eq("slug", clanSlug)
    .maybeSingle();
  if (!clan) notFound();
  const permission =
    transactionType === "DEPOSIT"
      ? "transaction.deposit"
      : transactionType === "WITHDRAW"
        ? "transaction.withdraw"
        : "warehouse.transfer";
  const [
    { data: assets },
    { data: warehouses },
    { data: members },
    { data: allowed },
  ] = await Promise.all([
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
    supabase.rpc("has_clan_permission", {
      p_clan_id: clan.id,
      p_permission_code: permission,
    }),
  ]);
  if (!allowed) redirect(`/c/${clan.slug}/transactions?error=permission`);
  const title =
    transactionType === "DEPOSIT"
      ? "Deposit"
      : transactionType === "WITHDRAW"
        ? "Withdraw"
        : "Transfer";
  return (
    <>
      <AppHeader activeClan={clan.name} />
      <main
        id={htmlId("clan_transaction_create_page_main")}
        className="mx-auto w-full max-w-5xl px-5 py-10 sm:px-6"
      >
        <Link
          id={htmlId("clan_transaction_create_page_transactions")}
          href={`/c/${clan.slug}/transactions`}
          className="text-primary text-sm font-medium hover:underline"
        >
          ← กลับ Transactions
        </Link>
        <h1
          id={htmlId("clan_transaction_create_page_h1")}
          className="mt-4 text-3xl font-bold"
        >
          สร้าง {title}
        </h1>
        <p
          id={htmlId("clan_transaction_create_page_post_atomic")}
          className="text-muted-foreground mt-2"
        >
          รายการจะถูกตรวจยอดและ Post แบบ atomic
        </p>
        <section
          id={htmlId("clan_transaction_create_page_section")}
          className="border-input mt-8 rounded-xl border p-5 sm:p-6"
        >
          {assets?.length ? (
            <TransactionForm
              clanSlug={clan.slug}
              transactionType={transactionType}
              clientRequestId={randomUUID()}
              assets={assets}
              warehouses={warehouses ?? []}
              members={members ?? []}
            />
          ) : (
            <p
              id={htmlId("clan_transaction_create_page_active_asset")}
              className="text-sm"
            >
              ต้องสร้าง Active Asset ก่อนทำรายการ
            </p>
          )}
        </section>
      </main>
    </>
  );
}
