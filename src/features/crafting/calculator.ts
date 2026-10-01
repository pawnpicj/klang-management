import type { RecipeItem } from "./schemas";

export function calculateMaterials(materials: RecipeItem[], rounds: number) {
  const count = Math.min(99999, Math.max(1, Math.floor(rounds) || 1));
  const rows = new Map<string, RecipeItem>();
  materials.forEach((item, index) => {
    const key =
      item.source === "ASSET" ? `asset:${item.assetId}` : `custom:${index}`;
    const existing = rows.get(key);
    const quantity = (existing?.quantity ?? 0) + item.quantity * count;
    rows.set(key, { ...item, quantity: Math.round(quantity * 10000) / 10000 });
  });
  return [...rows.values()];
}
