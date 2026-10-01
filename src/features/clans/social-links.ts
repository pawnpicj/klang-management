import { z } from "zod";

export const socialPlatforms = [
  {
    key: "discordUrl",
    label: "Discord",
    hosts: ["discord.gg", "discord.com"],
    placeholder: "https://discord.gg/…",
  },
  {
    key: "lineUrl",
    label: "LINE",
    hosts: ["line.me", "lin.ee"],
    placeholder: "https://line.me/ti/g/…",
  },
  {
    key: "telegramUrl",
    label: "Telegram",
    hosts: ["t.me", "telegram.me"],
    placeholder: "https://t.me/…",
  },
  {
    key: "facebookUrl",
    label: "Facebook",
    hosts: [
      "facebook.com",
      "www.facebook.com",
      "m.facebook.com",
      "web.facebook.com",
      "fb.me",
    ],
    placeholder: "https://www.facebook.com/…",
  },
  {
    key: "tiktokUrl",
    label: "TikTok",
    hosts: [
      "tiktok.com",
      "www.tiktok.com",
      "m.tiktok.com",
      "vm.tiktok.com",
      "vt.tiktok.com",
    ],
    placeholder: "https://www.tiktok.com/@…",
  },
] as const;
export type SocialPlatformKey = (typeof socialPlatforms)[number]["key"];

export function isSocialLink(value: string, hosts: readonly string[]) {
  if (!value) return true;
  try {
    const url = new URL(value);
    return (
      url.protocol === "https:" &&
      hosts.includes(url.hostname) &&
      !url.username &&
      !url.password &&
      !url.port &&
      url.pathname.length > 1 &&
      !/[\\\s]/.test(value)
    );
  } catch {
    return false;
  }
}
export function socialLinkSchema(hosts: readonly string[]) {
  return z
    .string()
    .trim()
    .max(1000, "ลิงก์ต้องไม่เกิน 1,000 ตัวอักษร")
    .refine(
      (value) => isSocialLink(value, hosts),
      "กรุณาใส่ลิงก์ HTTPS ของแพลตฟอร์มนี้",
    )
    .transform((value) => (value ? new URL(value).href : ""))
    .default("");
}
