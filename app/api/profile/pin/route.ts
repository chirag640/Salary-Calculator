import { type NextRequest, NextResponse } from "next/server"
import { connectToDatabase } from "@/lib/mongodb"
import { verifyToken, hashPin, comparePin } from "@/lib/auth"
import { validateCsrf } from "@/lib/csrf"

export const runtime = "nodejs"

export async function POST(request: NextRequest) {
  try {
    const cookieToken = request.cookies.get("auth-token")?.value
    const userFromToken = cookieToken ? verifyToken(cookieToken) : null
    const userId = userFromToken?._id
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    if (!validateCsrf(request)) {
      return NextResponse.json({ error: "Invalid CSRF token" }, { status: 403 })
    }

    const body = await request.json()
    const { currentPin, newPin } = body || {}
    if (!newPin || typeof newPin !== "string" || newPin.length < 4) {
      return NextResponse.json({ error: "New PIN must be at least 4 digits" }, { status: 400 })
    }

    const { db } = await connectToDatabase()
    const user = await db.collection("users").findOne({ _id: new (require("mongodb").ObjectId)(userId) })
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 })

    // If user already has a pin, require currentPin for verification when changing
    if (user.pinHash && user.pinHash.length > 0) {
      if (!currentPin) return NextResponse.json({ error: "Current PIN required" }, { status: 400 })
      const ok = await comparePin(currentPin, user.pinHash)
      if (!ok) return NextResponse.json({ error: "Current PIN incorrect" }, { status: 401 })
    }

    const hashed = await hashPin(newPin)
    await db.collection("users").updateOne({ _id: user._id }, { $set: { pinHash: hashed, pinFailedAttempts: 0, pinLockUntil: null } })

    return NextResponse.json({ success: true })
  } catch (e) {
    console.error("POST /api/profile/pin error", e)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    // remove PIN
    const cookieToken = request.cookies.get("auth-token")?.value
    const userFromToken = cookieToken ? verifyToken(cookieToken) : null
    const userId = userFromToken?._id
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    if (!validateCsrf(request)) {
      return NextResponse.json({ error: "Invalid CSRF token" }, { status: 403 })
    }

    const { db } = await connectToDatabase()
    const user = await db.collection("users").findOne({ _id: new (require("mongodb").ObjectId)(userId) })
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 })

    await db.collection("users").updateOne({ _id: user._id }, { $unset: { pinHash: "", pinFailedAttempts: "", pinLockUntil: "" } })
    return NextResponse.json({ success: true })
  } catch (e) {
    console.error("DELETE /api/profile/pin error", e)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
