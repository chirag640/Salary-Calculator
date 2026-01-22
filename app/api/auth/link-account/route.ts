import { type NextRequest, NextResponse } from "next/server";
export const runtime = "nodejs";
import { connectToDatabase } from "@/lib/mongodb";
import { logger } from "@/lib/logger";
import { comparePassword } from "@/lib/auth";
import { generateOTP, hashOTP, getOTPExpiryDate } from "@/lib/otp";
import { sendOTPEmail } from "@/lib/email";
import { sanitizeEmail } from "@/lib/validation/auth";
import { rateLimit, buildRateLimitKey } from "@/lib/rate-limit";

/**
 * Link Google account to existing email account
 * Requires password verification or OTP
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { linkToken, method, password, otp } = body;

    if (!linkToken) {
      return NextResponse.json(
        { error: "Link token is required" },
        { status: 400 },
      );
    }

    // Parse and validate link token
    let linkData: any;
    try {
      linkData = JSON.parse(Buffer.from(linkToken, "base64").toString("utf-8"));

      // Verify token is not expired (10 minutes)
      if (
        !linkData.timestamp ||
        Date.now() - linkData.timestamp > 10 * 60 * 1000
      ) {
        return NextResponse.json(
          {
            error: "Link token has expired. Please sign in with Google again.",
          },
          { status: 400 },
        );
      }
    } catch {
      return NextResponse.json(
        { error: "Invalid link token" },
        { status: 400 },
      );
    }

    const { email, googleId, name } = linkData;
    const sanitizedEmail = sanitizeEmail(email);

    // Rate limiting
    const ip =
      request.headers.get("x-forwarded-for") ||
      request.headers.get("x-real-ip") ||
      "unknown";
    const rateLimitKey = buildRateLimitKey(
      ip,
      `link-account:${sanitizedEmail}`,
    );
    const rateLimitResult = rateLimit(rateLimitKey, {
      windowMs: 15 * 60 * 1000,
      max: 5,
    });

    if (!rateLimitResult.ok) {
      return NextResponse.json(
        {
          error: "Too many linking attempts. Please try again later.",
          retryAfter: rateLimitResult.retryAfter,
        },
        { status: 429 },
      );
    }

    const { db } = await connectToDatabase();

    // Find user by email
    const user = await db
      .collection("users")
      .findOne({ email: sanitizedEmail });

    if (!user) {
      return NextResponse.json({ error: "Account not found" }, { status: 404 });
    }

    // Check if method is specified
    if (!method) {
      // Return available verification methods
      const methods = [];

      if (user.password) {
        methods.push("password");
      }
      methods.push("otp");

      return NextResponse.json({
        message: "Account exists. Please verify to link your Google account.",
        methods,
        email: sanitizedEmail,
      });
    }

    // Verify using selected method
    if (method === "password") {
      if (!password) {
        return NextResponse.json(
          { error: "Password is required" },
          { status: 400 },
        );
      }

      if (!user.password) {
        return NextResponse.json(
          {
            error:
              "This account does not have a password. Please use OTP verification.",
          },
          { status: 400 },
        );
      }

      const isValidPassword = await comparePassword(password, user.password);
      if (!isValidPassword) {
        return NextResponse.json(
          { error: "Invalid password" },
          { status: 401 },
        );
      }

      // Link accounts
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

      return NextResponse.json({
        message: "Google account linked successfully",
        linked: true,
      });
    } else if (method === "otp") {
      if (!otp) {
        // Send OTP
        const otpCode = generateOTP();
        const otpHash = await hashOTP(otpCode);

        // Delete any existing link-account OTPs
        await db.collection("auth_otps").deleteMany({
          email: sanitizedEmail,
          purpose: "link-account",
          used: false,
        });

        // Store OTP
        await db.collection("auth_otps").insertOne({
          email: sanitizedEmail,
          otpHash,
          expiresAt: getOTPExpiryDate(),
          used: false,
          attempts: 0,
          purpose: "link-account",
          metadata: {
            googleId,
            name,
          },
          createdAt: new Date(),
        });

        // Send OTP email
        await sendOTPEmail({
          to: sanitizedEmail,
          name: user.name,
          otp: otpCode,
          purpose: "link-account",
        });

        return NextResponse.json({
          message: "Verification code sent to your email",
          otpSent: true,
        });
      } else {
        // Verify OTP is handled by a separate endpoint
        return NextResponse.json(
          { error: "Use /api/auth/verify-link-otp to verify OTP" },
          { status: 400 },
        );
      }
    } else {
      return NextResponse.json(
        { error: "Invalid verification method" },
        { status: 400 },
      );
    }
  } catch (error) {
    logger.error(
      "Link account error",
      error instanceof Error ? error : { error },
    );
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
