import { type NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { verifyToken } from "@/lib/auth";
import { ObjectId } from "mongodb";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    // Get token from Authorization header or cookie
    const authHeader = request.headers.get("authorization");
    const token = authHeader?.startsWith("Bearer ")
      ? authHeader.substring(7)
      : request.cookies.get("auth-token")?.value;

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify token and get user ID
    const decoded = verifyToken(token);

    if (!decoded || !decoded._id) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    const userId = decoded._id;

    // Update user's profileComplete flag
    const { db } = await connectToDatabase();
    const usersCollection = db.collection("users");

    const result = await usersCollection.updateOne(
      { _id: new ObjectId(userId) },
      {
        $set: {
          profileComplete: true,
          updatedAt: new Date(),
        },
      }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Get updated user data
    const updatedUser = await usersCollection.findOne({
      _id: new ObjectId(userId),
    });

    if (!updatedUser) {
      return NextResponse.json(
        { error: "User not found after update" },
        { status: 404 }
      );
    }

    // Generate new token with updated profileComplete flag
    const { generateToken } = await import("@/lib/auth");
    const newToken = generateToken({
      _id: updatedUser._id.toString(),
      email: updatedUser.email,
      name: updatedUser.name,
      profileComplete: true,
      pinSetup: updatedUser.pinHash ? true : false,
    });

    // Return updated data and new token
    const response = NextResponse.json({
      success: true,
      message: "Onboarding completed successfully",
      token: newToken,
      userId: updatedUser._id.toString(),
      email: updatedUser.email,
      name: updatedUser.name,
      profileComplete: true,
      pinSetup: updatedUser.pinHash ? true : false,
    });

    // Set new token in cookie
    response.cookies.set("auth-token", newToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 7 * 24 * 60 * 60, // 7 days
    });

    return response;
  } catch (error) {
    console.error("Complete onboarding error:", error);
    return NextResponse.json(
      { error: "Failed to complete onboarding" },
      { status: 500 }
    );
  }
}
