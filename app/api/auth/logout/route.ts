import { NextResponse } from "next/server"
export const runtime = "nodejs"

export async function POST() {
  const response = NextResponse.json({ message: "Logged out successfully" })

  // Clear the auth cookie
  response.cookies.set("auth-token", "", {
    httpOnly: false,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 0,
    path: "/",
  })

  return response
}
