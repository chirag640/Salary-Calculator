import { type NextRequest, NextResponse } from "next/server"
import { connectToDatabase } from "@/lib/mongodb"
import { verifyToken } from "@/lib/auth"
import { getEffectiveHourlyRateForDate } from "@/lib/salary"

export const runtime = "nodejs"

export async function GET(request: NextRequest) {
  try {
    const cookieToken = request.cookies.get("auth-token")?.value
    const userFromToken = cookieToken ? verifyToken(cookieToken) : null
    const userId = userFromToken?._id || request.headers.get("x-user-id")
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const date = searchParams.get("date")
    if (!date) return NextResponse.json({ error: "date is required (YYYY-MM-DD)" }, { status: 400 })

    const { db } = await connectToDatabase()
    const eff = await getEffectiveHourlyRateForDate(db, userId, date)
    return NextResponse.json({ date, hourlyRate: eff.hourlyRate })
  } catch (e) {
    console.error("GET /api/profile/hourly-rate error", e)
    return NextResponse.json({ error: "Failed to get hourly rate" }, { status: 500 })
  }
}
