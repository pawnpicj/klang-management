import { z } from "zod";
import { clanSlugSchema } from "@/features/clans/schemas";

export const recipeItemSchema = z
  .object({
    source: z.enum(["ASSET", "CUSTOM"]),
    assetId: z.uuid().nullable(),
    name: z.string().trim().max(100),
    unit: z.string().trim().max(30),
    quantity: z
      .number()
      .finite()
      .positive("จำนวนต้องมากกว่า 0")
      .max(1e12)
      .refine(
        (n) => Math.abs(n * 10000 - Math.round(n * 10000)) < 0.001,
        "จำนวนใส่ทศนิยมได้ไม่เกิน 4 ตำแหน่ง",
      ),
    imagePath: z.string().max(300).nullable(),
  })
  .superRefine((item, ctx) => {
    if (item.source === "ASSET" && (!item.assetId || item.imagePath))
      ctx.addIssue({
        code: "custom",
        message: "กรุณาเลือก Asset",
        path: ["assetId"],
      });
    if (item.source === "CUSTOM" && (!item.name || !item.unit || item.assetId))
      ctx.addIssue({
        code: "custom",
        message: "กรุณาระบุชื่อและหน่วยของรายการที่กำหนดเอง",
      });
  });
export const saveRecipeSchema = z.object({
  clanSlug: clanSlugSchema,
  recipeId: z.uuid().nullable(),
  name: z.string().trim().min(1, "กรุณาระบุชื่อสูตร").max(100),
  output: recipeItemSchema,
  materials: z
    .array(recipeItemSchema)
    .min(1, "เพิ่มส่วนประกอบอย่างน้อย 1 รายการ")
    .max(50),
});
export type RecipeItem = z.infer<typeof recipeItemSchema> & {
  imageUrl?: string | null;
};
export type CraftRecipe = {
  id: string;
  name: string;
  output: RecipeItem;
  materials: RecipeItem[];
};
export type CraftAsset = {
  id: string;
  name: string;
  unit: string;
  isActive: boolean;
  imageUrl: string | null;
};
export type RecipeActionState =
  | { status: "idle" | "error"; message?: string }
  | { status: "success"; recipe: CraftRecipe };
export const initialRecipeState: RecipeActionState = { status: "idle" };

export const craftSettingsSchema = z.object({
  clanSlug: clanSlugSchema,
  warehouseId: z.uuid("กรุณาเลือกคลัง"),
});
