import Image from "next/image";
import Link from "next/link";

export function AuthShell({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-6 py-12">
      <Link href="/" className="mx-auto mb-8" aria-label="กลับหน้าหลัก">
        <Image
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
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        <p className="text-muted-foreground mt-2 text-sm leading-6">
          {description}
        </p>
        <div className="mt-6">{children}</div>
      </div>
    </main>
  );
}
