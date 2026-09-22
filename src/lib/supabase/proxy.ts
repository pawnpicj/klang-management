import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getPublicEnv } from "@/lib/env";
import type { Database } from "@/types/database";

function redirectWithCookies(url: URL, response: NextResponse) {
  const redirect = NextResponse.redirect(url);
  response.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie));
  return redirect;
}

export async function updateSession(request: NextRequest) {
  const env = getPublicEnv();
  let response = NextResponse.next({ request });
  const supabase = createServerClient<Database>(env.url, env.publishableKey, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value),
        );
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
      },
    },
  });

  const { data } = await supabase.auth.getClaims();
  const userId = typeof data?.claims?.sub === "string" ? data.claims.sub : null;
  const pathname = request.nextUrl.pathname;
  const needsUser = pathname.startsWith("/profile");
  const needsRecovery = pathname.startsWith("/reset-password");

  if (userId) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("status")
      .eq("id", userId)
      .maybeSingle();

    if (profile?.status !== "ACTIVE") {
      await supabase.auth.signOut();
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      url.search = "";
      return redirectWithCookies(url, response);
    }
  }

  if (!userId && (needsUser || needsRecovery)) {
    const url = request.nextUrl.clone();
    url.pathname = needsRecovery ? "/forgot-password" : "/login";
    url.search = needsUser ? `?next=${encodeURIComponent(pathname)}` : "";
    return redirectWithCookies(url, response);
  }

  if (userId && ["/login", "/register"].includes(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = "/profile";
    url.search = "";
    return redirectWithCookies(url, response);
  }

  return response;
}
