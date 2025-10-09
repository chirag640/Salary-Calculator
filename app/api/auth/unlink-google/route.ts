import { type NextRequest, NextResponse } from "next/server"
export const runtime = "nodejs"
import { connectToDatabase } from "@/lib/mongodb"
import { getUserFromSession, comparePassword } from "@/lib/auth"
import { rateLimit, buildRateLimitKey } from "@/lib/rate-limit"

/**
 * Unlink Google account from user account
 * Requires password verification
 */
export async function POST(request: NextRequest) {
  try {
    // Get authenticated user
    const user = getUserFromSession(request)
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { password } = body

    // Rate limiting
    const ip = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown"
    const rateLimitKey = buildRateLimitKey(ip, `unlink-account:${user.email}`)
    const rateLimitResult = rateLimit(rateLimitKey, { windowMs: 15 * 60 * 1000, max: 5 })
    
    if (!rateLimitResult.ok) {
      return NextResponse.json(
        { error: "Too many unlink attempts. Please try again later.", retryAfter: rateLimitResult.retryAfter },
        { status: 429 }
      )
    }

    const { db } = await connectToDatabase()

    // Get full user details
    const fullUser = await db.collection("users").findOne({ email: user.email })

    if (!fullUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    // Check if user has a password (can't unlink if it's the only auth method)
    if (!fullUser.password) {
      return NextResponse.json({ 
        error: "Cannot unlink Google account. Please set a password first to ensure you can still access your account." 
      }, { status: 400 })
    }

    // Verify password
    if (!password) {
      return NextResponse.json({ error: "Password is required to unlink account" }, { status: 400 })
    }

    const isValidPassword = await comparePassword(password, fullUser.password)
    if (!isValidPassword) {
      return NextResponse.json({ error: "Invalid password" }, { status: 401 })
    }

    // Check if Google account is actually linked
    if (!fullUser.googleId) {
      return NextResponse.json({ error: "No Google account is linked to this account" }, { status: 400 })
    }

    // Unlink Google account
    await db.collection("users").updateOne(
      { _id: fullUser._id },
      {
        $unset: { googleId: "" },
        $set: { updatedAt: new Date() },
      }
    )

    // Remove OAuth integration
    await db.collection("oauth_integrations").deleteMany({
      userId: fullUser._id.toString(),
      provider: "google",
    })

    return NextResponse.json({
      message: "Google account unlinked successfully",
      unlinked: true,
    })
  } catch (error) {
    console.error("Unlink account error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
