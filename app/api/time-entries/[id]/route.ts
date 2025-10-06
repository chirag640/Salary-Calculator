export const runtime = "nodejs"
import { type NextRequest, NextResponse } from "next/server"
import { ObjectId } from "mongodb"
import { connectToDatabase } from "@/lib/mongodb"
import type { TimeEntry } from "@/lib/types"
import { calculateTimeWorked } from "@/lib/time-utils"
import { getEffectiveHourlyRateForDate, computeEarningsWithOvertime } from "@/lib/salary"
import { verifyToken } from "@/lib/auth"
import { updateTimeEntrySchema } from "@/lib/validation/schemas"
import { validateCsrf } from "@/lib/csrf"
import { rateLimit, buildRateLimitKey } from "@/lib/rate-limit"
function deriveHolidayCategory(date: string): "sunday" | "saturday" | "other" {
  try { const d = new Date(date + 'T00:00:00'); const day = d.getUTCDay(); if (day === 0) return 'sunday'; if (day === 6) return 'saturday'; } catch {}
  return 'other'
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const cookieToken = request.cookies.get("auth-token")?.value
    const userFromToken = cookieToken ? verifyToken(cookieToken) : null
    const userId = userFromToken?._id
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (!validateCsrf(request)) {
      return NextResponse.json({ error: "Invalid CSRF token" }, { status: 403 })
    }

    const ip = request.headers.get("x-forwarded-for")?.split(",")[0] || "unknown"
    const rl = rateLimit(buildRateLimitKey(ip, "time-entry-update"), { windowMs: 30_000, max: 20 })
    if (!rl.ok) {
      return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 })
    }

    const raw = await request.json()
    const parsed = updateTimeEntrySchema.safeParse(raw)
    if (!parsed.success) {
      return NextResponse.json({ error: "Validation failed", issues: parsed.error.format() }, { status: 400 })
    }
  const { date, timeIn, timeOut, breakMinutes, workDescription = "", client = "", project = "", leave, totalHours: providedHours, isHolidayWork, holidayCategory, isHolidayExtra } = parsed.data

    let totalHours = 0
    let totalEarnings = 0
    const { db } = await connectToDatabase()
    const eff = await getEffectiveHourlyRateForDate(db, userId, date)
    const hourlyRate = eff.hourlyRate || 0
    const baseHolidayHours = 9
    if (!leave?.isLeave) {
      if (isHolidayWork) {
        if (isHolidayExtra && timeIn && timeOut) {
          const extra = Math.round(calculateTimeWorked(timeIn, timeOut, breakMinutes, hourlyRate).totalHours * 100) / 100
          totalHours = Math.round((baseHolidayHours + extra) * 100) / 100
        } else {
          totalHours = baseHolidayHours
        }
        totalEarnings = Math.round(totalHours * hourlyRate * 100) / 100
      } else {
        if (timeIn && timeOut) {
          totalHours = calculateTimeWorked(timeIn, timeOut, breakMinutes, hourlyRate).totalHours
        } else if (typeof providedHours === "number" && providedHours > 0) {
          totalHours = Math.round(providedHours * 100) / 100
        }
        totalEarnings = computeEarningsWithOvertime(totalHours, hourlyRate, eff.overtime)
      }
    }

    const effectiveLeave = isHolidayWork ? undefined : leave
    const updateData: Partial<TimeEntry> = {
      date,
  timeIn: isHolidayWork && !isHolidayExtra ? "" : (timeIn || ""),
  timeOut: isHolidayWork && !isHolidayExtra ? "" : (timeOut || ""),
      breakMinutes,
      hourlyRate,
      totalHours,
      totalEarnings,
      workDescription,
      client,
      project,
      leave: effectiveLeave,
      isHolidayWork: !!isHolidayWork,
    holidayCategory: isHolidayWork ? (holidayCategory || deriveHolidayCategory(date)) : undefined,
    isHolidayExtra: isHolidayWork ? !!isHolidayExtra : undefined,
  updatedAt: new Date(),
    }

    const collection = db.collection<TimeEntry>("timeEntries")

  const result = await collection.updateOne({ _id: new ObjectId(params.id) as any, userId }, { $set: updateData })

    if (result.matchedCount === 0) {
      return NextResponse.json({ error: "Time entry not found" }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error updating time entry:", error)
    return NextResponse.json({ error: "Failed to update time entry" }, { status: 500 })
  }
}

