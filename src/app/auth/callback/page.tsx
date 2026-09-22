"use client";

import type { EmailOtpType } from "@supabase/supabase-js";
import { useEffect, useState } from "react";
import { safeNextPath } from "@/lib/auth/redirect";
import { createClient } from "@/lib/supabase/client";

const emailOtpTypes = new Set<EmailOtpType>([
  "signup",
  "invite",
  "magiclink",
  "recovery",
  "email_change",
  "email",
]);

export default function AuthCallbackPage() {
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const confirm = async () => {
      const url = new URL(window.location.href);
      const hash = new URLSearchParams(url.hash.slice(1));
      const destination = safeNextPath(url.searchParams.get("next"));
      const accessToken = hash.get("access_token");
      const refreshToken = hash.get("refresh_token");
      const code = url.searchParams.get("code");
      const tokenHash = url.searchParams.get("token_hash");
      const type = url.searchParams.get("type") as EmailOtpType | null;

      window.history.replaceState(null, "", "/auth/callback");

      try {
        const supabase = createClient();
        let error: unknown;
        if (accessToken && refreshToken) {
          ({ error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          }));
        } else if (code) {
          ({ error } = await supabase.auth.exchangeCodeForSession(code));
        } else if (tokenHash && type && emailOtpTypes.has(type)) {
          ({ error } = await supabase.auth.verifyOtp({
            type,
            token_hash: tokenHash,
          }));
        } else {
          error = new Error("Missing authentication callback parameters");
        }

        if (error) throw error;
        window.location.replace(destination);
      } catch (error) {
        console.error("Auth callback failed", error);
        setFailed(true);
      }
    };

    void confirm();
  }, []);

  if (failed) {
    return (
      <main className="flex min-h-screen items-center justify-center px-6">
        <div className="max-w-md text-center">
          <h1 className="text-2xl font-bold">ยืนยันตัวตนไม่สำเร็จ</h1>
          <a className="text-primary mt-4 inline-block underline" href="/login">
            กลับไปหน้าเข้าสู่ระบบ
          </a>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-6">
      <p className="text-muted-foreground">กำลังยืนยันตัวตน…</p>
    </main>
  );
}
