import { type NextRequest, NextResponse } from "next/server"
export const runtime = "nodejs"
import { connectToDatabase } from "@/lib/mongodb"
import { generateOTP, hashOTP, getOTPExpiryDate, OTP_CONFIG } from "@/lib/otp"
import { sendOTPEmail } from "@/lib/email"
import { sanitizeEmail, isValidEmail } from "@/lib/validation/auth"
import { rateLimit, buildRateLimitKey } from "@/lib/rate-limit"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email } = body

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 })
    }

    const sanitizedEmail = sanitizeEmail(email)

    // Validate email format
    if (!isValidEmail(sanitizedEmail)) {
      return NextResponse.json({ error: "Invalid email format" }, { status: 400 })
    }

    // Rate limiting
    const ip = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown"
    const rateLimitKey = buildRateLimitKey(ip, "send-login-otp")
    const rateLimitResult = rateLimit(rateLimitKey, { windowMs: 60 * 1000, max: 3 }) // 3 per minute
    
    if (!rateLimitResult.ok) {
      return NextResponse.json(
        { error: "Too many requests. Please try again later.", retryAfter: rateLimitResult.retryAfter },
        { status: 429 }
      )
    }

    const { db } = await connectToDatabase()

    // Check if user exists
    const user = await db.collection("users").findOne({ email: sanitizedEmail })

    // Don't reveal whether user exists for security
    if (!user) {
      return NextResponse.json({
        message: "If an account exists with this email, you will receive a login code.",
      })
    }

    // Generate OTP
    const otp = generateOTP()
    const otpHash = await hashOTP(otp)

    // Delete any existing unused login OTPs for this email
    await db.collection("auth_otps").deleteMany({
      email: sanitizedEmail,
      purpose: "login",
      used: false,
    })

    // Store OTP in database
    await db.collection("auth_otps").insertOne({
      email: sanitizedEmail,
      otpHash,
      expiresAt: getOTPExpiryDate(),
      used: false,
      attempts: 0,
      purpose: "login",
      metadata: {
        userId: user._id.toString(),
        name: user.name,
      },
      createdAt: new Date(),
    })

    // Send OTP email
    try {
      await sendOTPEmail({
        to: sanitizedEmail,
        name: user.name,
        otp,
        purpose: "login",
        expiryMinutes: OTP_CONFIG.EXPIRY_MINUTES,
      })
    } catch (emailError) {
      console.error("Failed to send OTP email:", emailError)
      // Clean up OTP
      await db.collection("auth_otps").deleteOne({ email: sanitizedEmail, purpose: "login", used: false })
      return NextResponse.json({ error: "Failed to send login code. Please try again." }, { status: 500 })
    }

    // Mask email for response
    const maskedEmail = sanitizedEmail.replace(/(.{2})(.*)(@.*)/, "$1***$3")

    return NextResponse.json({
      message: "Login code sent",
      email: maskedEmail,
      expiresIn: OTP_CONFIG.EXPIRY_MINUTES * 60, // seconds
    })
  } catch (error) {
    console.error("Send login OTP error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
