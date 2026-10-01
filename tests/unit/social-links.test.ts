import { describe, expect, it } from "vitest";
import {
  isSocialLink,
  socialPlatforms,
} from "../../src/features/clans/social-links";
describe("social links", () => {
  it("accepts supported app links and optional empty fields", () => {
    expect(
      isSocialLink("https://discord.gg/test", socialPlatforms[0].hosts),
    ).toBe(true);
    expect(
      isSocialLink("https://line.me/ti/g/test", socialPlatforms[1].hosts),
    ).toBe(true);
    expect(isSocialLink("https://t.me/+invite", socialPlatforms[2].hosts)).toBe(
      true,
    );
    expect(isSocialLink("", socialPlatforms[0].hosts)).toBe(true);
  });
  it("rejects executable URLs, lookalike domains and credentials", () => {
    for (const value of [
      "javascript:alert(1)",
      "https://discord.gg.evil.test/test",
      "https://evil.test/",
      "https://user@discord.gg/test",
      "http://discord.gg/test",
      "https://discord.gg:444/test",
      "https://discord.gg/",
      "https://discord.gg/test name",
    ]) {
      expect(isSocialLink(value, socialPlatforms[0].hosts)).toBe(false);
    }
  });
});

describe("Facebook and TikTok links", () => {
  it("accepts profile and short shared URLs", () => {
    for (const url of [
      "https://www.facebook.com/profile.php?id=123",
      "https://m.facebook.com/group",
      "https://fb.me/test",
    ])
      expect(isSocialLink(url, socialPlatforms[3].hosts)).toBe(true);
    for (const url of [
      "https://www.tiktok.com/@clan",
      "https://vt.tiktok.com/test/",
      "https://vm.tiktok.com/test/",
    ])
      expect(isSocialLink(url, socialPlatforms[4].hosts)).toBe(true);
  });
  it("rejects spoofed domains and links for the wrong platform", () => {
    expect(
      isSocialLink(
        "https://facebook.com.evil.test/group",
        socialPlatforms[3].hosts,
      ),
    ).toBe(false);
    expect(
      isSocialLink("https://www.facebook.com/test", socialPlatforms[4].hosts),
    ).toBe(false);
    expect(isSocialLink("javascript:alert(1)", socialPlatforms[4].hosts)).toBe(
      false,
    );
  });
});
