import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { generateCsrfToken } from "@/lib/csrf"

// Issues/refreshes a CSRF token using the double-submit cookie pattern.
// Client should mirror the cookie value in an `x-csrf-token` header for mutating requests.
export async function GET() {
  // Some Next.js typings may mark cookies() as possibly async; handle both.
  const maybePromise = cookies() as any
  const store = typeof maybePromise.then === "function" ? await maybePromise : maybePromise
  let token: string | undefined = store.get?.("csrf-token")?.value
  if (!token) {
    token = generateCsrfToken()
    const res = NextResponse.json({ csrfToken: token })
    res.cookies.set("csrf-token", token, {
      httpOnly: false,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60,
    })
    return res
  }
  return NextResponse.json({ csrfToken: token })
}
