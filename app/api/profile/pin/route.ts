import { type NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { verifyToken, hashPin, comparePin } from "@/lib/auth";
import { validateCsrf } from "@/lib/csrf";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const cookieToken = request.cookies.get("auth-token")?.value;
    const userFromToken = cookieToken ? verifyToken(cookieToken) : null;
    const userId = userFromToken?._id;
    if (!userId)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    if (!validateCsrf(request)) {
      return NextResponse.json(
        { error: "Invalid CSRF token" },
        { status: 403 },
      );
    }

    const body = await request.json();
    const { currentPin, newPin } = body || {};

    logger.debug("PIN API received newPin", {
      length: newPin?.length,
      type: typeof newPin,
    });

    if (!newPin || typeof newPin !== "string" || newPin.length < 4) {
      logger.debug("PIN API validation failed - newPin invalid");
      return NextResponse.json(
        { error: "New PIN must be at least 4 digits" },
        { status: 400 },
      );
    }

    const { db } = await connectToDatabase();
    const user = await db
      .collection("users")
      .findOne({ _id: new (require("mongodb").ObjectId)(userId) });
    if (!user)
      return NextResponse.json({ error: "User not found" }, { status: 404 });

    // If user already has a pin, require currentPin for verification when changing
    if (user.pinHash && user.pinHash.length > 0) {
      if (!currentPin)
        return NextResponse.json(
          { error: "Current PIN required" },
          { status: 400 },
        );
      const ok = await comparePin(currentPin, user.pinHash);
      if (!ok)
        return NextResponse.json(
          { error: "Current PIN incorrect" },
          { status: 401 },
        );
    }

    const hashed = await hashPin(newPin);
    await db
      .collection("users")
      .updateOne(
        { _id: user._id },
        { $set: { pinHash: hashed, pinFailedAttempts: 0, pinLockUntil: null } },
      );

    // Regenerate auth token with pinSetup flag set to true
    const updatedUser = await db.collection("users").findOne({ _id: user._id });
    if (updatedUser) {
      const { generateToken } = await import("@/lib/auth");
      const newToken = generateToken({
        _id: userId,
        email: updatedUser.email,
        name: updatedUser.name,
        profileComplete: updatedUser.profileComplete ?? false,
        pinSetup: true, // PIN is now set
      });

      const response = NextResponse.json({ success: true });
      response.cookies.set("auth-token", newToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 7 * 24 * 60 * 60, // 7 days
        path: "/",
      });
      return response;
    }

    return NextResponse.json({ success: true });
  } catch (e) {
    logger.error(
      "POST /api/profile/pin error",
      e instanceof Error ? e : { error: e },
    );
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    // remove PIN
    const cookieToken = request.cookies.get("auth-token")?.value;
    const userFromToken = cookieToken ? verifyToken(cookieToken) : null;
    const userId = userFromToken?._id;
    if (!userId)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    if (!validateCsrf(request)) {
      return NextResponse.json(
        { error: "Invalid CSRF token" },
        { status: 403 },
      );
    }

    const { db } = await connectToDatabase();
    const user = await db
      .collection("users")
      .findOne({ _id: new (require("mongodb").ObjectId)(userId) });
    if (!user)
      return NextResponse.json({ error: "User not found" }, { status: 404 });

    await db
      .collection("users")
      .updateOne(
        { _id: user._id },
        { $unset: { pinHash: "", pinFailedAttempts: "", pinLockUntil: "" } },
      );
    return NextResponse.json({ success: true });
  } catch (e) {
    logger.error(
      "DELETE /api/profile/pin error",
      e instanceof Error ? e : { error: e },
    );
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
