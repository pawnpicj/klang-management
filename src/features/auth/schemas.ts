import { z } from "zod";

export const usernameSchema = z
  .string()
  .trim()
  .min(3, "ชื่อผู้ใช้ต้องมีอย่างน้อย 3 ตัวอักษร")
  .max(32, "ชื่อผู้ใช้ต้องไม่เกิน 32 ตัวอักษร")
  .regex(/^[A-Za-z0-9_]+$/, "ใช้ได้เฉพาะตัวอักษรอังกฤษ ตัวเลข และขีดล่าง");

const passwordSchema = z
  .string()
  .min(8, "รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร")
  .max(128, "รหัสผ่านยาวเกินไป");

export const loginSchema = z.object({
  username: usernameSchema,
  password: z.string().min(1, "กรุณากรอกรหัสผ่าน"),
  next: z.string().optional(),
});

export const registerSchema = z
  .object({
    username: usernameSchema,
    displayName: z
      .string()
      .trim()
      .min(1, "กรุณากรอกชื่อที่แสดง")
      .max(100, "ชื่อที่แสดงต้องไม่เกิน 100 ตัวอักษร"),
    email: z
      .email("รูปแบบอีเมลไม่ถูกต้อง")
      .transform((value) => value.toLowerCase()),
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((values) => values.password === values.confirmPassword, {
    path: ["confirmPassword"],
    message: "รหัสผ่านไม่ตรงกัน",
  });

export const forgotPasswordSchema = z.object({
  email: z
    .email("รูปแบบอีเมลไม่ถูกต้อง")
    .transform((value) => value.toLowerCase()),
});

export const resetPasswordSchema = z
  .object({ password: passwordSchema, confirmPassword: z.string() })
  .refine((values) => values.password === values.confirmPassword, {
    path: ["confirmPassword"],
    message: "รหัสผ่านไม่ตรงกัน",
  });

export const profileSchema = z.object({
  displayName: z
    .string()
    .trim()
    .min(1, "กรุณากรอกชื่อที่แสดง")
    .max(100, "ชื่อที่แสดงต้องไม่เกิน 100 ตัวอักษร"),
});
