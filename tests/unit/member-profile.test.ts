import { describe, expect, it } from "vitest";
import {
  memberEquipmentSchema,
  readMemberEquipment,
  readMemberSocialLinks,
} from "../../src/features/clans/member-profile";
describe("member equipment and social profiles", () => {
  it("accepts custom names, Assets names and independent quantities", () => {
    expect(
      memberEquipmentSchema.parse([
        { category: "WEAPON", name: "  Custom gun  ", quantity: 2 },
        { category: "MEDICINE", name: "Bandage", quantity: 10 },
        { category: "GRENADE", name: "Grenade", quantity: 1 },
        { category: "OTHER", name: "Radio", quantity: 2 },
      ])[0].name,
    ).toBe("Custom gun");
  });
  it("rejects invalid quantities, categories and empty names", () => {
    for (const patch of [
      { quantity: 0 },
      { quantity: 1.5 },
      { quantity: 1000001 },
      { name: " " },
      { category: "INVALID" },
    ]) {
      expect(
        memberEquipmentSchema.safeParse([
          { category: "WEAPON", name: "Gun", quantity: 1, ...patch },
        ]).success,
      ).toBe(false);
    }
    expect(
      memberEquipmentSchema.safeParse(
        Array(101).fill({ category: "WEAPON", name: "Gun", quantity: 1 }),
      ).success,
    ).toBe(false);
  });
  it("reads empty profiles and rejects unsafe social URLs", () => {
    expect(readMemberEquipment(null)).toEqual([]);
    expect(
      readMemberSocialLinks({ discordUrl: "javascript:alert(1)" }),
    ).toEqual({});
    expect(
      readMemberSocialLinks({ facebookUrl: "https://www.facebook.com/member" })
        .facebookUrl,
    ).toBe("https://www.facebook.com/member");
  });
  it("validates YouTube and Kick links for member profiles", () => {
    for (const youtubeUrl of [
      "https://www.youtube.com/@member",
      "https://youtu.be/video",
    ]) {
      expect(
        readMemberSocialLinks({
          youtubeUrl,
          kickUrl: "https://kick.com/member",
        }),
      ).toMatchObject({ youtubeUrl, kickUrl: "https://kick.com/member" });
    }
    for (const links of [
      { youtubeUrl: "https://youtube.com.evil.test/member" },
      { kickUrl: "javascript:alert(1)" },
      { kickUrl: "https://evil.test/member" },
    ]) {
      expect(readMemberSocialLinks(links)).toEqual({});
    }
  });
  it("accepts Instagram profile URLs and rejects unrelated hosts", () => {
    for (const instagramUrl of [
      "https://instagram.com/member",
      "https://www.instagram.com/member/",
      "https://m.instagram.com/member",
    ]) {
      expect(readMemberSocialLinks({ instagramUrl }).instagramUrl).toBe(
        instagramUrl,
      );
    }
    for (const instagramUrl of [
      "https://instagram.com.evil.test/member",
      "javascript:alert(1)",
      "https://evil.test/member",
    ]) {
      expect(readMemberSocialLinks({ instagramUrl })).toEqual({});
    }
  });
});
