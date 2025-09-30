import { type NextRequest, NextResponse } from "next/server"
export const runtime = "nodejs"
import { connectToDatabase } from "@/lib/mongodb"
import type { TimeEntry } from "@/lib/types"
import { ObjectId } from "mongodb"
import { calculateTimeWorked } from "@/lib/time-utils"
import { verifyToken } from "@/lib/auth"
import { getEffectiveHourlyRateForDate, computeEarningsWithOvertime } from "@/lib/salary"
import { createTimeEntrySchema } from "@/lib/validation/schemas"
import { rateLimit, buildRateLimitKey } from "@/lib/rate-limit"
import { validateCsrf } from "@/lib/csrf"

export async function GET(request: NextRequest) {
  try {
    const cookieToken = request.cookies.get("auth-token")?.value
    const userFromToken = cookieToken ? verifyToken(cookieToken) : null
    const userId = userFromToken?._id
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { searchParams } = new URL(request.url)
  const date = searchParams.get("date")
  const showDeleted = searchParams.get("showDeleted") === 'true'
    const limitParam = searchParams.get("limit")
    const cursor = searchParams.get("cursor") // _id of last item from previous page
    // Only enable pagination when a limit query param is explicitly provided (>0) or a cursor is present.
    let limit = 0
    if (limitParam) {
      const parsed = Number(limitParam)
      if (!isNaN(parsed) && parsed > 0) {
        limit = Math.min(Math.max(parsed, 1), 100)
      }
    }

    const { db } = await connectToDatabase()
    const collection = db.collection<TimeEntry>("timeEntries")

  const baseQuery: any = { userId }
    if (!showDeleted) {
      // Active (not soft-deleted) entries only
      baseQuery.$or = [{ deletedAt: { $exists: false } }, { deletedAt: null }]
    }
    if (date) baseQuery.date = date

    // Always paginate (default pageSize 50) unless explicit full export flag someday
    if (limit === 0 && !cursor) {
      limit = 50
    }
    if (limit > 0 || cursor) {
      const paginatedQuery = { ...baseQuery }
      if (cursor) {
        try {
          paginatedQuery._id = { $lt: new ObjectId(cursor) }
        } catch {
          return NextResponse.json({ error: "Invalid cursor" }, { status: 400 })
        }
      }
      const pageSize = limit || 50
      const docs = await collection.find(paginatedQuery).sort({ _id: -1 }).limit(pageSize).toArray()
      const nextCursor = docs.length === pageSize ? docs[docs.length - 1]._id.toString() : null
      return NextResponse.json({ items: docs, nextCursor, pageSize })
    }
    // Fallback (should not normally hit)
    const entries = await collection.find(baseQuery).sort({ date: -1, createdAt: -1 }).limit(500).toArray()
    return NextResponse.json({ items: entries, nextCursor: null, pageSize: entries.length })
  } catch (error) {
    console.error("Error fetching time entries:", error)
    return NextResponse.json({ error: "Failed to fetch time entries" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const cookieToken = request.cookies.get("auth-token")?.value
    const userFromToken = cookieToken ? verifyToken(cookieToken) : null
    const userId = userFromToken?._id
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    // Rate limit (10 creates per 30s per IP)
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0] || "unknown"
    const rl = rateLimit(buildRateLimitKey(ip, "time-entry-create"), { windowMs: 30_000, max: 10 })
    if (!rl.ok) {
      return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429, headers: { "Retry-After": String(rl.retryAfter) } })
    }

    if (!validateCsrf(request)) {
      return NextResponse.json({ error: "Invalid CSRF token" }, { status: 403 })
    }

    const raw = await request.json()
    const parse = createTimeEntrySchema.safeParse(raw)
    if (!parse.success) {
      return NextResponse.json({ error: "Validation failed", issues: parse.error.format() }, { status: 400 })
    }
  const { date, timeIn, timeOut, breakMinutes, workDescription, client, project, leave, totalHours: providedHours } = parse.data

    const { db } = await connectToDatabase()
    // Overlapping prevention: only if not leave and we have a time range
    if (timeIn && timeOut && !leave?.isLeave) {
      const overlap = await db.collection<TimeEntry>("timeEntries").findOne({
        userId,
        date,
        $or: [
          { timeIn: { $lt: timeOut }, timeOut: { $gt: timeIn } }, // simplistic textual comparison (HH:MM) works lexicographically
        ],
      })
      if (overlap) {
        return NextResponse.json({ error: "Overlapping time entry exists" }, { status: 409 })
      }
    }

    const eff = await getEffectiveHourlyRateForDate(db, userId, date)
    const hourlyRate = eff.hourlyRate || 0
    let totalHours = 0
    let totalEarnings = 0
    if (!leave?.isLeave) {
      if (timeIn && timeOut) {
        totalHours = calculateTimeWorked(timeIn, timeOut, breakMinutes, hourlyRate).totalHours
      } else if (typeof providedHours === "number" && providedHours > 0) {
        totalHours = Math.round(providedHours * 100) / 100
      }
      totalEarnings = computeEarningsWithOvertime(totalHours, hourlyRate, eff.overtime)
    }

    const doc: TimeEntry = {
      userId,
      date,
      timeIn: timeIn || "",
      timeOut: timeOut || "",
      breakMinutes,
      hourlyRate,
      totalHours,
      totalEarnings,
      workDescription,
      client,
      project,
  leave: leave ? { ...leave } as any : undefined,
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
    }
    const result = await db.collection<TimeEntry>("timeEntries").insertOne(doc)
    return NextResponse.json({ ...doc, _id: result.insertedId.toString() })
  } catch (error) {
    console.error("Error creating time entry:", error)
    return NextResponse.json({ error: "Failed to create time entry" }, { status: 500 })
  }
}
