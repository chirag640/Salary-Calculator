import { type NextRequest, NextResponse } from "next/server";
export const runtime = "nodejs";
import { connectToDatabase } from "@/lib/mongodb";
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
    const { email, otp } = body;

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
      `verify-link-otp:${sanitizedEmail}`,
    );
    const rateLimitResult = rateLimit(rateLimitKey, {
      windowMs: 15 * 60 * 1000,
      max: 10,
    });

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
      purpose: "link-account",
    });

    if (!otpRecord) {
      return NextResponse.json(
        { error: "Invalid or expired verification code" },
        { status: 400 },
      );
    }

    // Check if OTP is expired
    if (isOTPExpired(otpRecord.expiresAt)) {
      await db.collection("auth_otps").deleteOne({ _id: otpRecord._id });
      return NextResponse.json(
        { error: "Verification code has expired. Please request a new one." },
        { status: 400 },
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
          error: "Invalid verification code",
          remainingAttempts: Math.max(0, remainingAttempts),
        },
        { status: 400 },
      );
    }

    // OTP is valid - link Google account
    const { googleId } = otpRecord.metadata;

    const user = await db
      .collection("users")
      .findOne({ email: sanitizedEmail });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Update user with Google ID
    await db.collection("users").updateOne(
      { _id: user._id },
      {
        $set: {
          googleId,
          isVerified: true,
          updatedAt: new Date(),
        },
      },
    );

    // Mark OTP as used
    await db
      .collection("auth_otps")
      .updateOne(
        { _id: otpRecord._id },
        { $set: { used: true, usedAt: new Date() } },
      );

    return NextResponse.json({
      message: "Google account linked successfully",
      linked: true,
    });
  } catch (error) {
    logger.error(
      "Verify link OTP error",
      error instanceof Error ? error : { error },
    );
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
