// Minimal double-submit CSRF token helper.
// For stronger protection consider next-csrf or @edge.
// We store a random token in a non-HttpOnly cookie and expect it mirrored in a custom header.

import { randomBytes } from "crypto";

// Generate 256-bit (32 bytes) CSRF token per security best practices
export function generateCsrfToken(): string {
  return randomBytes(32).toString("hex");
}

/**
 * Validate a double-submit CSRF token.
 * Accepts either a standard Request or NextRequest (server) instance.
 * Tries to read the cookie via NextRequest.cookies when available, otherwise
 * falls back to parsing the Cookie header. Comparison is strict equality.
 *
 * Skip CSRF validation for Bearer token authentication (mobile apps)
 */
export function validateCsrf(request: Request | any): boolean {
  // Only enforce for state-changing methods (POST, PUT, DELETE, PATCH)
  if (!/^(POST|PUT|DELETE|PATCH)$/i.test(request.method)) return true;

  // Skip CSRF validation for Bearer token authentication (mobile apps)
  const authHeader = request.headers.get("authorization");
  if (authHeader && authHeader.startsWith("Bearer ")) {
    return true;
  }

  const header = request.headers.get("x-csrf-token");

  // Prefer NextRequest.cookies if present (access to parsed cookies on server)
  let cookieToken: string | undefined;
  try {
    // NextRequest in Next.js exposes a `cookies` getter with .get(name)
    if (request && typeof request.cookies === "function") {
      // Some runtimes expose cookies() as a function that returns a map-like object
      const store = request.cookies();
      cookieToken = store?.get?.("csrf-token")?.value;
    } else if (
      request &&
      request.cookies &&
      typeof request.cookies.get === "function"
    ) {
      // NextRequest object in some environments
      cookieToken = request.cookies.get("csrf-token")?.value;
    }
  } catch (e) {
    // ignore and fallback to header parsing
  }

  if (!cookieToken) {
    const cookieHeader =
      (request.headers && request.headers.get("cookie")) || "";
    const cookieMatch = cookieHeader
      .split(/; */)
      .find((c: string) => c.startsWith("csrf-token="));
    if (!cookieMatch) return false;
    // Support tokens that may include '=' by joining the remainder
    cookieToken = decodeURIComponent(cookieMatch.split("=").slice(1).join("="));
  }

  return !!header && !!cookieToken && header === cookieToken;
}
