import { type NextRequest, NextResponse } from "next/server";
export const runtime = "nodejs";
import { connectToDatabase } from "@/lib/mongodb";
import { generateToken } from "@/lib/auth";
import { logger } from "@/lib/logger";
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
        { status: 400 },
      );
    }

    const sanitizedEmail = sanitizeEmail(email);

    // Validate OTP format
    if (!isValidOTPFormat(otp)) {
      return NextResponse.json(
        { error: "Invalid OTP format" },
        { status: 400 },
      );
    }

    // Rate limiting
    const ip =
      request.headers.get("x-forwarded-for") ||
      request.headers.get("x-real-ip") ||
      "unknown";
    const rateLimitKey = buildRateLimitKey(
      ip,
      `verify-login-otp:${sanitizedEmail}`,
    );
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
        { status: 429 },
      );
    }

    const { db } = await connectToDatabase();

    // Find active OTP
    const otpRecord = await db.collection("auth_otps").findOne({
      email: sanitizedEmail,
      used: false,
      purpose: "login",
    });

    if (!otpRecord) {
      return NextResponse.json(
        { error: "Invalid or expired login code" },
        { status: 400 },
      );
    }

    // Check if OTP is expired
    if (isOTPExpired(otpRecord.expiresAt)) {
      await db.collection("auth_otps").deleteOne({ _id: otpRecord._id });
      return NextResponse.json(
        { error: "Login code has expired. Please request a new one." },
        { status: 400 },
      );
    }

    // Check attempts
    if (otpRecord.attempts >= OTP_CONFIG.MAX_ATTEMPTS) {
      await db.collection("auth_otps").deleteOne({ _id: otpRecord._id });
      return NextResponse.json(
        { error: "Too many failed attempts. Please request a new login code." },
        { status: 400 },
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
          error: "Invalid login code",
          remainingAttempts: Math.max(0, remainingAttempts),
        },
        { status: 400 },
      );
    }

    // OTP is valid - get user
    const user = await db
      .collection("users")
      .findOne({ email: sanitizedEmail });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Mark OTP as used
    await db
      .collection("auth_otps")
      .updateOne(
        { _id: otpRecord._id },
        { $set: { used: true, usedAt: new Date() } },
      );

    // Generate JWT token
    const token = generateToken({
      _id: user._id.toString(),
      email: user.email,
      name: user.name,
      isVerified: user.isVerified,
      profileComplete: user.profileComplete ?? false,
      pinSetup: !!user.pinHash,
    });

    const response = NextResponse.json({
      message: "Login successful",
      token, // Include token for mobile apps
      userId: user._id.toString(),
      email: user.email,
      name: user.name,
      profileComplete: user.profileComplete ?? false,
      pinSetup: !!user.pinHash,
      user: {
        _id: user._id.toString(),
        email: user.email,
        name: user.name,
        isVerified: user.isVerified,
      },
      returnTo: returnTo || "/",
    });

    // Set auth cookie
    response.cookies.set("auth-token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60, // 7 days
      path: "/",
    });

    return response;
  } catch (error) {
    logger.error(
      "Login OTP verification error",
      error instanceof Error ? error : { error },
    );
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
