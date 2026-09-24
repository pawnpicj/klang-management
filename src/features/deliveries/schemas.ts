import { z } from "zod";
import { clanSlugSchema } from "@/features/clans/schemas";

const quantitySchema = z
  .string()
  .trim()
  .min(1, "กรุณากรอกจำนวนอย่างน้อย 1 รายการ")
  .refine((value) => Number.isFinite(Number(value)), "จำนวนไม่ถูกต้อง")
  .transform(Number)
  .refine((value) => value > 0, "จำนวนต้องมากกว่า 0");

export const recordDeliverySchema = z.object({
  clanSlug: clanSlugSchema,
  memberId: z.uuid("สมาชิกไม่ถูกต้อง"),
  deliveryDate: z.iso.date("วันที่ไม่ถูกต้อง"),
  items: z
    .array(
      z.object({
        assetId: z.uuid("Asset ไม่ถูกต้อง"),
        quantity: quantitySchema,
      }),
    )
    .min(1, "กรุณากรอกจำนวนอย่างน้อย 1 รายการ")
    .max(100),
});

export const deleteDeliverySchema = z.object({
  clanSlug: clanSlugSchema,
  deliveryId: z.uuid("รายการส่งของไม่ถูกต้อง"),
});

export const updateDeliverySchema = z.object({
  clanSlug: clanSlugSchema,
  deliveryId: z.uuid("รายการส่งของไม่ถูกต้อง"),
  deliveryDate: z.iso.date("วันที่ไม่ถูกต้อง"),
  assetId: z.uuid("Asset ไม่ถูกต้อง"),
  quantity: quantitySchema,
});
