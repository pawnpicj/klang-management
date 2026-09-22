import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { logoutAction } from "@/features/auth/actions";

export function AppHeader({ activeClan }: { activeClan?: string }) {
  return (
    <header className="border-input bg-background border-b">
      <div className="mx-auto flex min-h-16 w-full max-w-5xl items-center justify-between gap-4 px-5 py-3 sm:px-6">
        <Link
          href="/clans"
          className="flex min-w-0 items-center gap-3"
          aria-label="KLANG Management"
        >
          <Image
            src="/klang-icon.png"
            alt=""
            width={1254}
            height={1254}
            sizes="40px"
            className="size-10 shrink-0 object-contain"
          />
          <span className="min-w-0">
            <span className="block truncate font-bold">KLANG Management</span>
            {activeClan && (
              <span className="text-muted-foreground block truncate text-xs">
                {activeClan}
              </span>
            )}
          </span>
        </Link>
        <nav
          className="flex shrink-0 items-center gap-2"
          aria-label="เมนูบัญชี"
        >
          <Button asChild size="sm" variant="outline">
            <Link href="/profile">โปรไฟล์</Link>
          </Button>
          <form action={logoutAction}>
            <Button type="submit" size="sm" variant="outline">
              ออกจากระบบ
            </Button>
          </form>
        </nav>
      </div>
    </header>
  );
}
