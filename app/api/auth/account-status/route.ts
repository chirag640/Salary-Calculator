import { type NextRequest, NextResponse } from "next/server";
export const runtime = "nodejs";
import { connectToDatabase } from "@/lib/mongodb";
import { getUserFromSession } from "@/lib/auth";
import { logger } from "@/lib/logger";

/**
 * Get user's authentication status and linked accounts
 */
export async function GET(request: NextRequest) {
  try {
    // Get authenticated user
    const user = getUserFromSession(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { db } = await connectToDatabase();

    // Get full user details
    const fullUser = await db
      .collection("users")
      .findOne({ email: user.email });

    if (!fullUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Get OAuth integrations
    const oauthIntegrations = await db
      .collection("oauth_integrations")
      .find({ userId: fullUser._id.toString() })
      .project({ accessToken: 0, refreshToken: 0 }) // Exclude sensitive tokens
      .toArray();

    // Build response
    const authStatus = {
      user: {
        _id: fullUser._id.toString(),
        email: fullUser.email,
        name: fullUser.name,
        isVerified: fullUser.isVerified || false,
      },
      authMethods: {
        password: !!fullUser.password,
        google: !!fullUser.googleId,
      },
      linkedAccounts: oauthIntegrations.map((integration) => ({
        provider: integration.provider,
        email: integration.email,
        linkedAt: integration.createdAt,
      })),
    };

    return NextResponse.json(authStatus);
  } catch (error) {
    logger.error(
      "Get account status error",
      error instanceof Error ? error : { error },
    );
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
