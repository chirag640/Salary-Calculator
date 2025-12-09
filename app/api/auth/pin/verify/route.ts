import { type NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { verifyToken, comparePin, generateRevealToken } from "@/lib/auth";
import { rateLimit, buildRateLimitKey } from "@/lib/rate-limit";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { pin } = body || {};
    if (!pin || typeof pin !== "string" || pin.length < 4) {
      return NextResponse.json({ message: "Invalid PIN" }, { status: 400 });
    }

    // Authenticate user from Bearer token or auth-token cookie
    const authHeader = request.headers.get("authorization");
    let token: string | undefined;

    if (authHeader && authHeader.startsWith("Bearer ")) {
      token = authHeader.substring(7);
    } else {
      token = request.cookies.get("auth-token")?.value;
    }

    const userFromToken = token ? verifyToken(token) : null;
    const userId = userFromToken?._id;
    if (!userId)
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

    // rate limiting per user + IP
    const ip =
      request.headers.get("x-forwarded-for") ||
      request.headers.get("x-real-ip") ||
      "unknown";
    const key = buildRateLimitKey(ip, `pin-verify:${userId}`);
    const rl = rateLimit(key, { windowMs: 15 * 60 * 1000, max: 6 });
    if (!rl.ok) {
      return NextResponse.json(
        { message: "Too many attempts, try later", retryAfter: rl.retryAfter },
        { status: 429 }
      );
    }

    const { db } = await connectToDatabase();
    const user = await db
      .collection("users")
      .findOne({ _id: new (require("mongodb").ObjectId)(userId) });
    if (!user)
      return NextResponse.json({ message: "User not found" }, { status: 404 });

    if (!user.pinHash) {
      return NextResponse.json({ message: "No PIN set" }, { status: 400 });
    }

    const ok = await comparePin(pin, user.pinHash);
    if (!ok) {
      // Increment failed attempts counter in DB (best-effort)
      try {
        await db
          .collection("users")
          .updateOne({ _id: user._id }, { $inc: { pinFailedAttempts: 1 } });
      } catch (e) {
        // ignore
      }
      return NextResponse.json({ message: "Incorrect PIN" }, { status: 401 });
    }

    // success: reset failed attempts, set a short-lived reveal token cookie
    try {
      await db
        .collection("users")
        .updateOne({ _id: user._id }, { $set: { pinFailedAttempts: 0 } });
    } catch (e) {
      // ignore
    }

    const revealToken = generateRevealToken(userId, 300); // default 5 minutes
    const res = NextResponse.json({ success: true, revealToken });
    res.cookies.set("reveal-token", revealToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 300,
    });
    return res;
  } catch (e) {
    console.error("POST /api/auth/pin/verify error", e);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
