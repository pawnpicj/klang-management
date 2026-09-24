import { describe, expect, it } from "vitest";
import {
  loginSchema,
  profileSchema,
  registerSchema,
} from "@/features/auth/schemas";
import { safeNextPath } from "@/lib/auth/redirect";
import {
  getAvatarValidationError,
  hasValidAvatarSignature,
} from "@/features/auth/avatar";
import {
  addClanMemberSchema,
  clanMemberReferenceSchema,
  createClanSchema,
  updateClanMemberSchema,
  updateClanSchema,
} from "@/features/clans/schemas";

describe("authentication validation", () => {
  it("accepts the documented username format case-insensitively", () => {
    expect(
      loginSchema.safeParse({ username: "Player_01", password: "secret" })
        .success,
    ).toBe(true);
    expect(
      loginSchema.safeParse({ username: "ชื่อไทย", password: "secret" })
        .success,
    ).toBe(false);
  });

  it("requires strong matching registration passwords", () => {
    expect(
      registerSchema.safeParse({
        username: "player_01",
        displayName: "Player",
        email: "PLAYER@example.com",
        password: "password123",
        confirmPassword: "password123",
      }).success,
    ).toBe(true);
    expect(
      registerSchema.safeParse({
        username: "player_01",
        displayName: "Player",
        email: "player@example.com",
        password: "password123",
        confirmPassword: "different",
      }).success,
    ).toBe(false);
  });

  it("accepts only supported profile image files up to 5 MB", () => {
    expect(profileSchema.safeParse({ displayName: "Player" }).success).toBe(
      true,
    );
    expect(
      getAvatarValidationError({ type: "image/png", size: 1024 }),
    ).toBeNull();
    expect(
      getAvatarValidationError({ type: "image/svg+xml", size: 1024 }),
    ).toMatch(/JPEG/);
    expect(
      getAvatarValidationError({
        type: "image/jpeg",
        size: 5 * 1024 * 1024 + 1,
      }),
    ).toMatch(/5 MB/);
  });

  it("rejects a file whose content does not match its image MIME type", async () => {
    const png = new Blob(
      [new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])],
      { type: "image/png" },
    );
    const disguisedText = new Blob(["not an image"], { type: "image/png" });

    await expect(hasValidAvatarSignature(png)).resolves.toBe(true);
    await expect(hasValidAvatarSignature(disguisedText)).resolves.toBe(false);
  });
});

describe("safe post-auth redirects", () => {
  it("keeps local paths and rejects protocol-relative or backslash paths", () => {
    expect(safeNextPath("/profile?tab=settings")).toBe("/profile?tab=settings");
    expect(safeNextPath(null)).toBe("/clans");
    expect(safeNextPath("//evil.example")).toBe("/clans");
    expect(safeNextPath("/\\evil.example")).toBe("/clans");
    expect(safeNextPath("https://evil.example")).toBe("/clans");
  });
});

describe("clan validation", () => {
  it("accepts a valid Clan and normalizes surrounding whitespace", () => {
    const result = createClanSchema.safeParse({
      name: " Black Dragon ",
      slug: "black-dragon",
      type: "CLAN",
      characterName: " Leader One ",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe("Black Dragon");
      expect(result.data.characterName).toBe("Leader One");
    }
  });

  it("rejects unsafe slugs and unsupported types", () => {
    expect(
      createClanSchema.safeParse({
        name: "Black Dragon",
        slug: "Black Dragon",
        type: "GROUP",
        characterName: "Leader",
      }).success,
    ).toBe(false);
  });

  it("validates a roster member without requiring an account identifier", () => {
    const result = addClanMemberSchema.safeParse({
      clanSlug: "black-dragon",
      characterName: " Offline Player ",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.characterName).toBe("Offline Player");
      expect(Object.keys(result.data)).toEqual(["clanSlug", "characterName"]);
    }
  });

  it("validates Clan and member management mutations", () => {
    expect(
      updateClanSchema.safeParse({
        clanSlug: "black-dragon",
        name: "Black Dragon 2",
        type: "GANG",
      }).success,
    ).toBe(true);
    const memberId = "3f6f4a64-b262-4c08-8b93-5ee32fbf1465";
    expect(
      updateClanMemberSchema.safeParse({
        clanSlug: "black-dragon",
        memberId,
        characterName: "Renamed",
      }).success,
    ).toBe(true);
    expect(
      clanMemberReferenceSchema.safeParse({
        clanSlug: "black-dragon",
        memberId: "not-a-uuid",
      }).success,
    ).toBe(false);
  });
});
