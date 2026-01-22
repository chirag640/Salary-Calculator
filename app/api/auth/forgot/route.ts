import { NextResponse, type NextRequest } from "next/server";
export const runtime = "nodejs";
import crypto from "crypto";
import { connectToDatabase } from "@/lib/mongodb";
import { sendPasswordResetEmail } from "@/lib/email";
import { buildRateLimitKey, rateLimit } from "@/lib/rate-limit";
import { forgotPasswordSchema } from "@/lib/validation/schemas";
import { logger } from "@/lib/logger";

// POST /api/auth/forgot { email }
export async function POST(request: NextRequest) {
  try {
    const payload = await request.json().catch(() => ({}));
    const parsed = forgotPasswordSchema.safeParse(payload);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid email" }, { status: 400 });
    }
    const { email } = parsed.data;

    // Attempt to derive caller IP (best-effort; behind proxies x-forwarded-for may contain list)
    const fwd = request.headers.get("x-forwarded-for");
    const ip = fwd
      ? fwd.split(",")[0].trim()
      : request.headers.get("x-real-ip") || "unknown";
    const key = buildRateLimitKey(ip, "forgot");
    const rl = rateLimit(key, { windowMs: 15 * 60 * 1000, max: 5 }); // 5 per 15 min per IP
    if (!rl.ok) {
      return NextResponse.json(
        { error: "Too many requests", retryAfter: rl.retryAfter },
        { status: 429 },
      );
    }

    const { db } = await connectToDatabase();
    const user = await db.collection("users").findOne({ email });

    // Always respond with success message to prevent email enumeration
    const genericResponse = NextResponse.json({
      message: "If that account exists, a reset email has been sent.",
    });

    if (!user) {
      return genericResponse;
    }

    // Generate raw token & hash it for storage
    const rawToken = crypto.randomBytes(32).toString("hex");
    const hashed = crypto.createHash("sha256").update(rawToken).digest("hex");
    const expires = new Date(Date.now() + 15 * 60 * 1000); // 15 min

    await db
      .collection("users")
      .updateOne(
        { _id: user._id },
        {
          $set: {
            passwordResetToken: hashed,
            passwordResetExpires: expires,
            updatedAt: new Date(),
          },
        },
      );

    // Fire & forget email (but await for determinism); swallow errors silently
    try {
      await sendPasswordResetEmail({
        to: email,
        name: user.name,
        token: rawToken,
      });
    } catch (e) {
      logger.error(
        "Failed sending reset email",
        e instanceof Error ? e : { error: e },
      );
    }

    return genericResponse;
  } catch (error) {
    logger.error(
      "Forgot password error",
      error instanceof Error ? error : { error },
    );
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
