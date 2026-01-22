import { type NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { verifyToken, verifyRevealToken } from "@/lib/auth";
import { getEffectiveHourlyRateForDate } from "@/lib/salary";
import { validateCsrf } from "@/lib/csrf";
import { rateLimit, buildRateLimitKey } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const cookieToken = request.cookies.get("auth-token")?.value;
    const userFromToken = cookieToken ? verifyToken(cookieToken) : null;
    const userId = userFromToken?._id;
    if (!userId)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0] || "unknown";
    const rl = rateLimit(buildRateLimitKey(ip, "hourly-rate"), {
      windowMs: 30_000,
      max: 30,
    });
    if (!rl.ok)
      return NextResponse.json(
        { error: "Rate limit exceeded" },
        { status: 429 },
      );
    const date = searchParams.get("date");
    if (!date)
      return NextResponse.json(
        { error: "date is required (YYYY-MM-DD)" },
        { status: 400 },
      );

    const { db } = await connectToDatabase();
    const eff = await getEffectiveHourlyRateForDate(db, userId, date);

    // Return the actual hourly rate for functional use (time entry calculations)
    // The reveal token is only used for display masking in the UI, not for blocking API access
    return NextResponse.json({
      date,
      hourlyRate: eff.hourlyRate,
      working: eff.working,
      overtime: eff.overtime,
    });
  } catch (e) {
    logger.error(
      "GET /api/profile/hourly-rate error",
      e instanceof Error ? e : { error: e },
    );
    return NextResponse.json(
      { error: "Failed to get hourly rate" },
      { status: 500 },
    );
  }
}
