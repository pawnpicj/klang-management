import { z } from "zod";
import { clanSlugSchema } from "@/features/clans/schemas";

const uuid = z.uuid("ข้อมูลอ้างอิงไม่ถูกต้อง");
const nonNegativeQuantity = (message: string) =>
  z
    .string()
    .trim()
    .min(1, message)
    .refine((value) => Number.isFinite(Number(value)), "จำนวนไม่ถูกต้อง")
    .transform(Number)
    .refine((value) => value >= 0, "จำนวนต้องไม่ติดลบ");

const requiredQuantitySchema = nonNegativeQuantity("กรุณากรอกจำนวนที่ต้องส่ง");
const lowStockThresholdSchema = nonNegativeQuantity(
  "กรุณากรอกจำนวนแจ้งเตือนใกล้หมด",
);

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
  lowStockThreshold: lowStockThresholdSchema,
});

export const updateAssetSchema = z.object({
  clanSlug: clanSlugSchema,
  assetId: uuid,
  name: z.string().trim().min(1, "กรุณากรอกชื่อ Asset").max(100),
  requiredQuantity: requiredQuantitySchema,
  lowStockThreshold: lowStockThresholdSchema,
});
export const assetReferenceSchema = z.object({
  clanSlug: clanSlugSchema,
  assetId: uuid,
});

export const adjustInventorySchema = z
  .object({
    clanSlug: clanSlugSchema,
    warehouseId: uuid,
    assetId: uuid,
    mode: z.enum(["ADD", "REMOVE", "SET"]),
    quantity: z.coerce.number().finite("จำนวนไม่ถูกต้อง").min(0),
    transactionDate: z.iso.date("วันที่ไม่ถูกต้อง"),
    note: z.string().trim().max(1000, "หมายเหตุต้องไม่เกิน 1,000 ตัวอักษร"),
    clientRequestId: uuid,
  })
  .superRefine((value, context) => {
    if (value.mode !== "SET" && value.quantity <= 0) {
      context.addIssue({
        code: "custom",
        path: ["quantity"],
        message: "จำนวนต้องมากกว่า 0",
      });
    }
    if (value.mode === "SET" && !value.note) {
      context.addIssue({
        code: "custom",
        path: ["note"],
        message: "กรุณาระบุเหตุผลเมื่อแก้ไขยอดจริง",
      });
    }
  });

export const transferInventorySchema = z
  .object({
    clanSlug: clanSlugSchema,
    fromWarehouseId: uuid,
    toWarehouseId: uuid,
    assetId: uuid,
    quantity: z.coerce.number().positive("จำนวนต้องมากกว่า 0").finite(),
    transactionDate: z.iso.date("วันที่ไม่ถูกต้อง"),
    note: z.string().trim().max(1000, "หมายเหตุต้องไม่เกิน 1,000 ตัวอักษร"),
    clientRequestId: uuid,
  })
  .refine((value) => value.fromWarehouseId !== value.toWarehouseId, {
    path: ["toWarehouseId"],
    message: "คลังต้นทางและปลายทางต้องไม่ซ้ำกัน",
  });
