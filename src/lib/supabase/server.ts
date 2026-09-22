import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getPublicEnv } from "@/lib/env";
import type { Database } from "@/types/database";

export async function createClient() {
  const env = getPublicEnv();
  const cookieStore = await cookies();
  return createServerClient<Database>(env.url, env.publishableKey, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll(values) {
        try {
          values.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        } catch {
          // Server Components cannot write cookies. The root proxy refreshes
          // sessions before rendering; Actions and Route Handlers can write.
        }
      },
    },
  });
}
