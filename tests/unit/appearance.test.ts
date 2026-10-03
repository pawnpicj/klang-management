import { describe, it, expect } from "vitest";
import { runInNewContext } from "node:vm";
import { appearanceInitScript, readTemplate } from "../../src/lib/appearance";
describe("brand appearance", () => {
  it("only accepts the three supported templates", () => {
    expect(readTemplate("emerald-collective")).toBe("emerald-collective");
    expect(readTemplate("graphite-signal")).toBe("graphite-signal");
    expect(readTemplate("injected-template")).toBe("teal-command");
  });
  it("restores each template independently of light/dark before paint", () => {
    for (const template of [
      "teal-command",
      "emerald-collective",
      "graphite-signal",
    ])
      for (const theme of ["light", "dark"]) {
        const dataset = {};
        runInNewContext(appearanceInitScript, {
          document: { documentElement: { dataset } },
          localStorage: {
            getItem: (key: string) =>
              key === "klang-theme" ? theme : template,
          },
          matchMedia: () => ({ matches: false }),
        });
        expect(dataset).toEqual({ theme, template });
      }
  });
  it("falls back safely when storage is blocked or values are invalid", () => {
    for (const getItem of [
      () => {
        throw Error("blocked");
      },
      () => "invalid",
    ]) {
      const dataset = {};
      runInNewContext(appearanceInitScript, {
        document: { documentElement: { dataset } },
        localStorage: { getItem },
        matchMedia: () => ({ matches: true }),
      });
      expect(dataset).toEqual({ theme: "dark", template: "teal-command" });
    }
  });
});
