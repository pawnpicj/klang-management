"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import {
  forgotPasswordSchema,
  loginSchema,
  profileSchema,
  registerSchema,
  resetPasswordSchema,
} from "@/features/auth/schemas";
import type { AuthActionState } from "@/features/auth/state";
import {
  getAvatarValidationError,
  hasValidAvatarSignature,
} from "@/features/auth/avatar";
import { safeNextPath } from "@/lib/auth/redirect";
import {
  consumeLoginAttempt,
  createLoginRateLimitKey,
  resetLoginAttempts,
} from "@/lib/auth/rate-limit";
import { getSiteUrl } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const genericLoginError = "ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง";

function formValues(formData: FormData) {
  return Object.fromEntries(formData.entries());
}

function invalid(error: {
  flatten: () => { fieldErrors: Record<string, string[]> };
}): AuthActionState {
  return {
    status: "error",
    message: "กรุณาตรวจสอบข้อมูลที่กรอก",
    fieldErrors: error.flatten().fieldErrors,
  };
}

function configurationError(
  error: unknown,
  operation: string,
): AuthActionState {
  console.error(`Auth ${operation} failed`, error);
  return {
    status: "error",
    message: "ระบบยืนยันตัวตนยังไม่พร้อม กรุณาลองใหม่ภายหลัง",
  };
}

export async function loginWithUsernameAction(
  _previousState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const parsed = loginSchema.safeParse(formValues(formData));
  if (!parsed.success) return invalid(parsed.error);

  let authenticated = false;
  const nextPath = safeNextPath(parsed.data.next);

  try {
    const rateLimitKey = await createLoginRateLimitKey(parsed.data.username);
    if (!(await consumeLoginAttempt(rateLimitKey))) {
      return {
        status: "error",
        message: "ลองเข้าสู่ระบบหลายครั้งเกินไป กรุณารอ 15 นาที",
      };
    }

    const admin = createAdminClient();
    const { data: email, error: lookupError } = await admin.rpc(
      "resolve_login_email",
      { p_username: parsed.data.username },
    );
    if (lookupError) throw lookupError;

    const fallbackAddress = `unknown-${rateLimitKey.slice(0, 24)}@invalid.example`;
    const supabase = await createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email: email ?? fallbackAddress,
      password: parsed.data.password,
    });

    if (error || !email) {
      return { status: "error", message: genericLoginError };
    }

    await resetLoginAttempts(rateLimitKey);
    authenticated = true;
  } catch (error) {
    return configurationError(error, "login");
  }

  if (authenticated) redirect(nextPath);
  return { status: "error", message: genericLoginError };
}

export async function registerAction(
  _previousState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const parsed = registerSchema.safeParse(formValues(formData));
  if (!parsed.success) return invalid(parsed.error);

  let signedIn = false;
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.signUp({
      email: parsed.data.email,
      password: parsed.data.password,
      options: {
        data: {
          username: parsed.data.username,
          display_name: parsed.data.displayName,
        },
        emailRedirectTo: `${getSiteUrl()}/auth/callback?next=/profile`,
      },
    });

    if (error) {
      console.error("Auth registration rejected", error.code);
      return {
        status: "error",
        message: "สมัครสมาชิกไม่สำเร็จ กรุณาตรวจสอบข้อมูลหรือลองใหม่",
      };
    }
    signedIn = Boolean(data.session);
  } catch (error) {
    return configurationError(error, "registration");
  }

  if (signedIn) redirect("/profile");
  return {
    status: "success",
    message: "สมัครสมาชิกแล้ว กรุณาตรวจสอบอีเมลเพื่อยืนยันบัญชี",
  };
}

