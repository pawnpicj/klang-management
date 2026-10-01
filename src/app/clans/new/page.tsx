import Link from "next/link";
import { AppHeader } from "@/components/clan/app-header";
import { CreateClanForm } from "@/components/clan/create-clan-form";
import { htmlId } from "@/lib/html-id";
import { useId as useHtmlId } from "react";

export default function NewClanPage() {
  const htmlIdPrefix = useHtmlId();

  return (
    <>
      <AppHeader />
      <main
        id={htmlId("new_new_clan_page_main", htmlIdPrefix)}
        className="mx-auto w-full max-w-xl px-5 py-10 sm:px-6"
      >
        <Link
          id={htmlId("new_new_clan_page_clans", htmlIdPrefix)}
          href="/clans"
          className="text-primary text-sm font-medium underline-offset-4 hover:underline"
        >
          ← กลับรายการ Clan/Gang
        </Link>
        <h1
          id={htmlId("new_new_clan_page_clan_gang", htmlIdPrefix)}
          className="mt-5 text-3xl font-bold tracking-tight"
        >
          สร้าง Clan/Gang
        </h1>
        <p
          id={htmlId("new_new_clan_page_manager_main_warehouse", htmlIdPrefix)}
          className="text-muted-foreground mt-2 leading-7"
        >
          ระบบจะให้ผู้สร้างเป็น Manager และสร้างบทบาทมาตรฐานพร้อม Main Warehouse
          ให้อัตโนมัติ
        </p>
        <section
          id={htmlId("new_new_clan_page_section", htmlIdPrefix)}
          className="border-input mt-8 rounded-xl border p-5 sm:p-6"
        >
          <CreateClanForm />
        </section>
      </main>
    </>
  );
}
