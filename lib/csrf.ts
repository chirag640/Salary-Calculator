// Minimal double-submit CSRF token helper.
// For stronger protection consider next-csrf or @edge.
// We store a random token in a non-HttpOnly cookie and expect it mirrored in a custom header.

import { randomBytes } from "crypto"

export function generateCsrfToken(): string {
  return randomBytes(16).toString("hex")
}

export function validateCsrf(request: Request): boolean {
  // Only enforce for state-changing methods (POST, PUT, DELETE, PATCH)
  if (!/^(POST|PUT|DELETE|PATCH)$/i.test(request.method)) return true
  const header = request.headers.get("x-csrf-token")
  // On server routes you can read cookie via request.headers.get('cookie') manually if needed.
  const cookieHeader = request.headers.get("cookie") || ""
  const cookieMatch = cookieHeader.split(/; */).find((c) => c.startsWith("csrf-token="))
  if (!cookieMatch) return false
  const cookieToken = cookieMatch.split("=")[1]
  return !!header && header === cookieToken
}
