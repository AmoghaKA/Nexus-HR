import type { NextRequest } from "next/server";

import { updateSession } from "@/lib/supabase/session";

export async function proxy(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    // Run on all routes except static assets and the public health endpoint.
    "/((?!api|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)",
  ],
};