export async function forgotPasswordAction(
  _previousState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const parsed = forgotPasswordSchema.safeParse(formValues(formData));
  if (!parsed.success) return invalid(parsed.error);

  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(
      parsed.data.email,
      { redirectTo: `${getSiteUrl()}/auth/callback?next=/reset-password` },
    );
    if (error) console.error("Password reset request rejected", error.code);
  } catch (error) {
    console.error("Password reset request failed", error);
  }

  return {
    status: "success",
    message: "หากอีเมลนี้มีบัญชีอยู่ ระบบจะส่งลิงก์สำหรับตั้งรหัสผ่านใหม่ให้",
  };
}

export async function resetPasswordAction(
  _previousState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const parsed = resetPasswordSchema.safeParse(formValues(formData));
  if (!parsed.success) return invalid(parsed.error);

  let updated = false;
  try {
    const supabase = await createClient();
    const { data: claimsData } = await supabase.auth.getClaims();
    if (!claimsData?.claims?.sub) {
      return { status: "error", message: "ลิงก์ตั้งรหัสผ่านหมดอายุแล้ว" };
    }
    const { error } = await supabase.auth.updateUser({
      password: parsed.data.password,
    });
    if (error) {
      return { status: "error", message: "ตั้งรหัสผ่านไม่สำเร็จ" };
    }
    await supabase.auth.signOut({ scope: "global" });
    updated = true;
  } catch (error) {
    return configurationError(error, "password update");
  }

  if (updated) redirect("/login?reset=success");
  return { status: "error", message: "ตั้งรหัสผ่านไม่สำเร็จ" };
}

export async function updateProfileAction(
  _previousState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const parsed = profileSchema.safeParse(formValues(formData));
  if (!parsed.success) return invalid(parsed.error);

  const avatarEntry = formData.get("avatar");
  const avatarFile =
    avatarEntry !== null &&
    typeof avatarEntry === "object" &&
    avatarEntry.size > 0
      ? avatarEntry
      : null;
  if (avatarFile) {
    const avatarError = getAvatarValidationError(avatarFile);
    if (avatarError) {
      return {
        status: "error",
        message: "กรุณาตรวจสอบไฟล์รูปโปรไฟล์",
        fieldErrors: { avatar: [avatarError] },
      };
    }
    if (!(await hasValidAvatarSignature(avatarFile))) {
      return {
        status: "error",
        message: "กรุณาตรวจสอบไฟล์รูปโปรไฟล์",
        fieldErrors: { avatar: ["เนื้อหาไฟล์ไม่ตรงกับประเภทรูปภาพ"] },
      };
    }
  }

  try {
    const supabase = await createClient();
    const { data: claimsData } = await supabase.auth.getClaims();
    const userId = claimsData?.claims?.sub;
    if (typeof userId !== "string") {
      return { status: "error", message: "กรุณาเข้าสู่ระบบอีกครั้ง" };
    }
    let avatarPath: string | undefined;
    if (avatarFile) {
      avatarPath = `${userId}/avatar`;
      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(avatarPath, avatarFile, {
          cacheControl: "3600",
          contentType: avatarFile.type,
          upsert: true,
        });
      if (uploadError) throw uploadError;
    }

    const profileUpdate: { display_name: string; avatar_url?: string } = {
      display_name: parsed.data.displayName,
    };
    if (avatarPath) profileUpdate.avatar_url = avatarPath;

    const { error } = await supabase
      .from("profiles")
      .update(profileUpdate)
      .eq("id", userId);
    if (error) throw error;
    revalidatePath("/profile");
    return { status: "success", message: "บันทึกโปรไฟล์แล้ว" };
  } catch (error) {
    console.error("Profile update failed", error);
    return {
      status: "error",
      message: "บันทึกโปรไฟล์หรืออัปโหลดรูปไม่สำเร็จ กรุณาลองใหม่",
    };
  }
}

export async function logoutAction() {
  try {
    const supabase = await createClient();
    await supabase.auth.signOut({ scope: "local" });
  } catch (error) {
    console.error("Auth logout failed", error);
  }
  redirect("/login");
}
