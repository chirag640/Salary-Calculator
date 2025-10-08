import { type NextRequest, NextResponse } from "next/server"
import { connectToDatabase } from "@/lib/mongodb"
import type { TimeEntry, TimerState } from "@/lib/types"
import { ObjectId } from "mongodb"
import { verifyToken } from "@/lib/auth"
import { validateCsrf } from "@/lib/csrf"
import { rateLimit, buildRateLimitKey } from "@/lib/rate-limit"

export const runtime = "nodejs"

// Timer actions: start, pause, resume, stop, heartbeat
type TimerAction = "start" | "pause" | "resume" | "stop" | "heartbeat"

interface TimerActionRequest {
  action: TimerAction
  timestamp?: string // ISO timestamp from client
  idleThresholdMinutes?: number
}

/**
 * Calculate elapsed seconds from timer state
 */
function calculateElapsedSeconds(timer: TimerState): number {
  if (!timer.startedAt) return timer.accumulatedSeconds || 0

  let elapsed = timer.accumulatedSeconds || 0
  const startTime = new Date(timer.startedAt).getTime()
  const now = Date.now()

  if (timer.isRunning) {
    // Calculate time since last resume or start
    const lastResumeTime = timer.resumedAt && timer.resumedAt.length > 0
      ? new Date(timer.resumedAt[timer.resumedAt.length - 1]).getTime()
      : startTime
    
    elapsed += Math.floor((now - lastResumeTime) / 1000)
  }

  return elapsed
}

/**
 * Detect idle time based on last heartbeat
 */
function detectIdleTime(timer: TimerState, thresholdMinutes: number = 10): { isIdle: boolean; idleSeconds: number } {
  if (!timer.isRunning || !timer.lastHeartbeatAt) {
    return { isIdle: false, idleSeconds: 0 }
  }

  const lastHeartbeat = new Date(timer.lastHeartbeatAt).getTime()
  const now = Date.now()
  const idleSeconds = Math.floor((now - lastHeartbeat) / 1000)
  const thresholdSeconds = thresholdMinutes * 60

  return {
    isIdle: idleSeconds > thresholdSeconds,
    idleSeconds: idleSeconds > thresholdSeconds ? idleSeconds : 0
  }
}

