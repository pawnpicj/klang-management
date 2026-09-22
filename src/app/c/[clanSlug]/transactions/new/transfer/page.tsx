import { TransactionCreatePage } from "@/components/clan/transaction-create-page";
export const dynamic = "force-dynamic";
export default async function Page({
  params,
}: {
  params: Promise<{ clanSlug: string }>;
}) {
  return (
    <TransactionCreatePage
      clanSlug={(await params).clanSlug}
      transactionType="TRANSFER"
    />
  );
}
