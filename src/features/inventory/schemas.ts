import { z } from "zod";
import { clanSlugSchema } from "@/features/clans/schemas";

const uuid = z.uuid("ข้อมูลอ้างอิงไม่ถูกต้อง");
const requiredQuantitySchema = z
  .string()
  .trim()
  .min(1, "กรุณากรอกจำนวนที่ต้องส่ง")
  .refine((value) => Number.isFinite(Number(value)), "จำนวนไม่ถูกต้อง")
  .transform(Number)
  .refine((value) => value >= 0, "จำนวนต้องไม่ติดลบ");

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
  requiredQuantity: requiredQuantitySchema,
});

export const updateAssetSchema = z.object({
  clanSlug: clanSlugSchema,
  assetId: uuid,
  name: z.string().trim().min(1, "กรุณากรอกชื่อ Asset").max(100),
  requiredQuantity: requiredQuantitySchema,
});
export const assetReferenceSchema = z.object({
  clanSlug: clanSlugSchema,
  assetId: uuid,
});
