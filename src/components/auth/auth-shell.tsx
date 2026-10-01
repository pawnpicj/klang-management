import Image from "next/image";
import Link from "next/link";
import { htmlId } from "@/lib/html-id";
import { useId as useHtmlId } from "react";

export function AuthShell({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  const htmlIdPrefix = useHtmlId();

  return (
    <main
      id={htmlId("auth_auth_shell_main", htmlIdPrefix)}
      className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-6 py-12"
    >
      <Link
        id={htmlId("auth_auth_shell_link", htmlIdPrefix)}
        href="/"
        className="mx-auto mb-8"
        aria-label="กลับหน้าหลัก"
      >
        <Image
          id={htmlId("auth_auth_shell_image", htmlIdPrefix)}
          src="/klang-logo.png"
          alt="KLANG Management"
          width={1254}
          height={1254}
          sizes="176px"
          className="h-auto w-44"
          preload
        />
      </Link>
      <div className="border-input bg-background rounded-2xl border p-6 shadow-sm sm:p-8">
        <h1
          id={htmlId("auth_auth_shell_h1", htmlIdPrefix)}
          className="text-2xl font-bold tracking-tight"
        >
          {title}
        </h1>
        <p
          id={htmlId("auth_auth_shell_p", htmlIdPrefix)}
          className="text-muted-foreground mt-2 text-sm leading-6"
        >
          {description}
        </p>
        <div className="mt-6">{children}</div>
      </div>
    </main>
  );
}
