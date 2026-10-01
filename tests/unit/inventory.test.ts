import { describe, expect, it } from "vitest";
import {
  adjustInventorySchema,
  transferInventorySchema,
} from "@/features/inventory/schemas";

const valid = {
  clanSlug: "doo-white",
  warehouseId: "11111111-1111-4111-8111-111111111111",
  assetId: "22222222-2222-4222-8222-222222222222",
  mode: "ADD",
  quantity: "10",
  transactionDate: "2026-09-29",
  note: "",
  clientRequestId: "33333333-3333-4333-8333-333333333333",
};

describe("inventory adjustment validation", () => {
  it("accepts positive add/remove quantities", () => {
    expect(adjustInventorySchema.safeParse(valid).success).toBe(true);
    expect(
      adjustInventorySchema.safeParse({
        ...valid,
        mode: "REMOVE",
        quantity: "1",
      }).success,
    ).toBe(true);
  });

  it("allows zero only when setting an actual balance", () => {
    expect(
      adjustInventorySchema.safeParse({ ...valid, quantity: "0" }).success,
    ).toBe(false);
    expect(
      adjustInventorySchema.safeParse({
        ...valid,
        mode: "SET",
        quantity: "0",
        note: "ตรวจนับของจริง",
      }).success,
    ).toBe(true);
  });

  it("requires a note when setting the actual balance", () => {
    const result = adjustInventorySchema.safeParse({
      ...valid,
      mode: "SET",
      quantity: "5",
      note: "",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.path).toEqual(["note"]);
    }
  });
});

describe("inventory transfer validation", () => {
  const transfer = {
    clanSlug: "doo-white",
    fromWarehouseId: "11111111-1111-4111-8111-111111111111",
    toWarehouseId: "44444444-4444-4444-8444-444444444444",
    assetId: "22222222-2222-4222-8222-222222222222",
    quantity: "5",
    transactionDate: "2026-09-29",
    note: "Move stock",
    clientRequestId: "33333333-3333-4333-8333-333333333333",
  };

  it("accepts a positive transfer between different warehouses", () => {
    expect(transferInventorySchema.safeParse(transfer).success).toBe(true);
  });

  it("rejects the same source and destination warehouse", () => {
    const result = transferInventorySchema.safeParse({
      ...transfer,
      toWarehouseId: transfer.fromWarehouseId,
    });
    expect(result.success).toBe(false);
  });

  it("rejects a zero transfer quantity", () => {
    expect(
      transferInventorySchema.safeParse({ ...transfer, quantity: "0" }).success,
    ).toBe(false);
  });
});
