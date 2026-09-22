import { NextResponse, type NextRequest } from "next/server";
import { hasPublicEnv } from "@/lib/env";
import { updateSession } from "@/lib/supabase/proxy";

export async function proxy(request: NextRequest) {
  if (!hasPublicEnv()) {
    if (
      request.nextUrl.pathname.startsWith("/profile") ||
      request.nextUrl.pathname.startsWith("/reset-password")
    ) {
      const url = request.nextUrl.clone();
      url.pathname = request.nextUrl.pathname.startsWith("/reset-password")
        ? "/forgot-password"
        : "/login";
      url.search = "";
      return NextResponse.redirect(url);
    }
    return NextResponse.next();
  }

  return updateSession(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
