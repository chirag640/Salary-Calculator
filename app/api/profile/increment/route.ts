import { type NextRequest, NextResponse } from "next/server"
import { connectToDatabase } from "@/lib/mongodb"
import { verifyToken } from "@/lib/auth"
import type { AddSalaryIncrementRequest, SalaryRecord, WorkingConfig } from "@/lib/types"
import { validateCsrf } from "@/lib/csrf"
import { rateLimit, buildRateLimitKey } from "@/lib/rate-limit"

export const runtime = "nodejs"

export async function POST(request: NextRequest) {
  try {
    const cookieToken = request.cookies.get("auth-token")?.value
    const userFromToken = cookieToken ? verifyToken(cookieToken) : null
  const userId = userFromToken?._id
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  if (!validateCsrf(request)) return NextResponse.json({ error: "Invalid CSRF token" }, { status: 403 })
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0] || "unknown"
  const rl = rateLimit(buildRateLimitKey(ip, "salary-increment"), { windowMs: 60_000, max: 5 })
  if (!rl.ok) return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 })

    const body: AddSalaryIncrementRequest = await request.json()
    if (!body?.salaryType || !body?.amount || !body?.effectiveFrom) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 })
    }

    const { db } = await connectToDatabase()
    const user = await db.collection("users").findOne({ _id: new (require("mongodb").ObjectId)(userId) })
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 })

    const baseWorking: WorkingConfig = user.workingConfig || { hoursPerDay: 8, daysPerMonth: 22 }
    const working: WorkingConfig = {
      hoursPerDay: body.working?.hoursPerDay ?? baseWorking.hoursPerDay,
      daysPerMonth: body.working?.daysPerMonth ?? baseWorking.daysPerMonth,
    }

    const record: SalaryRecord = {
      salaryType: body.salaryType,
      amount: Number(body.amount),
      effectiveFrom: body.effectiveFrom,
      working,
      note: body.note,
      createdAt: new Date(),
    }

    const update: any = {
      $push: { salaryHistory: { $each: [record] } },
      $set: { updatedAt: new Date() },
    }
    await db.collection("users").updateOne({ _id: new (require("mongodb").ObjectId)(userId) }, update)

    return NextResponse.json({ success: true })
  } catch (e) {
    console.error("POST /api/profile/increment error", e)
    return NextResponse.json({ error: "Failed to add salary increment" }, { status: 500 })
  }
}
