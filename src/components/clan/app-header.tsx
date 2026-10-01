import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { logoutAction } from "@/features/auth/actions";
import { htmlId } from "@/lib/html-id";
import { useId as useHtmlId } from "react";

export function AppHeader({ activeClan }: { activeClan?: string }) {
  const htmlIdPrefix = useHtmlId();

  return (
    <header
      id={htmlId("clan_app_header_header", htmlIdPrefix)}
      className="border-input bg-background border-b"
    >
      <div className="mx-auto flex min-h-16 w-full max-w-5xl items-center justify-between gap-4 px-5 py-3 sm:px-6">
        <Link
          id={htmlId("clan_app_header_clans", htmlIdPrefix)}
          href="/clans"
          className="flex min-w-0 items-center gap-3"
          aria-label="KLANG Management"
        >
          <Image
            id={htmlId("clan_app_header_image", htmlIdPrefix)}
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
          id={htmlId("clan_app_header_nav", htmlIdPrefix)}
          className="flex shrink-0 items-center gap-2"
          aria-label="เมนูบัญชี"
        >
          <Button
            id={htmlId("clan_app_header_button", htmlIdPrefix)}
            asChild
            size="sm"
            variant="outline"
          >
            <Link
              id={htmlId("clan_app_header_profile", htmlIdPrefix)}
              href="/profile"
            >
              โปรไฟล์
            </Link>
          </Button>
          <form
            id={htmlId("clan_app_header_form", htmlIdPrefix)}
            action={logoutAction}
          >
            <Button
              id={htmlId("clan_app_header_button_2", htmlIdPrefix)}
              type="submit"
              size="sm"
              variant="outline"
            >
              ออกจากระบบ
            </Button>
          </form>
        </nav>
      </div>
    </header>
  );
}
