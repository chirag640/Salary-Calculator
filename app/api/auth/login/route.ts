import { type NextRequest, NextResponse } from "next/server";
export const runtime = "nodejs";
import { connectToDatabase } from "@/lib/mongodb";
import { comparePassword, generateToken } from "@/lib/auth";
import { sanitizeEmail, isValidEmail } from "@/lib/validation/auth";
import { rateLimit, buildRateLimitKey } from "@/lib/rate-limit";
import { handleCors, handleOptions } from "@/lib/cors";

export async function OPTIONS() {
  return handleOptions();
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return handleCors(
        NextResponse.json(
          { error: "Email and password are required" },
          { status: 400 }
        )
      );
    }

    const sanitizedEmail = sanitizeEmail(email);

    // Validate email format
    if (!isValidEmail(sanitizedEmail)) {
      return handleCors(
        NextResponse.json({ error: "Invalid email format" }, { status: 400 })
      );
    }

    // Rate limiting - stricter for password login to prevent brute force
    const ip =
      request.headers.get("x-forwarded-for") ||
      request.headers.get("x-real-ip") ||
      "unknown";
    const rateLimitKey = buildRateLimitKey(ip, `login:${sanitizedEmail}`);
    const rateLimitResult = rateLimit(rateLimitKey, {
      windowMs: 15 * 60 * 1000,
      max: 10, // Increased from 5 to 10
    }); // 10 attempts per 15 minutes

    if (!rateLimitResult.ok) {
      return handleCors(
        NextResponse.json(
          {
            error:
              "Too many login attempts. Please try again later or use the 'Forgot Password' option.",
            retryAfter: rateLimitResult.retryAfter,
          },
          { status: 429 }
        )
      );
    }

    const { db } = await connectToDatabase();
    const user = await db
      .collection("users")
      .findOne({ email: sanitizedEmail });

    // Generic error message to prevent user enumeration
    if (!user) {
      return handleCors(
        NextResponse.json(
          { error: "Invalid email or password" },
          { status: 401 }
        )
      );
    }

    // Check if user has a password (OAuth-only users don't)
    if (!user.password) {
      return handleCors(
        NextResponse.json(
          {
            error:
              "This account uses social login. Please sign in with Google or use 'Sign in with Email' to receive a login code.",
          },
          { status: 401 }
        )
      );
    }

    const isValidPassword = await comparePassword(password, user.password);
    if (!isValidPassword) {
      return handleCors(
        NextResponse.json(
          { error: "Invalid email or password" },
          { status: 401 }
        )
      );
    }

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
      token, // Include token in response body for mobile apps
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
    });

    // Set secure HttpOnly cookie
    response.cookies.set("auth-token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax", // Changed to lax to support OAuth flows
      maxAge: 7 * 24 * 60 * 60, // 7 days
      path: "/",
    });

    return handleCors(response);
  } catch (error) {
    console.error("Login error:", error);
    return handleCors(
      NextResponse.json({ error: "Internal server error" }, { status: 500 })
    );
  }
}
