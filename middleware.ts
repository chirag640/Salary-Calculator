import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Public routes that don't require authentication
  const publicRoutes = [
    "/login",
    "/register",
    "/verify-email",
    "/link-account",
    "/forgot-password",
    "/reset-password",
  ];

  // Public API routes
  const publicApiRoutes = ["/api/auth", "/api/csrf"];

  // Static files and public assets
  const publicAssets = [
    "/manifest.json",
    "/sw.js",
    "/favicon.ico",
    "/.well-known",
    "/_next",
  ];

  // Check if the route is public
  const isPublicRoute = publicRoutes.some((route) =>
    pathname.startsWith(route)
  );
  const isPublicApi = publicApiRoutes.some((route) =>
    pathname.startsWith(route)
  );
  const isPublicAsset = publicAssets.some((asset) =>
    pathname.startsWith(asset)
  );

  if (isPublicRoute || isPublicApi || isPublicAsset) {
    return NextResponse.next();
  }

  // Check for auth token in cookies
  const token = request.cookies.get("auth-token")?.value;

  // Debug logging (remove in production)
  if (process.env.NODE_ENV === "development") {
    console.log(
      `[middleware] ${pathname} - auth-token: ${token ? "present" : "missing"}`
    );
  }

  if (!token) {
    // Redirect to login with return URL
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("returnTo", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Token exists - allow request to continue
  // Note: Full JWT verification happens in API routes on the server
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder files
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
