import { type NextRequest, NextResponse } from "next/server"
export const runtime = "nodejs"
import { connectToDatabase } from "@/lib/mongodb"
import { hashPassword } from "@/lib/auth"
import { generateOTP, hashOTP, getOTPExpiryDate, OTP_CONFIG } from "@/lib/otp"
import { sendOTPEmail } from "@/lib/email"
import { isValidEmail, isValidPassword, isValidName, sanitizeEmail, sanitizeName } from "@/lib/validation/auth"
import { rateLimit, buildRateLimitKey } from "@/lib/rate-limit"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, email, password } = body

    // Validate required fields
    if (!name || !email || !password) {
      return NextResponse.json({ error: "Name, email, and password are required" }, { status: 400 })
    }

    // Sanitize inputs
    const sanitizedEmail = sanitizeEmail(email)
    const sanitizedName = sanitizeName(name)

    // Validate email format
    if (!isValidEmail(sanitizedEmail)) {
      return NextResponse.json({ error: "Invalid email format" }, { status: 400 })
    }

    // Validate name
    if (!isValidName(sanitizedName)) {
      return NextResponse.json({ error: "Name must be 1-100 characters and contain only letters, spaces, hyphens, and apostrophes" }, { status: 400 })
    }

    // Validate password strength
    const passwordValidation = isValidPassword(password)
    if (!passwordValidation.valid) {
      return NextResponse.json({ 
        error: "Password does not meet requirements", 
        details: passwordValidation.errors 
      }, { status: 400 })
    }

    // Rate limiting
    const ip = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown"
    const rateLimitKey = buildRateLimitKey(ip, "register")
    const rateLimitResult = rateLimit(rateLimitKey, { windowMs: 60 * 60 * 1000, max: 5 }) // 5 per hour
    
    if (!rateLimitResult.ok) {
      return NextResponse.json(
        { error: "Too many registration attempts. Please try again later.", retryAfter: rateLimitResult.retryAfter },
        { status: 429 }
      )
    }

    const { db } = await connectToDatabase()

    // Check if user already exists
    const existingUser = await db.collection("users").findOne({ email: sanitizedEmail })
    if (existingUser) {
      // Don't reveal that user exists for security
      return NextResponse.json({ error: "If this email is not already registered, you will receive a verification code." }, { status: 200 })
    }

    // Hash password for later use (stored temporarily with OTP)
    const hashedPassword = await hashPassword(password)

    // Generate OTP
    const otp = generateOTP()
    const otpHash = await hashOTP(otp)

    // Store OTP in database
    await db.collection("auth_otps").insertOne({
      email: sanitizedEmail,
      otpHash,
      expiresAt: getOTPExpiryDate(),
      used: false,
      attempts: 0,
      purpose: "registration",
      metadata: {
        name: sanitizedName,
        hashedPassword,
      },
      createdAt: new Date(),
    })

    // Send OTP email
    try {
      await sendOTPEmail({
        to: sanitizedEmail,
        name: sanitizedName,
        otp,
        purpose: "registration",
        expiryMinutes: OTP_CONFIG.EXPIRY_MINUTES,
      })
    } catch (emailError) {
      console.error("Failed to send OTP email:", emailError)
      // Clean up OTP
      await db.collection("auth_otps").deleteOne({ email: sanitizedEmail, purpose: "registration", used: false })
      return NextResponse.json({ error: "Failed to send verification email. Please try again." }, { status: 500 })
    }

    // Mask email for response
    const maskedEmail = sanitizedEmail.replace(/(.{2})(.*)(@.*)/, "$1***$3")

    return NextResponse.json({
      message: "Verification code sent",
      email: maskedEmail,
      expiresIn: OTP_CONFIG.EXPIRY_MINUTES * 60, // seconds
    })
  } catch (error) {
    console.error("Registration error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
