export const runtime = "nodejs"
import { type NextRequest, NextResponse } from "next/server"
import { ObjectId } from "mongodb"
import { connectToDatabase } from "@/lib/mongodb"
import type { TimeEntry } from "@/lib/types"
import { calculateTimeWorked } from "@/lib/time-utils"
import { verifyToken } from "@/lib/auth"

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const cookieToken = request.cookies.get("auth-token")?.value
    const userFromToken = cookieToken ? verifyToken(cookieToken) : null
    const userId = userFromToken?._id || request.headers.get("x-user-id")
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

    const updateData = {
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
      updatedAt: new Date(),
    }

    const { db } = await connectToDatabase()
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

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const cookieToken = request.cookies.get("auth-token")?.value
    const userFromToken = cookieToken ? verifyToken(cookieToken) : null
    const userId = userFromToken?._id || request.headers.get("x-user-id")
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { db } = await connectToDatabase()
    const collection = db.collection<TimeEntry>("timeEntries")

    const result = await collection.deleteOne({
  _id: new ObjectId(params.id) as any,
      userId,
    })

    if (result.deletedCount === 0) {
      return NextResponse.json({ error: "Time entry not found" }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting time entry:", error)
    return NextResponse.json({ error: "Failed to delete time entry" }, { status: 500 })
  }
}
