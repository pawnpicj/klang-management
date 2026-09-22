import { AuthShell } from "@/components/auth/auth-shell";
import { ForgotPasswordForm } from "@/components/auth/auth-forms";

export default function ForgotPasswordPage() {
  return (
    <AuthShell
      title="ลืมรหัสผ่าน"
      description="กรอกอีเมลที่ใช้สมัครเพื่อรับลิงก์ตั้งรหัสผ่านใหม่"
    >
      <ForgotPasswordForm />
    </AuthShell>
  );
}
