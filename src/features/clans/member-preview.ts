import { z } from "zod";
export const memberPreviewColumns = [
  { key: "MEMBER", label: "สมาชิก" },
  { key: "SOCIAL", label: "Social Media" },
  { key: "EQUIPMENT", label: "อาวุธ / ยา / ระเบิด / อื่นๆ" },
  { key: "DELIVERIES", label: "ยอดค้างส่ง" },
] as const;
export const memberPreviewColumnsSchema = z
  .array(z.enum(["MEMBER", "SOCIAL", "EQUIPMENT", "DELIVERIES"]))
  .min(1, "เลือกอย่างน้อย 1 คอลัมน์")
  .max(4)
  .refine(
    (values) => new Set(values).size === values.length,
    "คอลัมน์ต้องไม่ซ้ำ",
  );
export function memberPreviewPath(slug: string) {
  return `/${encodeURIComponent(slug)}/preview-members`;
}

export const publicDeliverySummarySchema = z.object({
  complete: z.boolean(),
  items: z.array(
    z.object({
      name: z.string(),
      unit: z.string(),
      quantity: z.number().positive(),
    }),
  ),
});
