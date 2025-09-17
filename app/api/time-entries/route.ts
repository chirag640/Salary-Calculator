import { type NextRequest, NextResponse } from "next/server"
export const runtime = "nodejs"
import { connectToDatabase } from "@/lib/mongodb"
import type { TimeEntry } from "@/lib/types"
import { calculateTimeWorked } from "@/lib/time-utils"
import { verifyToken } from "@/lib/auth"

export async function GET(request: NextRequest) {
  try {
  const cookieToken = request.cookies.get("auth-token")?.value
  const userFromToken = cookieToken ? verifyToken(cookieToken) : null
  const userId = userFromToken?._id || request.headers.get("x-user-id")
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const date = searchParams.get("date")

    const { db } = await connectToDatabase()
    const collection = db.collection<TimeEntry>("timeEntries")

    const query: any = { userId }
    if (date) {
      query.date = date
    }

    const entries = await collection.find(query).sort({ date: -1, createdAt: -1 }).toArray()

    return NextResponse.json(entries)
  } catch (error) {
    console.error("Error fetching time entries:", error)
    return NextResponse.json({ error: "Failed to fetch time entries" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get("x-user-id")
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const {
      date,
      timeIn,
      timeOut,
      breakMinutes = 0,
      hourlyRate,
      workDescription = "",
      client = "",
      project = "",
      leave,
    } = body

    // Validate required fields
    if (!date || !hourlyRate) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    let totalHours = 0
    let totalEarnings = 0

    if (!leave?.isLeave && timeIn && timeOut) {
      const calculation = calculateTimeWorked(timeIn, timeOut, breakMinutes, hourlyRate)
      totalHours = calculation.totalHours
      totalEarnings = calculation.totalEarnings
    }

    const timeEntry: TimeEntry = {
      userId, // Add userId to entry
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
      leave,
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    const { db } = await connectToDatabase()
    const collection = db.collection<TimeEntry>("timeEntries")

    const result = await collection.insertOne(timeEntry)

    return NextResponse.json({
      ...timeEntry,
      _id: result.insertedId.toString(),
    })
  } catch (error) {
    console.error("Error creating time entry:", error)
    return NextResponse.json({ error: "Failed to create time entry" }, { status: 500 })
  }
}
