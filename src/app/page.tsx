import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen max-w-4xl flex-col items-center justify-center px-6 py-16 text-center">
      <Image
        src="/klang-logo.png"
        alt="โลโก้ KLANG Management"
        width={1254}
        height={1254}
        sizes="(min-width: 640px) 288px, 224px"
        preload
        className="mb-8 h-auto w-56 max-w-full sm:w-72"
      />
      <h1 className="text-4xl font-bold tracking-tight sm:text-6xl">
        KLANG Management
      </h1>
      <p className="text-muted-foreground mt-5 text-xl">
        ระบบจัดการคลัง Clan &amp; Gang
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Button asChild>
          <Link href="/login">เข้าสู่ระบบ</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/register">สมัครสมาชิก</Link>
        </Button>
      </div>
      <div className="border-input mt-12 w-full max-w-xl rounded-xl border p-6">
        <h2 className="font-semibold">ระบบบัญชีพร้อมใช้งาน</h2>
        <p className="text-muted-foreground mt-2 leading-7">
          สมัครสมาชิก เข้าสู่ระบบ จัดการโปรไฟล์ และกู้คืนรหัสผ่านได้อย่างปลอดภัย
        </p>
      </div>
    </main>
  );
}
