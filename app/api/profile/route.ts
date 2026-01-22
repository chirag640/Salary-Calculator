import { type NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { verifyToken, verifyRevealToken } from "@/lib/auth";
import { validateCsrf } from "@/lib/csrf";
import type { UpdateProfileRequest, ProfileResponse } from "@/lib/types";
import { expandPaymentConfig, compactPaymentConfig } from "@/lib/types";
import { safeDecrypt, encryptNumber } from "@/lib/encryption";
import { decryptSalaryRecords } from "@/lib/db-encryption-middleware";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    // Support both Bearer token and cookie authentication
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
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // Check reveal token cookie — only show raw salary/hourly values if the reveal token
    // is valid and belongs to the same user.
    const revealCookie = request.cookies.get("reveal-token")?.value;
    const revealValid = revealCookie ? verifyRevealToken(revealCookie) : null;
    const allowReveal = revealValid && revealValid.userId === userId;

    const { db } = await connectToDatabase();
    const user = await db
      .collection("users")
      .findOne({ _id: new (require("mongodb").ObjectId)(userId) });
    if (!user)
      return NextResponse.json({ error: "User not found" }, { status: 404 });

    // Decrypt salary history (backward compatible with unencrypted data)
    const decryptedSalaryHistory = user.salaryHistory
      ? decryptSalaryRecords(user.salaryHistory)
      : [];

    const salaryHistory = decryptedSalaryHistory.map((rec: any) => ({
      ...rec,
      // redact amount unless reveal allowed
      amount: allowReveal ? rec.amount : null,
    }));

    // Compute current salary from the latest entry in salary history
    let currentSalary:
      | { amount: number; salaryType: "monthly" | "annual" }
      | undefined;
    if (decryptedSalaryHistory.length > 0) {
      const sortedHistory = [...decryptedSalaryHistory].sort((a: any, b: any) =>
        (a.effectiveFrom || "").localeCompare(b.effectiveFrom || ""),
      );
      const latest = sortedHistory[sortedHistory.length - 1];
      if (latest && latest.amount != null) {
        currentSalary = {
          amount: latest.amount,
          salaryType: latest.salaryType || "monthly",
        };
      }
    }

    // Decrypt defaultHourlyRate (backward compatible)
    const decryptedHourlyRate = user.defaultHourlyRate
      ? safeDecrypt(user.defaultHourlyRate)
      : undefined;

    const resp: ProfileResponse = {
      _id: user._id.toString(),
      email: user.email,
      name: user.name,
      contact: user.contact,
      workingConfig: user.workingConfig,
      overtime: user.overtime,
      paymentConfig: expandPaymentConfig(user.paymentConfig), // Expand to full config with defaults
      salaryHistory,
      currentSalary, // Include current salary from latest history entry
      defaultHourlyRate:
        allowReveal && decryptedHourlyRate !== undefined
          ? decryptedHourlyRate
          : undefined,
      showEarnings: user.showEarnings ?? false, // Default to false for privacy
    };
    return NextResponse.json(resp);
  } catch (e) {
    console.error("GET /api/profile error", e);
    return NextResponse.json(
      { error: "Failed to fetch profile" },
      { status: 500 },
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    // Support both Bearer token and cookie authentication
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
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // Enforce CSRF for profile updates
    if (!validateCsrf(request)) {
      return NextResponse.json(
        { error: "Invalid CSRF token" },
        { status: 403 },
      );
    }

    const body: UpdateProfileRequest = await request.json();
    const update: any = { ...body, updatedAt: new Date() };

    // Compact paymentConfig before saving (removes defaults to save space)
    if (body.paymentConfig) {
      update.paymentConfig = compactPaymentConfig(body.paymentConfig);
    }

    // Encrypt defaultHourlyRate if present
    if (
      body.defaultHourlyRate !== undefined &&
      body.defaultHourlyRate !== null
    ) {
      update.defaultHourlyRate = encryptNumber(body.defaultHourlyRate);
    }

    const { db } = await connectToDatabase();
    await db
      .collection("users")
      .updateOne(
        { _id: new (require("mongodb").ObjectId)(userId) },
        { $set: update },
      );

    const response = NextResponse.json({ success: true });

    // If profileComplete was set to true, regenerate auth token with updated status
    if (body.profileComplete === true) {
      const updatedUser = await db
        .collection("users")
        .findOne({ _id: new (require("mongodb").ObjectId)(userId) });
      if (updatedUser) {
        const { generateToken } = await import("@/lib/auth");
        const newToken = generateToken({
          _id: userId,
          email: updatedUser.email,
          name: updatedUser.name,
          profileComplete: true,
          pinSetup: !!updatedUser.pinHash, // Check if PIN is set
        });

        response.cookies.set("auth-token", newToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "lax",
          maxAge: 7 * 24 * 60 * 60, // 7 days
          path: "/",
        });
      }
    }

    return response;
  } catch (e) {
    console.error("PUT /api/profile error", e);
    return NextResponse.json(
      { error: "Failed to update profile" },
      { status: 500 },
    );
  }
}
