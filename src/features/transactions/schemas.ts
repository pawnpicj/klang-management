import { z } from "zod";
import { clanSlugSchema } from "@/features/clans/schemas";

const optionalUuid = z.union([
  z.literal(""),
  z.uuid("ข้อมูลอ้างอิงไม่ถูกต้อง"),
]);

export const createTransactionSchema = z.object({
  clanSlug: clanSlugSchema,
  transactionType: z.enum(["DEPOSIT", "WITHDRAW", "TRANSFER"]),
  contributorMemberId: optionalUuid,
  fromWarehouseId: optionalUuid,
  toWarehouseId: optionalUuid,
  note: z.string().trim().max(1000, "หมายเหตุต้องไม่เกิน 1,000 ตัวอักษร"),
  clientRequestId: z.uuid(),
  items: z
    .array(
      z.object({
        assetId: z.uuid("Asset ไม่ถูกต้อง"),
        quantity: z.coerce.number().positive("จำนวนต้องมากกว่า 0").finite(),
        unitValue: z.union([z.literal(""), z.coerce.number().min(0).finite()]),
      }),
    )
    .min(1)
    .max(50),
});

export const transactionReferenceSchema = z.object({
  clanSlug: clanSlugSchema,
  transactionId: z.uuid("Transaction ไม่ถูกต้อง"),
});
