import { type NextRequest, NextResponse } from "next/server"
import { connectToDatabase } from "@/lib/mongodb"
import { verifyToken, verifyRevealToken } from "@/lib/auth"
import { getEffectiveHourlyRateForDate } from "@/lib/salary"
import { validateCsrf } from "@/lib/csrf"
import { rateLimit, buildRateLimitKey } from "@/lib/rate-limit"

export const runtime = "nodejs"

export async function GET(request: NextRequest) {
  try {
    const cookieToken = request.cookies.get("auth-token")?.value
    const userFromToken = cookieToken ? verifyToken(cookieToken) : null
  const userId = userFromToken?._id
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0] || "unknown"
  const rl = rateLimit(buildRateLimitKey(ip, "hourly-rate"), { windowMs: 30_000, max: 30 })
  if (!rl.ok) return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 })
    const date = searchParams.get("date")
    if (!date) return NextResponse.json({ error: "date is required (YYYY-MM-DD)" }, { status: 400 })

    const { db } = await connectToDatabase()
    const eff = await getEffectiveHourlyRateForDate(db, userId, date)
    const revealCookie = request.cookies.get("reveal-token")?.value
    const revealValid = revealCookie ? verifyRevealToken(revealCookie) : null
    const allowReveal = revealValid && revealValid.userId === userId

    return NextResponse.json({ date, hourlyRate: allowReveal ? eff.hourlyRate : null, masked: !allowReveal })
  } catch (e) {
    console.error("GET /api/profile/hourly-rate error", e)
    return NextResponse.json({ error: "Failed to get hourly rate" }, { status: 500 })
  }
}
