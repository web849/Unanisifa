import { NextResponse, type NextRequest } from "next/server";
import { jwtVerify } from "jose";
import { ADMIN_SESSION_COOKIE } from "@/lib/config";

/**
 * মিডলওয়্যার — লগইন ছাড়া /admin/* থেকে /admin/login?next=… এ রিডাইরেক্ট।
 * /admin ও /api/admin-এ X-Robots-Tag: noindex।
 * (সেশনের পূর্ণ যাচাই — authVersion সহ — সার্ভার সাইডে আবার হয়)
 */
export async function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const isAdminRoute = pathname === "/admin" || pathname.startsWith("/admin/");
  const isAdminApi = pathname.startsWith("/api/admin");

  if (isAdminRoute || isAdminApi) {
    const response = NextResponse.next();
    response.headers.set("X-Robots-Tag", "noindex, nofollow, noarchive");
    response.headers.set("Cache-Control", "no-store, max-age=0, must-revalidate");

    const token = request.cookies.get(ADMIN_SESSION_COOKIE)?.value;
    const isLogin = pathname === "/admin/login";
    // Login must reach its handler before a session exists; the handler validates credentials.
    const isLoginApi = pathname === "/api/admin/auth/login";
    let valid = false;

    if (token) {
      try {
        const secretValue = process.env.AUTH_SECRET;
        if (secretValue) {
          const { payload } = await jwtVerify(
            token,
            new TextEncoder().encode(`admin:${secretValue}`),
          );
          valid = payload.scope === "admin";
        }
      } catch {
        valid = false;
      }
    }

    if (isLogin && valid) {
      const url = request.nextUrl.clone();
      url.pathname = "/admin";
      url.search = "";
      return NextResponse.redirect(url);
    }

    if (!isLogin && !isLoginApi && !valid) {
      if (isAdminApi) {
        return NextResponse.json({ ok: false, error: "লগইন প্রয়োজন" }, { status: 401 });
      }
      const url = request.nextUrl.clone();
      url.pathname = "/admin/login";
      url.search = "";
      url.searchParams.set("next", `${pathname}${search}`);
      return NextResponse.redirect(url);
    }

    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin", "/admin/:path*", "/api/admin/:path*"],
};
