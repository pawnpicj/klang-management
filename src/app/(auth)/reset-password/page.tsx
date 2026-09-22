import { AuthShell } from "@/components/auth/auth-shell";
import { ResetPasswordForm } from "@/components/auth/auth-forms";

export default function ResetPasswordPage() {
  return (
    <AuthShell
      title="ตั้งรหัสผ่านใหม่"
      description="เลือกรหัสผ่านใหม่ที่มีอย่างน้อย 8 ตัวอักษร"
    >
      <ResetPasswordForm />
    </AuthShell>
  );
}
