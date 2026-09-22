"use client";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Application error", error.digest ?? "unknown");
  }, [error]);
  return (
    <main className="mx-auto max-w-xl space-y-4 p-8">
      <h1 className="text-2xl font-bold">เกิดข้อผิดพลาด</h1>
      <p>กรุณาลองอีกครั้ง</p>
      <Button onClick={reset}>ลองอีกครั้ง</Button>
    </main>
  );
}
