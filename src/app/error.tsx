"use client";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { htmlId } from "@/lib/html-id";
import { useId as useHtmlId } from "react";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const htmlIdPrefix = useHtmlId();

  useEffect(() => {
    console.error("Application error", error.digest ?? "unknown");
  }, [error]);
  return (
    <main
      id={htmlId("home_error_page_main", htmlIdPrefix)}
      className="mx-auto max-w-xl space-y-4 p-8"
    >
      <h1
        id={htmlId("home_error_page_h1", htmlIdPrefix)}
        className="text-2xl font-bold"
      >
        เกิดข้อผิดพลาด
      </h1>
      <p id={htmlId("home_error_page_p", htmlIdPrefix)}>กรุณาลองอีกครั้ง</p>
      <Button
        id={htmlId("home_error_page_button", htmlIdPrefix)}
        onClick={reset}
      >
        ลองอีกครั้ง
      </Button>
    </main>
  );
}
