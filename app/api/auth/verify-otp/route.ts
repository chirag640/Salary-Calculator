import { type NextRequest, NextResponse } from "next/server";
export const runtime = "nodejs";
import { connectToDatabase } from "@/lib/mongodb";
import { generateToken } from "@/lib/auth";
import {
  verifyOTP,
  isOTPExpired,
  isValidOTPFormat,
  OTP_CONFIG,
} from "@/lib/otp";
import { sanitizeEmail } from "@/lib/validation/auth";
import { rateLimit, buildRateLimitKey } from "@/lib/rate-limit";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, otp, returnTo } = body;

    // Validate required fields
    if (!email || !otp) {
      return NextResponse.json(
        { error: "Email and OTP are required" },
        { status: 400 }
      );
    }

    const sanitizedEmail = sanitizeEmail(email);

    // Validate OTP format
    if (!isValidOTPFormat(otp)) {
      return NextResponse.json(
        { error: "Invalid OTP format" },
        { status: 400 }
      );
    }

    // Rate limiting
    const ip =
      request.headers.get("x-forwarded-for") ||
      request.headers.get("x-real-ip") ||
      "unknown";
    const rateLimitKey = buildRateLimitKey(ip, `verify-otp:${sanitizedEmail}`);
    const rateLimitResult = rateLimit(rateLimitKey, {
      windowMs: 15 * 60 * 1000,
      max: 10,
    }); // 10 attempts per 15 minutes

    if (!rateLimitResult.ok) {
      return NextResponse.json(
        {
          error: "Too many verification attempts. Please try again later.",
          retryAfter: rateLimitResult.retryAfter,
        },
        { status: 429 }
      );
    }

    const { db } = await connectToDatabase();

    // Find active OTP
    const otpRecord = await db.collection("auth_otps").findOne({
      email: sanitizedEmail,
      used: false,
      purpose: "registration",
    });

    if (!otpRecord) {
      return NextResponse.json(
        { error: "Invalid or expired verification code" },
        { status: 400 }
      );
    }

    // Check if OTP is expired
    if (isOTPExpired(otpRecord.expiresAt)) {
      await db.collection("auth_otps").deleteOne({ _id: otpRecord._id });
      return NextResponse.json(
        { error: "Verification code has expired. Please request a new one." },
        { status: 400 }
      );
    }

    // Check attempts
    if (otpRecord.attempts >= OTP_CONFIG.MAX_ATTEMPTS) {
      await db.collection("auth_otps").deleteOne({ _id: otpRecord._id });
      return NextResponse.json(
        {
          error:
            "Too many failed attempts. Please request a new verification code.",
        },
        { status: 400 }
      );
    }

    // Verify OTP
    const isValid = await verifyOTP(otp, otpRecord.otpHash);

    if (!isValid) {
      // Increment attempts
      await db
        .collection("auth_otps")
        .updateOne({ _id: otpRecord._id }, { $inc: { attempts: 1 } });

      const remainingAttempts =
        OTP_CONFIG.MAX_ATTEMPTS - (otpRecord.attempts + 1);
      return NextResponse.json(
        {
          error: "Invalid verification code",
          remainingAttempts: Math.max(0, remainingAttempts),
        },
        { status: 400 }
      );
    }

    // OTP is valid - create user
    const { name, hashedPassword } = otpRecord.metadata;

    const result = await db.collection("users").insertOne({
      name,
      email: sanitizedEmail,
      password: hashedPassword,
      isVerified: true,
      profileComplete: false, // Require profile setup
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Mark OTP as used
    await db
      .collection("auth_otps")
      .updateOne(
        { _id: otpRecord._id },
        { $set: { used: true, usedAt: new Date() } }
      );

    // Generate JWT token
    const token = generateToken({
      _id: result.insertedId.toString(),
      email: sanitizedEmail,
      name,
      isVerified: true,
      profileComplete: false,
      pinSetup: false,
    });

    const response = NextResponse.json({
      message: "Registration successful",
      user: {
        _id: result.insertedId.toString(),
        email: sanitizedEmail,
        name,
        isVerified: true,
      },
      returnTo: returnTo || "/",
    });

    // Set auth cookie
    response.cookies.set("auth-token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax", // Allow OAuth redirects
      maxAge: 7 * 24 * 60 * 60, // 7 days
      path: "/",
    });

    return response;
  } catch (error) {
    console.error("OTP verification error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
