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
  const error = state.fieldErrors?.[name]?.[0];
  const errorId = `${name}-error`;
  return (
    <label className="block text-sm font-medium">
      {label}
      <input
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
  if (!state.message) return null;
  return (
    <p
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
  const { pending } = useFormStatus();
  return (
    <Button className="w-full" type="submit" disabled={pending}>
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
  const [state, action] = useActionState(
    loginWithUsernameAction,
    initialAuthState,
  );
  return (
    <form action={action} className="space-y-5">
      <input type="hidden" name="next" value={next} />
      {passwordWasReset && (
        <p className="rounded-md bg-emerald-50 p-3 text-sm text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200">
          ตั้งรหัสผ่านใหม่แล้ว กรุณาเข้าสู่ระบบ
        </p>
      )}
      {callbackFailed && (
        <p
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
          className="text-primary underline-offset-4 hover:underline"
          href="/register"
        >
          สมัครสมาชิก
        </Link>
        <Link
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
  const [state, action] = useActionState(registerAction, initialAuthState);
  return (
    <form action={action} className="space-y-5">
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
      <p className="text-muted-foreground text-center text-sm">
        มีบัญชีแล้ว?{" "}
        <Link
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
  const [state, action] = useActionState(
    forgotPasswordAction,
    initialAuthState,
  );
  return (
    <form action={action} className="space-y-5">
      <Field
        label="อีเมล"
        name="email"
        type="email"
        autoComplete="email"
        state={state}
      />
      <Message state={state} />
      <SubmitButton>ส่งลิงก์ตั้งรหัสผ่านใหม่</SubmitButton>
      <p className="text-center text-sm">
        <Link
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
  const [state, action] = useActionState(resetPasswordAction, initialAuthState);
  return (
    <form action={action} className="space-y-5">
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
    <form action={action} className="space-y-5">
      <Field
        label="ชื่อที่แสดง"
        name="displayName"
        autoComplete="name"
        defaultValue={displayName}
        state={state}
      />
      <div className="space-y-3">
        <label className="block text-sm font-medium">
          รูปโปรไฟล์
          <input
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
