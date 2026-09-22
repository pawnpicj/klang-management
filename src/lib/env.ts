import { z } from "zod";

const httpUrlSchema = z
  .url()
  .refine(
    (value) => /^https?:\/\//i.test(value),
    "URL ต้องใช้ http หรือ https",
  );

export const publicEnvSchema = z.object({
  url: httpUrlSchema,
  publishableKey: z.string().min(1),
});

export const serverEnvSchema = z.object({
  secretKey: z.string().min(1),
  rateLimitSecret: z.string().min(32),
});

export const siteUrlSchema = httpUrlSchema;
export function getPublicEnv() {
  return publicEnvSchema.parse({
    url: process.env.NEXT_PUBLIC_SUPABASE_URL,
    publishableKey: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  });
}

export function hasPublicEnv() {
  return publicEnvSchema.safeParse({
    url: process.env.NEXT_PUBLIC_SUPABASE_URL,
    publishableKey: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  }).success;
}

export function getServerEnv() {
  return serverEnvSchema.parse({
    secretKey: process.env.SUPABASE_SECRET_KEY,
    rateLimitSecret: process.env.AUTH_RATE_LIMIT_SECRET,
  });
}

export function getSiteUrl() {
  return siteUrlSchema.parse(
    process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
  );
}
