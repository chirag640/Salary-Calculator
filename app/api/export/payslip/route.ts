import { type NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { verifyToken, verifyRevealToken } from "@/lib/auth";
import { validateCsrf } from "@/lib/csrf";
import { ObjectId } from "mongodb";
import { logger } from "@/lib/logger";
import type {
  TimeEntry,
  PaymentConfig,
  SalaryRecord,
  PayslipData,
  DEFAULT_PAYMENT_CONFIG,
} from "@/lib/types";
import { decryptSalaryRecords } from "@/lib/db-encryption-middleware";
import {
  generatePayslipFromEntries,
  createMonthlyCycle,
  getCurrentSalaryCycle,
  getLastNCycles,
} from "@/lib/payment";

export const runtime = "nodejs";

/**
 * POST /api/export/payslip
 * Generate a payslip for a specific pay period
 */
export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const cookieToken = request.cookies.get("auth-token")?.value;
    const userFromToken = cookieToken ? verifyToken(cookieToken) : null;
    const userId = userFromToken?._id;

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify reveal token for salary data access
    const revealCookie = request.cookies.get("reveal-token")?.value;
    const revealValid = revealCookie ? verifyRevealToken(revealCookie) : null;
    const allowReveal = revealValid && revealValid.userId === userId;

    if (!allowReveal) {
      return NextResponse.json(
        { error: "PIN verification required to generate payslip" },
        { status: 403 },
      );
    }

    // Validate CSRF
    if (!validateCsrf(request)) {
      return NextResponse.json(
        { error: "Invalid CSRF token" },
        { status: 403 },
      );
    }

    // Parse request body
    const body = await request.json();
    const { startDate, endDate, year, month } = body;

    // Validate inputs
    if (!startDate && !endDate && !year && !month) {
      return NextResponse.json(
        { error: "Either startDate/endDate or year/month is required" },
        { status: 400 },
      );
    }

    const { db } = await connectToDatabase();

    // Fetch user with salary and payment config
    const user = await db.collection("users").findOne({
      _id: new ObjectId(userId),
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Get salary history (decrypted)
    const salaryHistory: SalaryRecord[] = user.salaryHistory
      ? decryptSalaryRecords(user.salaryHistory)
      : [];

    if (salaryHistory.length === 0) {
      return NextResponse.json(
        {
          error:
            "No salary records found. Please set up your salary in profile.",
        },
        { status: 400 },
      );
    }

    // Get payment config with defaults
    const defaultPaymentConfig: PaymentConfig = {
      salaryCycle: {
        cycleStartDay: 1,
        useCalendarMonth: true,
      },
      weeklyOffs: {
        offDays: [0],
        secondSaturdayOff: false,
        fourthSaturdayOff: false,
        saturdayHalfDay: false,
      },
      leaveAllowance: {
        casualLeavePerMonth: 1,
        sickLeavePerMonth: 1,
        earnedLeavePerYear: 15,
        carryForwardEnabled: false,
        maxCarryForwardDays: 0,
      },
      overtime: {
        enabled: false,
        thresholdHoursPerDay: 8,
        regularMultiplier: 1.5,
        weekendMultiplier: 2,
        holidayMultiplier: 2.5,
        maxOvertimeHoursPerMonth: 50,
      },
      taxDeductions: {
        taxEnabled: false,
        taxRegime: "standard",
        fixedTaxPercentage: 0,
        professionalTax: 0,
        pfPercentage: 0,
        healthInsurance: 0,
        otherDeductions: [],
      },
      allowances: {
        hra: 0,
        da: 0,
        transportAllowance: 0,
        medicalAllowance: 0,
        specialAllowance: 0,
        otherAllowances: [],
      },
      currency: "INR",
      locale: "en-IN",
    };

    const paymentConfig: PaymentConfig = {
      ...defaultPaymentConfig,
      ...user.paymentConfig,
    };

    // Determine the pay period
    let cycle;
    if (startDate && endDate) {
      cycle = { startDate, endDate };
    } else if (year && month) {
      cycle = createMonthlyCycle(
        parseInt(year),
        parseInt(month),
        paymentConfig.salaryCycle.cycleStartDay,
      );
    } else {
      // Default to current cycle
      cycle = getCurrentSalaryCycle(paymentConfig.salaryCycle.cycleStartDay);
    }

    // Fetch time entries for the period
    const entries = await db
      .collection<TimeEntry>("timeEntries")
      .find({
        userId,
        date: {
          $gte: cycle.startDate,
          $lte: cycle.endDate,
        },
        deletedAt: null,
      })
      .toArray();

    // Find the applicable salary record for this period
    const sortedSalary = [...salaryHistory].sort((a, b) =>
      a.effectiveFrom.localeCompare(b.effectiveFrom),
    );

    let applicableSalary: SalaryRecord | undefined;
    for (const rec of sortedSalary) {
      if (rec.effectiveFrom <= cycle.endDate) {
        applicableSalary = rec;
      }
    }

    if (!applicableSalary) {
      // Use the earliest salary record if none applies
      applicableSalary = sortedSalary[0];
    }

    if (!applicableSalary) {
      return NextResponse.json(
        { error: "No applicable salary record found for this period" },
        { status: 400 },
      );
    }

    // Generate payslip
    const payslip = generatePayslipFromEntries(
      entries,
      applicableSalary,
      paymentConfig,
      cycle,
      userId,
    );

    return NextResponse.json({
      success: true,
      payslip,
      period: cycle,
      entriesCount: entries.length,
    });
  } catch (error) {
    logger.error(
      "POST /api/export/payslip error",
      error instanceof Error ? error : { error },
    );
    return NextResponse.json(
      { error: "Failed to generate payslip" },
      { status: 500 },
    );
  }
}

/**
 * GET /api/export/payslip
 * Get available pay periods for payslip generation
 */
export async function GET(request: NextRequest) {
  try {
    // Authenticate user
    const cookieToken = request.cookies.get("auth-token")?.value;
    const userFromToken = cookieToken ? verifyToken(cookieToken) : null;
    const userId = userFromToken?._id;

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { db } = await connectToDatabase();

    // Fetch user's payment config
    const user = await db.collection("users").findOne({
      _id: new ObjectId(userId),
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const cycleStartDay = user.paymentConfig?.salaryCycle?.cycleStartDay || 1;

    // Get last 12 pay cycles
    const cycles = getLastNCycles(12, cycleStartDay);

    // Get entry count for each cycle
    const cyclesWithData = await Promise.all(
      cycles.map(async (cycle) => {
        const count = await db
          .collection<TimeEntry>("timeEntries")
          .countDocuments({
            userId,
            date: {
              $gte: cycle.startDate,
              $lte: cycle.endDate,
            },
            deletedAt: null,
          });

        return {
          ...cycle,
          entriesCount: count,
          hasData: count > 0,
        };
      }),
    );

    return NextResponse.json({
      cycles: cyclesWithData,
      currentCycle: getCurrentSalaryCycle(cycleStartDay),
      cycleStartDay,
    });
  } catch (error) {
    logger.error(
      "GET /api/export/payslip error",
      error instanceof Error ? error : { error },
    );
    return NextResponse.json(
      { error: "Failed to fetch pay periods" },
      { status: 500 },
    );
  }
}
