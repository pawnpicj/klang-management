import "server-only";

import { createHmac } from "node:crypto";
import { headers } from "next/headers";
import { getServerEnv } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";

function getClientAddress(headerStore: Awaited<ReturnType<typeof headers>>) {
  return (
    headerStore.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    headerStore.get("x-real-ip") ||
    "unknown"
  );
}

export async function createLoginRateLimitKey(username: string) {
  const headerStore = await headers();
  const { rateLimitSecret } = getServerEnv();
  return createHmac("sha256", rateLimitSecret)
    .update(`${getClientAddress(headerStore)}:${username.trim().toLowerCase()}`)
    .digest("hex");
}

export async function consumeLoginAttempt(keyHash: string) {
  const admin = createAdminClient();
  const { data, error } = await admin.rpc("consume_login_rate_limit", {
    p_key_hash: keyHash,
  });
  if (error) throw error;
  return data;
}

export async function resetLoginAttempts(keyHash: string) {
  const admin = createAdminClient();
  const { error } = await admin.rpc("reset_login_rate_limit", {
    p_key_hash: keyHash,
  });
  if (error) throw error;
}
