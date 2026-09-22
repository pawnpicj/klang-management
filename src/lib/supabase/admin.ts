import "server-only";
import { createClient } from "@supabase/supabase-js";
import { getPublicEnv, getServerEnv } from "@/lib/env";
import type { Database } from "@/types/database";
// Do not use for tenant mutations: the secret key bypasses RLS.
export function createAdminClient() {
  const env = getPublicEnv();
  const serverEnv = getServerEnv();
  return createClient<Database>(env.url, serverEnv.secretKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
