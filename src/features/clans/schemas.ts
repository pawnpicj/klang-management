import { z } from "zod";

export const clanSlugSchema = z
  .string()
  .trim()
  .min(3, "Slug ต้องมีอย่างน้อย 3 ตัวอักษร")
  .max(80, "Slug ต้องไม่เกิน 80 ตัวอักษร")
  .regex(
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
    "ใช้ตัวอักษรอังกฤษพิมพ์เล็ก ตัวเลข และขีดกลางระหว่างคำเท่านั้น",
  );

export const createClanSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "กรุณากรอกชื่อ Clan/Gang")
    .max(100, "ชื่อต้องไม่เกิน 100 ตัวอักษร"),
  slug: clanSlugSchema,
  type: z.enum(["CLAN", "GANG"], "กรุณาเลือกประเภท"),
  characterName: z
    .string()
    .trim()
    .min(1, "กรุณากรอกชื่อตัวละคร")
    .max(100, "ชื่อตัวละครต้องไม่เกิน 100 ตัวอักษร"),
});

export const addClanMemberSchema = z.object({
  clanSlug: clanSlugSchema,
  characterName: z
    .string()
    .trim()
    .min(1, "กรุณากรอกชื่อตัวละคร")
    .max(100, "ชื่อตัวละครต้องไม่เกิน 100 ตัวอักษร"),
});

export const updateClanSchema = z.object({
  clanSlug: clanSlugSchema,
  name: z
    .string()
    .trim()
    .min(1, "กรุณากรอกชื่อ Clan/Gang")
    .max(100, "ชื่อต้องไม่เกิน 100 ตัวอักษร"),
  type: z.enum(["CLAN", "GANG"], "กรุณาเลือกประเภท"),
  note: z.string().trim().max(2000, "Note ต้องไม่เกิน 2,000 ตัวอักษร"),
  rules: z.string().trim().max(10000, "Rule ต้องไม่เกิน 10,000 ตัวอักษร"),
});

export const updateClanMemberSchema = z.object({
  clanSlug: clanSlugSchema,
  memberId: z.uuid("ข้อมูลสมาชิกไม่ถูกต้อง"),
  characterName: z
    .string()
    .trim()
    .min(1, "กรุณากรอกชื่อตัวละคร")
    .max(100, "ชื่อตัวละครต้องไม่เกิน 100 ตัวอักษร"),
});

export const clanMemberReferenceSchema = updateClanMemberSchema.pick({
  clanSlug: true,
  memberId: true,
});

export const updateClanMemberDetailsSchema = clanMemberReferenceSchema.extend({
  characterName: updateClanMemberSchema.shape.characterName,
  roleId: z.uuid("Role ไม่ถูกต้อง"),
  deliveryStartedOn: z.iso.date("วันที่เริ่มส่งไม่ถูกต้อง"),
});

export const updateClanMemberRoleSchema = clanMemberReferenceSchema.extend({
  roleId: z.uuid("Role ไม่ถูกต้อง"),
});
