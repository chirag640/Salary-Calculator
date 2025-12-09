import { type NextRequest, NextResponse } from "next/server";
export const runtime = "nodejs";
import { connectToDatabase } from "@/lib/mongodb";

/**
 * Admin endpoint to clean up test users and pending OTPs
 * Only use in development!
 */
export async function POST(request: NextRequest) {
  try {
    // Simple auth check (only for development)
    const authHeader = request.headers.get("authorization");
    if (authHeader !== "Bearer dev-cleanup-token") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { db } = await connectToDatabase();

    // Delete unverified users
    const usersResult = await db.collection("users").deleteMany({
      isVerified: false,
    });

    // Delete all pending OTPs
    const otpsResult = await db.collection("auth_otps").deleteMany({
      used: false,
    });

    // Optional: Delete specific test email
    const testEmail = "collegework1910@gmail.com";
    const testUserResult = await db.collection("users").deleteMany({
      email: testEmail,
    });

    const testOtpResult = await db.collection("auth_otps").deleteMany({
      email: testEmail,
    });

    return NextResponse.json({
      message: "Cleanup completed",
      deleted: {
        unverifiedUsers: usersResult.deletedCount,
        pendingOTPs: otpsResult.deletedCount,
        testUsers: testUserResult.deletedCount,
        testOTPs: testOtpResult.deletedCount,
      },
    });
  } catch (error) {
    console.error("Cleanup error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
