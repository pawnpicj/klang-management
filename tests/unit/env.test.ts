import { describe, expect, it } from "vitest";
import { publicEnvSchema, serverEnvSchema, siteUrlSchema } from "@/lib/env";
describe("Supabase environment", () => {
  it("rejects missing or malformed config", () => {
    expect(publicEnvSchema.safeParse({}).success).toBe(false);
    expect(
      publicEnvSchema.safeParse({ url: "broken", publishableKey: "" }).success,
    ).toBe(false);
  });
  it("only exposes public config", () => {
    expect(
      publicEnvSchema.parse({
        url: "http://127.0.0.1:54321",
        publishableKey: "public",
        secretKey: "private",
      }),
    ).toEqual({ url: "http://127.0.0.1:54321", publishableKey: "public" });
  });
  it("keeps service credentials server-side and requires a strong rate secret", () => {
    expect(
      serverEnvSchema.safeParse({
        secretKey: "server-only",
        rateLimitSecret: "short",
      }).success,
    ).toBe(false);
    expect(
      serverEnvSchema.safeParse({
        secretKey: "server-only",
        rateLimitSecret: "x".repeat(32),
      }).success,
    ).toBe(true);
  });
  it("validates the application URL", () => {
    expect(siteUrlSchema.safeParse("http://localhost:3000").success).toBe(true);
    expect(siteUrlSchema.safeParse("javascript:alert(1)").success).toBe(false);
  });
});
