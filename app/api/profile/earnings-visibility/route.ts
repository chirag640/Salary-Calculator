import { type NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { verifyToken } from "@/lib/auth";
import { validateCsrf } from "@/lib/csrf";
import { rateLimit, buildRateLimitKey } from "@/lib/rate-limit";
import { ObjectId } from "mongodb";

export const runtime = "nodejs";

// GET: Get current earnings visibility status
export async function GET(request: NextRequest) {
  try {
    const cookieToken = request.cookies.get("auth-token")?.value;
    const userFromToken = cookieToken ? verifyToken(cookieToken) : null;
    const userId = userFromToken?._id;

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { db } = await connectToDatabase();
    const user = await db.collection("users").findOne({ _id: new ObjectId(userId) });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({
      showEarnings: user.showEarnings ?? false, // Default to false for privacy
    });
  } catch (error) {
    console.error("Error fetching earnings visibility:", error);
    return NextResponse.json(
      { error: "Failed to fetch earnings visibility" },
      { status: 500 }
    );
  }
}

// PUT: Toggle earnings visibility
export async function PUT(request: NextRequest) {
  try {
    const cookieToken = request.cookies.get("auth-token")?.value;
    const userFromToken = cookieToken ? verifyToken(cookieToken) : null;
    const userId = userFromToken?._id;

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!validateCsrf(request)) {
      return NextResponse.json({ error: "Invalid CSRF token" }, { status: 403 });
    }

    // Rate limiting
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0] || "unknown";
    const rl = rateLimit(buildRateLimitKey(ip, "earnings-visibility"), {
      windowMs: 60_000,
      max: 10,
    });
    if (!rl.ok) {
      return NextResponse.json(
        { error: "Rate limit exceeded" },
        { status: 429 }
      );
    }

    const body = await request.json();
    const { showEarnings } = body;

    if (typeof showEarnings !== "boolean") {
      return NextResponse.json(
        { error: "showEarnings must be a boolean" },
        { status: 400 }
      );
    }

    const { db } = await connectToDatabase();
    await db.collection("users").updateOne(
      { _id: new ObjectId(userId) },
      {
        $set: {
          showEarnings,
          updatedAt: new Date(),
        },
      }
    );

    return NextResponse.json({
      showEarnings,
      message: showEarnings
        ? "Earnings are now visible"
        : "Earnings are now hidden",
    });
  } catch (error) {
    console.error("Error updating earnings visibility:", error);
    return NextResponse.json(
      { error: "Failed to update earnings visibility" },
      { status: 500 }
    );
  }
}
