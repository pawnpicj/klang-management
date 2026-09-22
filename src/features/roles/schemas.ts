import { z } from "zod";
import { clanSlugSchema } from "@/features/clans/schemas";

const roleNameSchema = z
  .string()
  .trim()
  .min(1, "กรุณากรอกชื่อ Role")
  .max(80, "ชื่อ Role ต้องไม่เกิน 80 ตัวอักษร");

export const createCustomRoleSchema = z.object({
  clanSlug: clanSlugSchema,
  name: roleNameSchema,
  permissionCodes: z.array(z.string().min(1).max(100)).max(50),
});

export const updateCustomRoleSchema = createCustomRoleSchema.extend({
  roleId: z.uuid("Role ไม่ถูกต้อง"),
});

export const customRoleReferenceSchema = z.object({
  clanSlug: clanSlugSchema,
  roleId: z.uuid("Role ไม่ถูกต้อง"),
});
