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

function deriveHolidayCategory(date: string): "sunday" | "saturday" | "other" {
  try {
    const d = new Date(date + 'T00:00:00')
    const day = d.getUTCDay() // 0 Sunday, 6 Saturday
    if (day === 0) return 'sunday'
    if (day === 6) return 'saturday'
  } catch {}
  return 'other'
}

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

    // CSRF validation - provide diagnostic details if it fails to help debugging
    const headerPresent = !!request.headers.get("x-csrf-token")
    let cookiePresent = false
    try {
      if (request && request.cookies) {
        // request.cookies may be a map-like object with .get(name) or a Cookies instance
        const getFn: any = (request.cookies.get && request.cookies.get.bind(request.cookies)) || undefined
        if (typeof getFn === "function") {
          cookiePresent = !!getFn("csrf-token")?.value
        } else if (typeof request.cookies === "object" && typeof (request.cookies as any).get === "function") {
          cookiePresent = !!(request.cookies as any).get("csrf-token")?.value
        }
      }
    } catch (e) {
      // ignore
    }
    if (!validateCsrf(request)) {
      // Return details (without echoing token values) so client can show helpful message
      return NextResponse.json({ error: "Invalid CSRF token", details: { headerPresent, cookiePresent } }, { status: 403 })
    }

    let raw: any
    try {
      raw = await request.json()
    } catch (e) {
      console.error("Failed to parse JSON body for time entry create")
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
    }
    const parse = createTimeEntrySchema.safeParse(raw)
    if (!parse.success) {
      console.warn("Time entry validation failed:", parse.error.format())
      return NextResponse.json({ error: "Validation failed", issues: parse.error.format() }, { status: 400 })
    }
  const { date, timeIn, timeOut, breakMinutes, workDescription, client, project, leave, totalHours: providedHours, isHolidayWork, holidayCategory, isHolidayExtra } = parse.data

    const { db } = await connectToDatabase()
    // Overlapping prevention: only if not leave, not holiday work, and we have a time range
    // Skip overlap check for holiday work entries as they have special semantics (base 9h + optional extra)
  if (timeIn && timeOut && !leave?.isLeave && !isHolidayWork) {
      // Ignore soft-deleted entries when checking for overlaps
      const overlap = await db.collection<TimeEntry>("timeEntries").findOne({
        userId,
        date,
        $or: [
          { deletedAt: { $exists: false } },
          { deletedAt: null },
        ],
        $and: [
          { $or: [ { timeIn: { $lt: timeOut }, timeOut: { $gt: timeIn } } ] }, // simplistic textual comparison (HH:MM) works lexicographically
        ],
      })
      if (overlap) {
        console.warn("Overlapping entry detected for user", userId, "date", date, "overlapId", overlap._id)
        // Return a minimal subset of the overlapping entry so the client can show helpful context
        const overlapInfo = {
          _id: overlap._id?.toString?.() || overlap._id,
          timeIn: overlap.timeIn || "",
          timeOut: overlap.timeOut || "",
          totalHours: overlap.totalHours || 0,
          workDescription: overlap.workDescription || "",
          isHolidayWork: !!overlap.isHolidayWork,
        }
        return NextResponse.json({ error: "Overlapping time entry exists", overlap: overlapInfo }, { status: 409 })
      }
    }

    const eff = await getEffectiveHourlyRateForDate(db, userId, date)
    const hourlyRate = eff.hourlyRate || 0
    let totalHours = 0
    let totalEarnings = 0
    // Holiday work semantics: base paid hours (9) if holiday and no hours provided.
    const baseHolidayHours = 9
    if (!leave?.isLeave) {
      if (isHolidayWork) {
        if (isHolidayExtra && timeIn && timeOut) {
          const extra = Math.round(calculateTimeWorked(timeIn, timeOut, breakMinutes, hourlyRate).totalHours * 100) / 100
          totalHours = Math.round((baseHolidayHours + extra) * 100) / 100
        } else {
          // Ignore any provided time range when not explicitly extra
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

    // If both leave and holiday work were somehow provided, prioritize work (drop leave)
  const effectiveLeave = isHolidayWork ? undefined : leave ? { ...leave } as any : undefined

    const doc: TimeEntry = {
      userId,
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
  createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
  // Previously supported syncToGoogle; calendar sync has been removed.
    }
    const result = await db.collection<TimeEntry>("timeEntries").insertOne(doc)
    
    return NextResponse.json({ ...doc, _id: result.insertedId.toString() })
    } catch (error: any) {
      console.error("Error creating time entry:", error)
      const msg = error && (error.message || String(error)) ? (error.message || String(error)) : "Unknown error"
      return NextResponse.json({ error: "Failed to create time entry", detail: msg }, { status: 500 })
    }
}
