import Link from "next/link";
import { Button } from "@/components/ui/button";
export default function NotFound() {
  return (
    <main className="mx-auto max-w-xl space-y-4 p-8">
      <h1 className="text-2xl font-bold">ไม่พบหน้าที่ต้องการ</h1>
      <Button asChild>
        <Link href="/">กลับหน้าหลัก</Link>
      </Button>
    </main>
  );
}
