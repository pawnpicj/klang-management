import { describe, expect, it } from "vitest";
import { summarizeMemberDeliveries } from "@/features/deliveries/summary";

const asset = {
  id: "asset-1",
  name: "เงิน",
  unit: "Coin",
  required_quantity: 100_000,
  created_at: "2026-09-01T00:00:00Z",
};
const member = { id: "member-1", joined_at: "2026-09-01T00:00:00Z" };

describe("summarizeMemberDeliveries", () => {
  it("allocates partial late deliveries to the oldest outstanding day", () => {
    const result = summarizeMemberDeliveries({
      member,
      assets: [asset],
      deliveries: [
        {
          member_id: member.id,
          asset_id: asset.id,
          delivery_date: "2026-09-01",
          quantity: 50_000,
        },
        {
          member_id: member.id,
          asset_id: asset.id,
          delivery_date: "2026-09-02",
          quantity: 50_000,
        },
      ],
      trackingStartedOn: "2026-09-01",
      throughDate: "2026-09-02",
    });
    expect(result.complete).toBe(false);
    expect(result.missingDates).toEqual(["2026-09-02"]);
    expect(result.missingByAsset[0]?.quantity).toBe(100_000);
  });

  it("marks a member complete when every daily requirement is fulfilled", () => {
    const result = summarizeMemberDeliveries({
      member,
      assets: [asset],
      deliveries: [
        {
          member_id: member.id,
          asset_id: asset.id,
          delivery_date: "2026-09-01",
          quantity: 100_000,
        },
        {
          member_id: member.id,
          asset_id: asset.id,
          delivery_date: "2026-09-02",
          quantity: 100_000,
        },
      ],
      trackingStartedOn: "2026-09-01",
      throughDate: "2026-09-02",
    });
    expect(result).toMatchObject({
      complete: true,
      missingDates: [],
      missingByAsset: [],
    });
  });

  it("ignores zero-target assets when calculating missing deliveries", () => {
    const optionalAsset = {
      ...asset,
      id: "asset-optional",
      required_quantity: 0,
    };
    const result = summarizeMemberDeliveries({
      member,
      assets: [optionalAsset],
      deliveries: [],
      trackingStartedOn: "2026-09-01",
      throughDate: "2026-09-02",
    });
    expect(result).toMatchObject({
      complete: true,
      missingDates: [],
      missingByAsset: [],
    });
  });
  it("uses the configured member Delivery start date", () => {
    const result = summarizeMemberDeliveries({
      member: {
        ...member,
        delivery_started_on: "2026-09-02",
      },
      assets: [asset],
      deliveries: [],
      trackingStartedOn: "2026-09-01",
      throughDate: "2026-09-03",
    });
    expect(result.missingDates).toEqual(["2026-09-02", "2026-09-03"]);
    expect(result.missingByAsset[0]?.quantity).toBe(200_000);
  });

  it("starts obligations on the member join date when no override exists", () => {
    const result = summarizeMemberDeliveries({
      member: { ...member, joined_at: "2026-09-02T12:00:00Z" },
      assets: [asset],
      deliveries: [],
      trackingStartedOn: "2026-09-01",
      throughDate: "2026-09-02",
    });
    expect(result.missingDates).toEqual(["2026-09-02"]);
    expect(result.missingByAsset[0]?.quantity).toBe(100_000);
  });
});

describe("late delivery catch-up", () => {
  const calculate = (
    deliveries: Parameters<typeof summarizeMemberDeliveries>[0]["deliveries"],
    assets = [asset],
    throughDate = "2026-09-03",
  ) =>
    summarizeMemberDeliveries({
      member,
      assets,
      deliveries,
      trackingStartedOn: "2026-09-01",
      throughDate,
    });
  const record = (
    quantity: number,
    date = "2026-09-03",
    assetId = asset.id,
  ) => ({
    member_id: member.id,
    asset_id: assetId,
    delivery_date: date,
    quantity,
  });
  it("clears three missed days with one delivery recorded today", () => {
    expect(calculate([record(300_000)])).toMatchObject({
      complete: true,
      missingDates: [],
      missingByAsset: [],
    });
  });
  it("clears old dates first and leaves the unpaid balance on the latest date", () => {
    const result = calculate([record(250_000)]);
    expect(result.missingDates).toEqual(["2026-09-03"]);
    expect(result.missingByAsset[0].quantity).toBe(50_000);
  });
  it("combines separate payments regardless of record order", () => {
    const result = calculate([
      record(150_000),
      record(50_000, "2026-09-01"),
      record(100_000),
    ]);
    expect(result.complete).toBe(true);
    expect(
      calculate([record(150_000), record(50_000, "2026-09-01")])
        .missingByAsset[0].quantity,
    ).toBe(100_000);
  });
  it("requires each asset separately", () => {
    const second = { ...asset, id: "asset-2", required_quantity: 10 };
    const result = calculate(
      [record(500_000), record(20, "2026-09-03", second.id)],
      [asset, second],
    );
    expect(result.missingDates).toEqual(["2026-09-03"]);
    expect(result.missingByAsset).toMatchObject([
      { id: second.id, quantity: 10 },
    ]);
  });
  it("does not prepay future days with an earlier surplus", () => {
    const result = calculate([record(500_000, "2026-09-01")]);
    expect(result.missingDates).toEqual(["2026-09-02", "2026-09-03"]);
    expect(result.missingByAsset[0].quantity).toBe(200_000);
  });
  it("ignores future deliveries and other members", () => {
    const result = calculate([
      record(300_000, "2026-09-04"),
      { ...record(300_000), member_id: "another-member" },
    ]);
    expect(result.missingByAsset[0].quantity).toBe(300_000);
  });
  it("does not apply deliveries before the member tracking start", () => {
    const result = summarizeMemberDeliveries({
      member: { ...member, delivery_started_on: "2026-09-02" },
      assets: [asset],
      deliveries: [record(500_000, "2026-09-01"), record(100_000)],
      trackingStartedOn: "2026-09-01",
      throughDate: "2026-09-03",
    });
    expect(result.missingDates).toEqual(["2026-09-03"]);
    expect(result.missingByAsset[0].quantity).toBe(100_000);
  });
  it("starts asset obligations on its creation day", () => {
    const result = calculate(
      [record(500_000, "2026-09-01"), record(100_000)],
      [{ ...asset, created_at: "2026-09-02T00:00:00Z" }],
    );
    expect(result.missingDates).toEqual(["2026-09-03"]);
    expect(result.missingByAsset[0].quantity).toBe(100_000);
  });
  it("avoids tiny decimal deficits when catch-up completes", () => {
    const result = calculate(
      [record(0.1, "2026-09-01"), record(0.8)],
      [{ ...asset, required_quantity: 0.3 }],
    );
    expect(result).toMatchObject({
      complete: true,
      missingDates: [],
      missingByAsset: [],
    });
  });
});
