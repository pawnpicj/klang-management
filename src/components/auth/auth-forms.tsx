"use client";

import Image from "next/image";
import Link from "next/link";
import { useActionState, useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import {
  forgotPasswordAction,
  loginWithUsernameAction,
  registerAction,
  resetPasswordAction,
  updateProfileAction,
} from "@/features/auth/actions";
import { initialAuthState, type AuthActionState } from "@/features/auth/state";
import { Button } from "@/components/ui/button";
import {
  avatarMaxBytes,
  avatarMimeTypes,
  getAvatarValidationError,
} from "@/features/auth/avatar";
import { htmlId } from "@/lib/html-id";
import { useId as useHtmlId } from "react";

const inputClass =
  "border-input bg-background focus-visible:ring-ring mt-1 h-11 w-full rounded-md border px-3 text-base outline-none focus-visible:ring-2";

function Field({
  label,
  name,
  type = "text",
  autoComplete,
  required = true,
  defaultValue,
  state,
}: {
  label: string;
  name: string;
  type?: string;
  autoComplete?: string;
  required?: boolean;
  defaultValue?: string | null;
  state: AuthActionState;
}) {
  const htmlIdPrefix = useHtmlId();

  const error = state.fieldErrors?.[name]?.[0];
  const errorId = `${name}-error`;
  return (
    <label
      id={htmlId("auth_field_label", htmlIdPrefix)}
      className="block text-sm font-medium"
    >
      {label}
      <input
        id={htmlId("auth_field_input", htmlIdPrefix)}
        className={inputClass}
        name={name}
        type={type}
        autoComplete={autoComplete}
        required={required}
        defaultValue={defaultValue ?? undefined}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? errorId : undefined}
      />
      {error && (
        <span id={errorId} className="mt-1 block text-sm text-red-600">
          {error}
        </span>
      )}
    </label>
  );
}

function Message({ state }: { state: AuthActionState }) {
  const htmlIdPrefix = useHtmlId();

  if (!state.message) return null;
  return (
    <p
      id={htmlId("auth_message_state_message", htmlIdPrefix)}
      className={`rounded-md p-3 text-sm ${
        state.status === "success"
          ? "bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200"
          : "bg-red-50 text-red-800 dark:bg-red-950 dark:text-red-200"
      }`}
      role={state.status === "error" ? "alert" : "status"}
    >
      {state.message}
    </p>
  );
}

function SubmitButton({ children }: { children: React.ReactNode }) {
  const htmlIdPrefix = useHtmlId();

  const { pending } = useFormStatus();
  return (
    <Button
      id={htmlId("auth_submit_button_button", htmlIdPrefix)}
      className="w-full"
      type="submit"
      disabled={pending}
    >
      {pending ? "กำลังดำเนินการ…" : children}
    </Button>
  );
}

export function LoginForm({
  next,
  passwordWasReset = false,
  callbackFailed = false,
}: {
  next: string;
  passwordWasReset?: boolean;
  callbackFailed?: boolean;
}) {
  const htmlIdPrefix = useHtmlId();

  const [state, action] = useActionState(
    loginWithUsernameAction,
    initialAuthState,
  );
  return (
    <form
      id={htmlId("auth_login_form_form", htmlIdPrefix)}
      action={action}
      className="space-y-5"
    >
      <input
        id={htmlId("auth_login_form_next", htmlIdPrefix)}
        type="hidden"
        name="next"
        value={next}
      />
      {passwordWasReset && (
        <p
          id={htmlId("auth_login_form_p", htmlIdPrefix)}
          className="rounded-md bg-emerald-50 p-3 text-sm text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200"
        >
          ตั้งรหัสผ่านใหม่แล้ว กรุณาเข้าสู่ระบบ
        </p>
      )}
      {callbackFailed && (
        <p
          id={htmlId("auth_login_form_p_2", htmlIdPrefix)}
          className="rounded-md bg-red-50 p-3 text-sm text-red-800 dark:bg-red-950 dark:text-red-200"
          role="alert"
        >
          ลิงก์ยืนยันตัวตนไม่ถูกต้องหรือหมดอายุแล้ว
        </p>
      )}
      <Field
        label="ชื่อผู้ใช้"
        name="username"
        autoComplete="username"
        state={state}
      />
      <Field
        label="รหัสผ่าน"
        name="password"
        type="password"
        autoComplete="current-password"
        state={state}
      />
      <Message state={state} />
      <SubmitButton>เข้าสู่ระบบ</SubmitButton>
      <div className="flex justify-between gap-4 text-sm">
        <Link
          id={htmlId("auth_login_form_register", htmlIdPrefix)}
          className="text-primary underline-offset-4 hover:underline"
          href="/register"
        >
          สมัครสมาชิก
        </Link>
        <Link
          id={htmlId("auth_login_form_forgot_password", htmlIdPrefix)}
          className="text-primary underline-offset-4 hover:underline"
          href="/forgot-password"
        >
          ลืมรหัสผ่าน
        </Link>
      </div>
    </form>
  );
}