// Soft delete endpoint (marks deletedAt and returns a restore token good for 15s)
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const cookieToken = request.cookies.get("auth-token")?.value
    const userFromToken = cookieToken ? verifyToken(cookieToken) : null
    const userId = userFromToken?._id
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (!validateCsrf(request)) {
      return NextResponse.json({ error: "Invalid CSRF token" }, { status: 403 })
    }

    const ip = request.headers.get("x-forwarded-for")?.split(",")[0] || "unknown"
    const rl = rateLimit(buildRateLimitKey(ip, "time-entry-delete"), { windowMs: 30_000, max: 30 })
    if (!rl.ok) {
      return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 })
    }

    const { db } = await connectToDatabase()
    const collection = db.collection<TimeEntry>("timeEntries")

  const entry = await collection.findOne({ _id: new ObjectId(params.id) as any, userId })
    if (!entry || entry.deletedAt) {
      return NextResponse.json({ error: "Time entry not found" }, { status: 404 })
    }

    const deletedAt = new Date()
    await collection.updateOne({ _id: entry._id, userId }, { $set: { deletedAt, updatedAt: new Date() } })

    const restoreToken = Buffer.from(JSON.stringify({ id: params.id, ts: Date.now() })).toString('base64')
    return NextResponse.json({ success: true, id: params.id, restoreToken, expiresInMs: 15_000 })
  } catch (error) {
    console.error("Error soft deleting time entry:", error)
    return NextResponse.json({ error: "Failed to delete time entry" }, { status: 500 })
  }
}

// Restore (undo) within a 15s window: POST with { restoreToken }
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const cookieToken = request.cookies.get("auth-token")?.value
    const userFromToken = cookieToken ? verifyToken(cookieToken) : null
    const userId = userFromToken?._id
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (!validateCsrf(request)) {
      return NextResponse.json({ error: "Invalid CSRF token" }, { status: 403 })
    }

    const ip = request.headers.get("x-forwarded-for")?.split(",")[0] || "unknown"
    const rl = rateLimit(buildRateLimitKey(ip, "time-entry-restore"), { windowMs: 30_000, max: 30 })
    if (!rl.ok) {
      return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 })
    }

    const body = await request.json().catch(() => ({})) as any
    if (!body?.restoreToken) {
      return NextResponse.json({ error: "Missing restoreToken" }, { status: 400 })
    }
    let decoded: { id: string; ts: number }
    try {
      decoded = JSON.parse(Buffer.from(body.restoreToken, 'base64').toString('utf8'))
    } catch {
      return NextResponse.json({ error: "Invalid token" }, { status: 400 })
    }
    if (decoded.id !== params.id) {
      return NextResponse.json({ error: "Token mismatch" }, { status: 400 })
    }
    if (Date.now() - decoded.ts > 15_000) {
      return NextResponse.json({ error: "Restore window expired" }, { status: 410 })
    }

    const { db } = await connectToDatabase()
    const collection = db.collection<TimeEntry>("timeEntries")
  const entry = await collection.findOne({ _id: new ObjectId(params.id) as any, userId })
    if (!entry || !entry.deletedAt) {
      return NextResponse.json({ error: "Entry not found or not deleted" }, { status: 404 })
    }

    await collection.updateOne({ _id: entry._id, userId }, { $set: { deletedAt: null, updatedAt: new Date() } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error restoring time entry:", error)
    return NextResponse.json({ error: "Failed to restore time entry" }, { status: 500 })
  }
}
