import { z } from "zod";
import { socialLinkSchema, socialPlatforms } from "./social-links";
export const memberSocialPlatforms = [
  ...socialPlatforms,
  {
    key: "youtubeUrl",
    label: "YouTube",
    hosts: ["youtube.com", "www.youtube.com", "m.youtube.com", "youtu.be"],
    placeholder: "https://www.youtube.com/@…",
  },
  {
    key: "kickUrl",
    label: "Kick",
    hosts: ["kick.com", "www.kick.com"],
    placeholder: "https://kick.com/…",
  },
  {
    key: "instagramUrl",
    label: "Instagram",
    hosts: ["instagram.com", "www.instagram.com", "m.instagram.com"],
    placeholder: "https://www.instagram.com/…",
  },
] as const;
export type MemberSocialPlatformKey =
  (typeof memberSocialPlatforms)[number]["key"];
export const equipmentCategories = [
  { value: "WEAPON", label: "อาวุธ" },
  { value: "MEDICINE", label: "ยา" },
  { value: "GRENADE", label: "ระเบิด" },
  { value: "OTHER", label: "อื่นๆ" },
] as const;
export const memberEquipmentSchema = z
  .array(
    z.object({
      category: z.enum(["WEAPON", "MEDICINE", "GRENADE", "OTHER"]),
      name: z.string().trim().min(1, "กรุณาใส่ชื่อสินค้า").max(100),
      quantity: z.number().int().min(1).max(1000000),
    }),
  )
  .max(100, "เพิ่มได้ไม่เกิน 100 รายการ");
export type MemberEquipment = z.infer<typeof memberEquipmentSchema>;
export type MemberSocialLinks = Partial<
  Record<MemberSocialPlatformKey, string>
>;
export const memberProfileFields = {
  discordUrl: socialLinkSchema(socialPlatforms[0].hosts),
  lineUrl: socialLinkSchema(socialPlatforms[1].hosts),
  telegramUrl: socialLinkSchema(socialPlatforms[2].hosts),
  facebookUrl: socialLinkSchema(socialPlatforms[3].hosts),
  tiktokUrl: socialLinkSchema(socialPlatforms[4].hosts),
  youtubeUrl: socialLinkSchema(memberSocialPlatforms[5].hosts),
  kickUrl: socialLinkSchema(memberSocialPlatforms[6].hosts),
  instagramUrl: socialLinkSchema(memberSocialPlatforms[7].hosts),
  equipment: memberEquipmentSchema.default([]),
};
export function readMemberEquipment(value: unknown): MemberEquipment {
  const parsed = memberEquipmentSchema.safeParse(value);
  return parsed.success ? parsed.data : [];
}
export function readMemberSocialLinks(value: unknown): MemberSocialLinks {
  const parsed = z
    .object(memberProfileFields)
    .omit({ equipment: true })
    .safeParse(value);
  return parsed.success ? parsed.data : {};
}
