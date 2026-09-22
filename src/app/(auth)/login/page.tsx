import { AuthShell } from "@/components/auth/auth-shell";
import { LoginForm } from "@/components/auth/auth-forms";
import { safeNextPath } from "@/lib/auth/redirect";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; reset?: string; error?: string }>;
}) {
  const params = await searchParams;
  return (
    <AuthShell title="เข้าสู่ระบบ" description="ใช้ชื่อผู้ใช้และรหัสผ่านของคุณ">
      <LoginForm
        next={safeNextPath(params.next)}
        passwordWasReset={params.reset === "success"}
        callbackFailed={params.error === "callback"}
      />
    </AuthShell>
  );
}
