"use client";
import { createBrowserClient } from "@supabase/ssr";
import { getPublicEnv } from "@/lib/env";
import type { Database } from "@/types/database";
export function createClient() {
  const env = getPublicEnv();
  return createBrowserClient<Database>(env.url, env.publishableKey);
}
