import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export function middleware(request: NextRequest) {
  // Skip auth for login/register pages and API auth routes
  if (
    request.nextUrl.pathname.startsWith("/login") ||
    request.nextUrl.pathname.startsWith("/register") ||
    request.nextUrl.pathname.startsWith("/api/auth")
  ) {
    return NextResponse.next()
  }

  // Check for auth token in cookies. Avoid JWT verification in Middleware (Edge runtime).
  const token = request.cookies.get("auth-token")?.value
  // Debug: log cookie presence
  try {
    // eslint-disable-next-line no-console
    console.log(`[middleware] ${request.nextUrl.pathname} auth-token present: ${!!token}`)
  } catch {}
  if (!token) {
    return NextResponse.redirect(new URL("/login", request.url))
  }

  // Allow request to continue. API routes will verify the token server-side.
  return NextResponse.next()
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
}
