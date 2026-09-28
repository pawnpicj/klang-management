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
  it("creates a new obligation for every day instead of carrying delivery forward", () => {
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
    expect(result.missingDates).toEqual(["2026-09-01", "2026-09-02"]);
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
