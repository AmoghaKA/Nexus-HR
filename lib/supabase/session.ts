import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { roleDashboard, workspaceRoleFromUser } from "@/lib/auth/role";

/**
 * During prefetch requests, Next.js uses `/hr` paths for `_next/data` URLs.
 * We normalise the pathname so the proxy logic always sees the page path.
 */
function normalisePath(pathname: string): string {
  const p = pathname.startsWith("/_next/data/")
    ? pathname.replace(/^\/_next\/data\/[^/]+/, "")
    : pathname;
  return p.endsWith(".json") ? p.slice(0, -5) : p;
}

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnonKey) {
    // Supabase not configured (demo mode) — let every request through.
    return response;
  }

  const pathname = normalisePath(request.nextUrl.pathname);
  const isPublic =
    pathname === "/" || pathname === "/login" || pathname === "/signup";
  const isProtected =
    pathname.startsWith("/hr") || pathname.startsWith("/employee");

  // No session cookie means no signed-in user (the browser client stores
  // sessions in cookies). Skip the Supabase network round-trip entirely when
  // the routing decision is already known: public pages pass straight
  // through, protected pages redirect to sign-in deterministically.
  const hasAuthCookie = request.cookies
    .getAll()
    .some((cookie) => cookie.name.startsWith("sb-"));

  if (!hasAuthCookie) {
    // Full page navigations (GET/HEAD) to protected routes redirect to
    // sign-in so the user lands on the login screen deterministically.
    //
    // Non-GET requests (Server Actions and router PATCHes) must NOT be
    // 307-redirected to /login: the client router expects a
    // `text/x-component` (RSC) response and throws
    // "An unexpected response was received from the server." (E394) when a
    // followed redirect returns the login HTML page instead. Let those pass
    // through — the Server Action or page render will report a missing
    // session itself, and RLS keeps them empty.
    if (isProtected && (request.method === "GET" || request.method === "HEAD")) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
    return response;
  }

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value),
        );
        // Recreate the next response after mutating request cookies so the
        // downstream page sees the updated cookie header.
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
      },
    },
  });

  const { data, error } = await supabase.auth.getUser();
  const user = error ? null : data.user;
  const role = workspaceRoleFromUser(user);

  const isNavigation = request.method === "GET" || request.method === "HEAD";

  if (error && isNavigation && isProtected) {
    // A session cookie exists but the token is expired/invalid. Do not let the
    // request through — the signed-in-feeling dead end shows an empty page with
    // a "sign in to view" notice. Drop the stale cookies and send the user to
    // /login so they can re-authenticate cleanly.
    const login = NextResponse.redirect(new URL("/login", request.url));
    for (const cookie of request.cookies.getAll()) {
      if (cookie.name.startsWith("sb-")) {
        login.cookies.set(cookie.name, "", { maxAge: 0, path: "/" });
      }
    }
    return login;
  }

  // Redirects are for page navigations only. Server Actions (POST) and router
  // PATCHes must be answered with `text/x-component`, so hard-redirecting them
  // (e.g. fetching an action on /login right after sign-in, when the fresh
  // session cookie makes the user "signed in on a public page") makes the
  // client router throw "An unexpected response was received from the server."
  // Let non-navigation requests through; the action is always a client-side
  // roundtrip that reports its own result.
  if (user && isNavigation) {
    // Signed-in users should not be on public-only pages — send them to the
    // correct dashboard based on their persisted role.
    if (isPublic) {
      return NextResponse.redirect(new URL(roleDashboard[role], request.url));
    }
    // Protect each workspace by role.
    if (isProtected && role !== "hr" && pathname.startsWith("/hr")) {
      return NextResponse.redirect(new URL(roleDashboard[role], request.url));
    }
    if (isProtected && role !== "employee" && pathname.startsWith("/employee")) {
      return NextResponse.redirect(new URL(roleDashboard[role], request.url));
    }
  }

  return response;
}