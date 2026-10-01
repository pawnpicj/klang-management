import { describe, expect, it } from "vitest";
import {
  recipeItemSchema,
  saveRecipeSchema,
  type RecipeItem,
} from "@/features/crafting/schemas";
import { calculateMaterials } from "@/features/crafting/calculator";
const custom: RecipeItem = {
  source: "CUSTOM",
  assetId: null,
  name: "Weapon A",
  unit: "ชิ้น",
  quantity: 1,
  imagePath: null,
};
const asset: RecipeItem = {
  source: "ASSET",
  assetId: "11111111-1111-4111-8111-111111111111",
  name: "",
  unit: "",
  quantity: 20,
  imagePath: null,
};
describe("craft recipe validation and calculations", () => {
  it("accepts mixed Asset and custom components", () => {
    expect(
      saveRecipeSchema.safeParse({
        clanSlug: "doo-white",
        recipeId: null,
        name: "Weapon A",
        output: custom,
        materials: [asset, { ...custom, name: "Leather", quantity: 5 }],
      }).success,
    ).toBe(true);
  });
  it("requires at least one material and a custom name and unit", () => {
    expect(
      saveRecipeSchema.safeParse({
        clanSlug: "doo-white",
        recipeId: null,
        name: "Weapon A",
        output: custom,
        materials: [],
      }).success,
    ).toBe(false);
    expect(recipeItemSchema.safeParse({ ...custom, name: "" }).success).toBe(
      false,
    );
    expect(recipeItemSchema.safeParse({ ...custom, unit: "" }).success).toBe(
      false,
    );
    expect(
      recipeItemSchema.safeParse({ ...asset, assetId: null }).success,
    ).toBe(false);
  });
  it("rejects nonpositive, nonfinite, and excessive decimal quantities", () => {
    for (const quantity of [0, -1, NaN, Infinity, 0.00001])
      expect(recipeItemSchema.safeParse({ ...custom, quantity }).success).toBe(
        false,
      );
    expect(
      recipeItemSchema.safeParse({ ...custom, quantity: 0.0001 }).success,
    ).toBe(true);
  });
  it("scales by rounds and combines repeated Asset requirements", () => {
    const rows = calculateMaterials(
      [
        asset,
        { ...asset, quantity: 5 },
        { ...custom, name: "Leather", quantity: 0.1 },
      ],
      3,
    );
    expect(rows).toHaveLength(2);
    expect(rows[0].quantity).toBe(75);
    expect(rows[1].quantity).toBe(0.3);
    expect(asset.quantity).toBe(20);
  });
  it("retains separate custom materials and clamps invalid round counts", () => {
    expect(calculateMaterials([custom, custom], 0)).toHaveLength(2);
    expect(calculateMaterials([custom], -5)[0].quantity).toBe(1);
    expect(calculateMaterials([custom], Infinity)[0].quantity).toBe(99999);
  });
});
