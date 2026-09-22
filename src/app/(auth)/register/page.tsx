import { AuthShell } from "@/components/auth/auth-shell";
import { RegisterForm } from "@/components/auth/auth-forms";

export default function RegisterPage() {
  return (
    <AuthShell
      title="สมัครสมาชิก"
      description="สร้างบัญชีเดียวเพื่อเข้าร่วมได้หลาย Clan และ Gang"
    >
      <RegisterForm />
    </AuthShell>
  );
}
