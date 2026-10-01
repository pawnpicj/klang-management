"use client";
import { htmlId } from "@/lib/html-id";
import { useId as useHtmlId } from "react";

export default function GlobalError({ reset }: { reset: () => void }) {
  const htmlIdPrefix = useHtmlId();

  return (
    <html lang="th">
      <body>
        <main id={htmlId("home_global_error_main", htmlIdPrefix)}>
          <h1 id={htmlId("home_global_error_h1", htmlIdPrefix)}>
            เกิดข้อผิดพลาด
          </h1>
          <button
            id={htmlId("home_global_error_button", htmlIdPrefix)}
            onClick={reset}
          >
            ลองอีกครั้ง
          </button>
        </main>
      </body>
    </html>
  );
}