export function RegisterForm() {
  const htmlIdPrefix = useHtmlId();

  const [state, action] = useActionState(registerAction, initialAuthState);
  return (
    <form
      id={htmlId("auth_register_form_form", htmlIdPrefix)}
      action={action}
      className="space-y-5"
    >
      <Field
        label="ชื่อผู้ใช้"
        name="username"
        autoComplete="username"
        state={state}
      />
      <Field
        label="ชื่อที่แสดง"
        name="displayName"
        autoComplete="name"
        state={state}
      />
      <Field
        label="อีเมล"
        name="email"
        type="email"
        autoComplete="email"
        state={state}
      />
      <Field
        label="รหัสผ่าน"
        name="password"
        type="password"
        autoComplete="new-password"
        state={state}
      />
      <Field
        label="ยืนยันรหัสผ่าน"
        name="confirmPassword"
        type="password"
        autoComplete="new-password"
        state={state}
      />
      <Message state={state} />
      <SubmitButton>สร้างบัญชี</SubmitButton>
      <p
        id={htmlId("auth_register_form_p", htmlIdPrefix)}
        className="text-muted-foreground text-center text-sm"
      >
        มีบัญชีแล้ว?{" "}
        <Link
          id={htmlId("auth_register_form_login", htmlIdPrefix)}
          className="text-primary underline-offset-4 hover:underline"
          href="/login"
        >
          เข้าสู่ระบบ
        </Link>
      </p>
    </form>
  );
}

export function ForgotPasswordForm() {
  const htmlIdPrefix = useHtmlId();

  const [state, action] = useActionState(
    forgotPasswordAction,
    initialAuthState,
  );
  return (
    <form
      id={htmlId("auth_forgot_password_form_form", htmlIdPrefix)}
      action={action}
      className="space-y-5"
    >
      <Field
        label="อีเมล"
        name="email"
        type="email"
        autoComplete="email"
        state={state}
      />
      <Message state={state} />
      <SubmitButton>ส่งลิงก์ตั้งรหัสผ่านใหม่</SubmitButton>
      <p
        id={htmlId("auth_forgot_password_form_p", htmlIdPrefix)}
        className="text-center text-sm"
      >
        <Link
          id={htmlId("auth_forgot_password_form_login", htmlIdPrefix)}
          className="text-primary underline-offset-4 hover:underline"
          href="/login"
        >
          กลับไปเข้าสู่ระบบ
        </Link>
      </p>
    </form>
  );
}

export function ResetPasswordForm() {
  const htmlIdPrefix = useHtmlId();

  const [state, action] = useActionState(resetPasswordAction, initialAuthState);
  return (
    <form
      id={htmlId("auth_reset_password_form_form", htmlIdPrefix)}
      action={action}
      className="space-y-5"
    >
      <Field
        label="รหัสผ่านใหม่"
        name="password"
        type="password"
        autoComplete="new-password"
        state={state}
      />
      <Field
        label="ยืนยันรหัสผ่านใหม่"
        name="confirmPassword"
        type="password"
        autoComplete="new-password"
        state={state}
      />
      <Message state={state} />
      <SubmitButton>บันทึกรหัสผ่านใหม่</SubmitButton>
    </form>
  );
}

export function ProfileForm({
  displayName,
  avatarPreviewUrl,
}: {
  displayName: string;
  avatarPreviewUrl: string | null;
}) {
  const htmlIdPrefix = useHtmlId();

  const [state, action] = useActionState(updateProfileAction, initialAuthState);
  const [previewUrl, setPreviewUrl] = useState(avatarPreviewUrl);
  const [fileError, setFileError] = useState<string | null>(null);
  const objectUrl = useRef<string | null>(null);

  useEffect(
    () => () => {
      if (objectUrl.current) URL.revokeObjectURL(objectUrl.current);
    },
    [],
  );

  function previewAvatar(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0];
    if (!file) return;
    const error = getAvatarValidationError(file);
    if (error) {
      event.currentTarget.value = "";
      setFileError(error);
      return;
    }
    if (objectUrl.current) URL.revokeObjectURL(objectUrl.current);
    objectUrl.current = URL.createObjectURL(file);
    setPreviewUrl(objectUrl.current);
    setFileError(null);
  }

  const avatarError = fileError ?? state.fieldErrors?.avatar?.[0];
  return (
    <form
      id={htmlId("auth_profile_form_form", htmlIdPrefix)}
      action={action}
      className="space-y-5"
    >
      <Field
        label="ชื่อที่แสดง"
        name="displayName"
        autoComplete="name"
        defaultValue={displayName}
        state={state}
      />
      <div className="space-y-3">
        <label
          id={htmlId("auth_profile_form_label", htmlIdPrefix)}
          className="block text-sm font-medium"
        >
          รูปโปรไฟล์
          <input
            id={htmlId("auth_profile_form_avatar", htmlIdPrefix)}
            className={`${inputClass} cursor-pointer py-2 file:mr-3 file:rounded file:border-0 file:bg-emerald-100 file:px-3 file:py-1 file:text-sm file:font-medium file:text-emerald-900`}
            name="avatar"
            type="file"
            accept={avatarMimeTypes.join(",")}
            onChange={previewAvatar}
            aria-invalid={Boolean(avatarError)}
            aria-describedby="avatar-help avatar-error"
          />
        </label>
        <p id="avatar-help" className="text-muted-foreground text-xs">
          JPEG, PNG, WebP หรือ GIF ขนาดไม่เกิน {avatarMaxBytes / 1024 / 1024} MB
        </p>
        {avatarError && (
          <p id="avatar-error" className="text-sm text-red-600" role="alert">
            {avatarError}
          </p>
        )}
        {previewUrl && (
          <div className="border-input relative size-32 overflow-hidden rounded-xl border bg-white">
            <Image
              id={htmlId("auth_profile_form_image", htmlIdPrefix)}
              src={previewUrl}
              alt="ตัวอย่างรูปโปรไฟล์"
              fill
              sizes="128px"
              className="object-cover"
              unoptimized
            />
          </div>
        )}
      </div>
      <Message state={state} />
      <SubmitButton>บันทึกโปรไฟล์</SubmitButton>
    </form>
  );
}
