import { z } from "zod";
import { clanSlugSchema } from "@/features/clans/schemas";

const uuid = z.uuid("ข้อมูลอ้างอิงไม่ถูกต้อง");
const optionalUrl = z
  .string()
  .trim()
  .max(2048, "URL ยาวเกินไป")
  .refine((value) => !value || URL.canParse(value), "URL รูปภาพไม่ถูกต้อง");

export const createWarehouseSchema = z.object({
  clanSlug: clanSlugSchema,
  name: z.string().trim().min(1, "กรุณากรอกชื่อ Warehouse").max(100),
  description: z.string().trim().max(500, "คำอธิบายต้องไม่เกิน 500 ตัวอักษร"),
});

export const updateWarehouseSchema = createWarehouseSchema.extend({
  warehouseId: uuid,
});
export const warehouseReferenceSchema = z.object({
  clanSlug: clanSlugSchema,
  warehouseId: uuid,
});

export const createAssetSchema = z.object({
  clanSlug: clanSlugSchema,
  code: z.string().trim().min(1, "กรุณากรอก Code").max(50),
  name: z.string().trim().min(1, "กรุณากรอกชื่อ Asset").max(100),
  assetType: z.enum(["CURRENCY", "ITEM"], "กรุณาเลือกประเภท"),
  unit: z.string().trim().min(1, "กรุณากรอกหน่วย").max(30),
  decimalPlaces: z.coerce.number().int().min(0).max(4),
  allowNegative: z.preprocess(
    (value) => value === "on" || value === true,
    z.boolean(),
  ),
  imageUrl: optionalUrl,
});

export const updateAssetSchema = z.object({
  clanSlug: clanSlugSchema,
  assetId: uuid,
  name: z.string().trim().min(1, "กรุณากรอกชื่อ Asset").max(100),
  imageUrl: optionalUrl,
});
export const assetReferenceSchema = z.object({
  clanSlug: clanSlugSchema,
  assetId: uuid,
});
