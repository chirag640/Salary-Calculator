import { type NextRequest, NextResponse } from "next/server";
export const runtime = "nodejs";
import { connectToDatabase } from "@/lib/mongodb";
import { logger } from "@/lib/logger";
import { generateOTP, hashOTP, getOTPExpiryDate, OTP_CONFIG } from "@/lib/otp";
import { sendOTPEmail } from "@/lib/email";
import { sanitizeEmail } from "@/lib/validation/auth";
import { rateLimit, buildRateLimitKey } from "@/lib/rate-limit";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, purpose = "registration" } = body;

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    const sanitizedEmail = sanitizeEmail(email);

    // Strict rate limiting for resends
    const ip =
      request.headers.get("x-forwarded-for") ||
      request.headers.get("x-real-ip") ||
      "unknown";

    // 1 resend per minute per email
    const emailRateLimitKey = buildRateLimitKey(sanitizedEmail, "resend-otp");
    const emailRateLimit = rateLimit(emailRateLimitKey, {
      windowMs: OTP_CONFIG.RESEND_COOLDOWN_SECONDS * 1000,
      max: 1,
    });

    if (!emailRateLimit.ok) {
      return NextResponse.json(
        {
          error: `Please wait ${emailRateLimit.retryAfter} seconds before requesting another code`,
          retryAfter: emailRateLimit.retryAfter,
        },
        { status: 429 },
      );
    }

    // 5 resends per day per IP
    const ipRateLimitKey = buildRateLimitKey(ip, "resend-otp-ip");
    const ipRateLimit = rateLimit(ipRateLimitKey, {
      windowMs: 24 * 60 * 60 * 1000,
      max: OTP_CONFIG.MAX_RESENDS_PER_DAY,
    });

    if (!ipRateLimit.ok) {
      return NextResponse.json(
        { error: "Daily resend limit reached. Please try again tomorrow." },
        { status: 429 },
      );
    }

    const { db } = await connectToDatabase();

    // Find existing OTP record
    const existingOtp = await db.collection("auth_otps").findOne({
      email: sanitizedEmail,
      used: false,
      purpose,
    });

    if (!existingOtp) {
      // Don't reveal whether email exists
      return NextResponse.json(
        { error: "No pending verification found for this email" },
        { status: 400 },
      );
    }

    // Check resend count for this session
    const resendCount = existingOtp.resendCount || 0;
    if (resendCount >= 3) {
      return NextResponse.json(
        { error: "Maximum resend attempts reached. Please start over." },
        { status: 400 },
      );
    }

    // Generate new OTP
    const otp = generateOTP();
    const otpHash = await hashOTP(otp);

    // Update OTP record
    await db.collection("auth_otps").updateOne(
      { _id: existingOtp._id },
      {
        $set: {
          otpHash,
          expiresAt: getOTPExpiryDate(),
          attempts: 0, // Reset attempts on resend
          updatedAt: new Date(),
        },
        $inc: { resendCount: 1 },
      },
    );

    // Send new OTP email
    try {
      await sendOTPEmail({
        to: sanitizedEmail,
        name: existingOtp.metadata?.name,
        otp,
        purpose: purpose as "registration" | "login" | "link-account",
        expiryMinutes: OTP_CONFIG.EXPIRY_MINUTES,
      });
    } catch (emailError) {
      logger.error(
        "Failed to send OTP email",
        emailError instanceof Error ? emailError : { error: emailError },
      );
      return NextResponse.json(
        { error: "Failed to send verification email. Please try again." },
        { status: 500 },
      );
    }

    return NextResponse.json({
      message: "New verification code sent",
      expiresIn: OTP_CONFIG.EXPIRY_MINUTES * 60, // seconds
      remainingResends: 3 - (resendCount + 1),
    });
  } catch (error) {
    logger.error(
      "OTP resend error",
      error instanceof Error ? error : { error },
    );
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
