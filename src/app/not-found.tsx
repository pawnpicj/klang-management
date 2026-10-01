import Link from "next/link";
import { Button } from "@/components/ui/button";
import { htmlId } from "@/lib/html-id";
import { useId as useHtmlId } from "react";

export default function NotFound() {
  const htmlIdPrefix = useHtmlId();

  return (
    <main
      id={htmlId("home_not_found_main", htmlIdPrefix)}
      className="mx-auto max-w-xl space-y-4 p-8"
    >
      <h1
        id={htmlId("home_not_found_h1", htmlIdPrefix)}
        className="text-2xl font-bold"
      >
        ไม่พบหน้าที่ต้องการ
      </h1>
      <Button id={htmlId("home_not_found_button", htmlIdPrefix)} asChild>
        <Link id={htmlId("home_not_found_link", htmlIdPrefix)} href="/">
          กลับหน้าหลัก
        </Link>
      </Button>
    </main>
  );
}
