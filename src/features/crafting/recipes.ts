import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Json } from "@/types/database";
import { getAssetImageUrls } from "@/lib/supabase/asset-images";
import { recipeItemSchema, type CraftRecipe } from "./schemas";
import { z } from "zod";

export async function resolveRecipes(
  supabase: SupabaseClient<Database>,
  rows: Array<{ id: string; name: string; output: Json; materials: Json }>,
): Promise<CraftRecipe[]> {
  const parsed = rows.map((row) => ({
    id: row.id,
    name: row.name,
    output: recipeItemSchema.parse(row.output),
    materials: z.array(recipeItemSchema).parse(row.materials),
  }));
  const images = parsed
    .flatMap((recipe) => [recipe.output, ...recipe.materials])
    .filter((item) => item.source === "CUSTOM" && item.imagePath)
    .map((item) => ({ id: item.imagePath!, image_url: item.imagePath! }));
  const urls = await getAssetImageUrls(supabase, images, "craft-images");
  return parsed.map((recipe) => ({
    ...recipe,
    output: {
      ...recipe.output,
      imageUrl: recipe.output.imagePath
        ? urls.get(recipe.output.imagePath)
        : null,
    },
    materials: recipe.materials.map((item) => ({
      ...item,
      imageUrl: item.imagePath ? urls.get(item.imagePath) : null,
    })),
  }));
}