/**
 * POST /api/time-entries/[id]/timer
 * Timer control endpoint: start, pause, resume, stop, heartbeat
 */
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    // In Next.js App Router, `params` may be a promise-like; await to access properties safely
    const resolvedParams = await params as { id: string }
    const id = resolvedParams.id
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
    const rl = rateLimit(buildRateLimitKey(ip, "timer-action"), { windowMs: 10_000, max: 30 })
    if (!rl.ok) {
      return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 })
    }

    const body = await request.json() as TimerActionRequest
    const { action, timestamp, idleThresholdMinutes = 10 } = body

    if (!action || !["start", "pause", "resume", "stop", "heartbeat"].includes(action)) {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 })
    }

    const { db } = await connectToDatabase()
    const collection = db.collection<TimeEntry>("timeEntries")

  const entry = await collection.findOne({ _id: new ObjectId(id) as any, userId })
    if (!entry) {
      return NextResponse.json({ error: "Time entry not found" }, { status: 404 })
    }

    // Prevent timer actions on deleted entries or leave entries
    if (entry.deletedAt || entry.leave?.isLeave) {
      return NextResponse.json({ error: "Cannot operate timer on this entry" }, { status: 400 })
    }

    const now = timestamp ? new Date(timestamp) : new Date()
    let timer: TimerState = entry.timer || {
      isRunning: false,
      accumulatedSeconds: 0,
      pausedAt: [],
      resumedAt: [],
      idleThresholdMinutes
    }

    // Check for idle time before processing action (except for heartbeat itself)
    let idleDetection: { isIdle: boolean; idleSeconds: number } | null = null
    if (action !== "heartbeat" && action !== "start") {
      idleDetection = detectIdleTime(timer, timer.idleThresholdMinutes || idleThresholdMinutes)
      if (idleDetection.isIdle) {
        // Return idle warning - client should confirm before proceeding
        return NextResponse.json({
          error: "Idle time detected",
          idleWarning: {
            idleSeconds: idleDetection.idleSeconds,
            lastHeartbeat: timer.lastHeartbeatAt,
            message: `No activity detected for ${Math.floor(idleDetection.idleSeconds / 60)} minutes. Please confirm to continue or discard idle time.`
          }
        }, { status: 409 }) // Conflict status to indicate special handling needed
      }
    }

    switch (action) {
      case "start":
        if (timer.isRunning) {
          return NextResponse.json({ error: "Timer already running" }, { status: 400 })
        }
        timer = {
          isRunning: true,
          startedAt: now,
          pausedAt: [],
          resumedAt: [],
          lastHeartbeatAt: now,
          accumulatedSeconds: 0,
          idleThresholdMinutes
        }
        break

      case "pause":
        if (!timer.isRunning) {
          return NextResponse.json({ error: "Timer not running" }, { status: 400 })
        }
        // Accumulate time up to this pause
        timer.accumulatedSeconds = calculateElapsedSeconds(timer)
        timer.isRunning = false
        timer.pausedAt = [...(timer.pausedAt || []), now]
        break

      case "resume":
        if (timer.isRunning) {
          return NextResponse.json({ error: "Timer already running" }, { status: 400 })
        }
        if (!timer.startedAt) {
          return NextResponse.json({ error: "Timer never started" }, { status: 400 })
        }
        timer.isRunning = true
        timer.resumedAt = [...(timer.resumedAt || []), now]
        timer.lastHeartbeatAt = now
        break

      case "stop":
        if (!timer.startedAt) {
          return NextResponse.json({ error: "Timer never started" }, { status: 400 })
        }
        // Final accumulation
        const finalSeconds = calculateElapsedSeconds(timer)
        timer.accumulatedSeconds = finalSeconds
        timer.isRunning = false
        
        // Convert accumulated seconds to time entries
        const hours = Math.floor(finalSeconds / 3600)
        const minutes = Math.floor((finalSeconds % 3600) / 60)
        const totalHours = Math.round((finalSeconds / 3600) * 100) / 100
        
        // Update the time entry with calculated values
        const timeIn = timer.startedAt 
          ? new Date(timer.startedAt).toTimeString().substring(0, 5)
          : entry.timeIn || ""
        const timeOut = now.toTimeString().substring(0, 5)
        
        const updateFields: Partial<TimeEntry> = {
          timeIn,
          timeOut,
          totalHours,
          totalEarnings: Math.round(totalHours * entry.hourlyRate * 100) / 100,
          timer,
          updatedAt: new Date()
        }

        await collection.updateOne(
          { _id: new ObjectId(id) as any, userId },
          { $set: updateFields }
        )

        return NextResponse.json({ 
          success: true, 
          timer, 
          entry: { ...entry, ...updateFields }
        })

      case "heartbeat":
        if (!timer.isRunning) {
          return NextResponse.json({ error: "Timer not running" }, { status: 400 })
        }
        timer.lastHeartbeatAt = now
        break

      default:
        return NextResponse.json({ error: "Unknown action" }, { status: 400 })
    }

    // Update timer state in database
    await collection.updateOne(
      { _id: new ObjectId(id) as any, userId },
      { 
        $set: { 
          timer, 
          updatedAt: new Date() 
        } 
      }
    )

    return NextResponse.json({ 
      success: true, 
      timer,
      elapsedSeconds: calculateElapsedSeconds(timer)
    })

  } catch (error) {
    console.error("Error processing timer action:", error)
    return NextResponse.json({ error: "Failed to process timer action" }, { status: 500 })
  }
}

/**
 * GET /api/time-entries/[id]/timer
 * Get current timer state and elapsed time
 */
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const cookieToken = request.cookies.get("auth-token")?.value
    const userFromToken = cookieToken ? verifyToken(cookieToken) : null
    const userId = userFromToken?._id

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { db } = await connectToDatabase()
    const collection = db.collection<TimeEntry>("timeEntries")

  // Ensure we resolve params (Next.js may provide a promise-like params)
  const resolvedParams = await params as { id: string }
  const id = resolvedParams.id

  const entry = await collection.findOne({ _id: new ObjectId(id) as any, userId })
    if (!entry) {
      return NextResponse.json({ error: "Time entry not found" }, { status: 404 })
    }

    const timer = entry.timer || {
      isRunning: false,
      accumulatedSeconds: 0,
      pausedAt: [],
      resumedAt: []
    }

    const elapsedSeconds = calculateElapsedSeconds(timer)
    const idleDetection = detectIdleTime(timer, timer.idleThresholdMinutes || 10)

    return NextResponse.json({ 
      success: true,
      timer,
      elapsedSeconds,
      idleDetection
    })

  } catch (error) {
    console.error("Error getting timer state:", error)
    return NextResponse.json({ error: "Failed to get timer state" }, { status: 500 })
  }
}
