import { describe, expect, it } from "vitest";
import { clearActionNoticeParams } from "@/lib/action-notice";

describe("action notice URL cleanup", () => {
  it("removes success flags while preserving filters and the anchor", () => {
    expect(
      clearActionNoticeParams(
        "http://localhost:3000/c/doo-white/inventory?updated=1&warehouse=main&q=Seed#stock",
        ["updated", "transferred"],
      ),
    ).toBe("/c/doo-white/inventory?warehouse=main&q=Seed#stock");
  });
  it("clears repeated notice flags without removing error details", () => {
    expect(
      clearActionNoticeParams(
        "http://localhost:3000/c/doo-white/loops?stepRemoved=1&stepRemoved=1&error=removeStep",
        ["created", "checkpoint", "stepRemoved", "deleted"],
      ),
    ).toBe("/c/doo-white/loops?error=removeStep");
  });
});
