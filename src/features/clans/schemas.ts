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
