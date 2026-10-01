import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { htmlId } from "@/lib/html-id";
import { useId as useHtmlId } from "react";

export default function Home() {
  const htmlIdPrefix = useHtmlId();

  return (
    <main
      id={htmlId("home_home_main", htmlIdPrefix)}
      className="mx-auto flex min-h-screen max-w-4xl flex-col items-center justify-center px-6 py-16 text-center"
    >
      <Image
        id={htmlId("home_home_image", htmlIdPrefix)}
        src="/klang-logo.png"
        alt="โลโก้ KLANG Management"
        width={1254}
        height={1254}
        sizes="(min-width: 640px) 288px, 224px"
        preload
        className="mb-8 h-auto w-56 max-w-full sm:w-72"
      />
      <h1
        id={htmlId("home_home_klang_management", htmlIdPrefix)}
        className="text-4xl font-bold tracking-tight sm:text-6xl"
      >
        KLANG Management
      </h1>
      <p
        id={htmlId("home_home_clan_amp_gang", htmlIdPrefix)}
        className="text-muted-foreground mt-5 text-xl"
      >
        ระบบจัดการคลัง Clan &amp; Gang
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Button id={htmlId("home_home_button", htmlIdPrefix)} asChild>
          <Link id={htmlId("home_home_login", htmlIdPrefix)} href="/login">
            เข้าสู่ระบบ
          </Link>
        </Button>
        <Button
          id={htmlId("home_home_button_2", htmlIdPrefix)}
          asChild
          variant="outline"
        >
          <Link
            id={htmlId("home_home_register", htmlIdPrefix)}
            href="/register"
          >
            สมัครสมาชิก
          </Link>
        </Button>
      </div>
      <div className="border-input mt-12 w-full max-w-xl rounded-xl border p-6">
        <h2 id={htmlId("home_home_h2", htmlIdPrefix)} className="font-semibold">
          ระบบบัญชีพร้อมใช้งาน
        </h2>
        <p
          id={htmlId("home_home_p", htmlIdPrefix)}
          className="text-muted-foreground mt-2 leading-7"
        >
          สมัครสมาชิก เข้าสู่ระบบ จัดการโปรไฟล์ และกู้คืนรหัสผ่านได้อย่างปลอดภัย
        </p>
      </div>
    </main>
  );
}
