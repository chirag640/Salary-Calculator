/**
 * Payment Calculator - Time Entry Analysis
 *
 * Functions for analyzing time entries for payslip generation.
 */

import type {
  WorkingDaysConfig,
  SalaryCycle,
  SalaryRecord,
  PaymentConfig,
  PayslipData,
  TimeEntry,
  TimeEntryAnalysis,
} from "./types";
import {
  parseDate,
  formatDate,
  getDaysBetween,
  isWeeklyOff,
  calculateWorkingDays,
  round2,
} from "./date-utils";

/**
 * Analyze time entries for payslip generation
 */
export function analyzeTimeEntries(
  entries: TimeEntry[],
  startDate: string,
  endDate: string,
  workConfig: WorkingDaysConfig,
  expectedStartTime?: string,
): TimeEntryAnalysis {
  const result: TimeEntryAnalysis = {
    totalHoursWorked: 0,
    totalDaysWorked: 0,
    overtimeHours: 0,
    weekendHours: 0,
    holidayHours: 0,
    lateArrivals: 0,
    earlyDepartures: 0,
    halfDays: 0,
    absences: 0,
    paidLeaves: 0,
    unpaidLeaves: 0,
    entriesByDate: new Map(),
  };

  // Group entries by date
  for (const entry of entries) {
    if (entry.date >= startDate && entry.date <= endDate) {
      const existing = result.entriesByDate.get(entry.date) || [];
      existing.push(entry);
      result.entriesByDate.set(entry.date, existing);
    }
  }

  // Calculate working days that should have entries
  const start = parseDate(startDate);
  const end = parseDate(endDate);
  const current = new Date(start);
  const workingDates: string[] = [];

  while (current <= end) {
    if (!isWeeklyOff(current, workConfig)) {
      workingDates.push(formatDate(current));
    }
    current.setDate(current.getDate() + 1);
  }

  // Analyze each working date
  for (const date of workingDates) {
    const dayEntries = result.entriesByDate.get(date) || [];

    if (dayEntries.length === 0) {
      result.absences++;
      continue;
    }

    // Check for leave entries
    const leaveEntry = dayEntries.find((e) => e.leave?.isLeave);
    if (leaveEntry) {
      if (
        leaveEntry.leave?.leaveType === "Sick" ||
        leaveEntry.leave?.leaveType === "Vacation"
      ) {
        result.paidLeaves++;
      } else {
        result.unpaidLeaves++;
      }
      continue;
    }

    // Calculate hours for this day
    let dayHours = 0;
    for (const entry of dayEntries) {
      dayHours += entry.totalHours || 0;
    }

    result.totalHoursWorked += dayHours;
    result.totalDaysWorked++;

    // Check for half day
    if (dayHours > 0 && dayHours < workConfig.hoursPerDay / 2 + 1) {
      result.halfDays++;
    }

    // Check for overtime
    if (dayHours > workConfig.hoursPerDay) {
      result.overtimeHours += dayHours - workConfig.hoursPerDay;
    }

    // Check for late arrival
    if (expectedStartTime && dayEntries.length > 0) {
      const firstEntry = dayEntries.sort((a, b) =>
        a.timeIn.localeCompare(b.timeIn),
      )[0];
      if (firstEntry.timeIn > expectedStartTime) {
        result.lateArrivals++;
      }
    }
  }

  // Check weekend work
  current.setTime(start.getTime());
  while (current <= end) {
    const dateStr = formatDate(current);
    if (isWeeklyOff(current, workConfig)) {
      const weekendEntries = result.entriesByDate.get(dateStr) || [];
      for (const entry of weekendEntries) {
        if (!entry.leave?.isLeave) {
          result.weekendHours += entry.totalHours || 0;
        }
      }
    }
    current.setDate(current.getDate() + 1);
  }

  return result;
}

/**
 * Generate payslip from time entries and salary configuration
 */
export function generatePayslipFromEntries(
  entries: TimeEntry[],
  salaryRecord: SalaryRecord,
  paymentConfig: PaymentConfig,
  cycle: SalaryCycle,
  userId: string,
): PayslipData {
  const workConfig: WorkingDaysConfig = {
    includeWeekends: false,
    weeklyOffs: paymentConfig.weeklyOffs.offDays,
    hoursPerDay: salaryRecord.working.hoursPerDay,
    secondSaturdayOff: paymentConfig.weeklyOffs.secondSaturdayOff,
    fourthSaturdayOff: paymentConfig.weeklyOffs.fourthSaturdayOff,
  };

  // Analyze time entries
  const analysis = analyzeTimeEntries(
    entries,
    cycle.startDate,
    cycle.endDate,
    workConfig,
  );

  // Calculate period info
  const { workingDays, weeklyOffs } = calculateWorkingDays(
    cycle.startDate,
    cycle.endDate,
    workConfig,
    paymentConfig.weeklyOffs.saturdayMode,
  );
  const totalDays = getDaysBetween(cycle.startDate, cycle.endDate);

  // Calculate base monthly salary
  const monthlySalary =
    salaryRecord.salaryType === "annual"
      ? salaryRecord.amount / 12
      : salaryRecord.amount;

  // Calculate daily and hourly rates
  const dailyRate = workingDays > 0 ? monthlySalary / workingDays : 0;
  const hourlyRate =
    salaryRecord.working.hoursPerDay > 0
      ? dailyRate / salaryRecord.working.hoursPerDay
      : 0;

  // Calculate basic pay based on attendance
  const basicPay = dailyRate * analysis.totalDaysWorked;

  // Apply half day deductions
  const halfDayDeduction = (dailyRate / 2) * analysis.halfDays;

  // Calculate unpaid leave deduction
  const unpaidLeaveDeduction = dailyRate * analysis.unpaidLeaves;

  // Calculate allowances (pro-rated based on attendance)
  const attendanceRatio =
    workingDays > 0 ? analysis.totalDaysWorked / workingDays : 0;
  const hra = (paymentConfig.allowances.hra || 0) * attendanceRatio;
  const da = (paymentConfig.allowances.da || 0) * attendanceRatio;
  const transportAllowance =
    (paymentConfig.allowances.transportAllowance || 0) * attendanceRatio;
  const medicalAllowance =
    (paymentConfig.allowances.medicalAllowance || 0) * attendanceRatio;
  const specialAllowance =
    (paymentConfig.allowances.specialAllowance || 0) * attendanceRatio;
  const otherAllowances =
    (paymentConfig.allowances.otherAllowances || []).reduce(
      (sum, a) => sum + a.amount,
      0,
    ) * attendanceRatio;

  // Calculate overtime pay
  let overtimePay = 0;
  let weekendPay = 0;

  if (paymentConfig.overtime.enabled) {
    overtimePay =
      hourlyRate *
      paymentConfig.overtime.regularMultiplier *
      analysis.overtimeHours;
    weekendPay =
      hourlyRate *
      paymentConfig.overtime.weekendMultiplier *
      analysis.weekendHours;
  }

  // Calculate gross earnings
  const grossEarnings =
    basicPay -
    halfDayDeduction +
    hra +
    da +
    transportAllowance +
    medicalAllowance +
    specialAllowance +
    otherAllowances +
    overtimePay +
    weekendPay;

  // Calculate deductions
  const professionalTax = paymentConfig.taxDeductions.professionalTax || 0;
  const pfAmount = paymentConfig.taxDeductions.pfPercentage
    ? (basicPay * paymentConfig.taxDeductions.pfPercentage) / 100
    : 0;
  const healthInsurance = paymentConfig.taxDeductions.healthInsurance || 0;

  let incomeTax = 0;
  if (
    paymentConfig.taxDeductions.taxEnabled &&
    paymentConfig.taxDeductions.fixedTaxPercentage
  ) {
    incomeTax =
      (grossEarnings * paymentConfig.taxDeductions.fixedTaxPercentage) / 100;
  }

  const otherDeductions = (
    paymentConfig.taxDeductions.otherDeductions || []
  ).reduce((sum, d) => {
    if (d.isPercentage) {
      return sum + (grossEarnings * d.amount) / 100;
    }
    return sum + d.amount;
  }, 0);

  // Late deduction (configurable, default ₹50 per late arrival)
  const lateDeduction = analysis.lateArrivals * 50;

  const totalDeductions =
    professionalTax +
    pfAmount +
    healthInsurance +
    incomeTax +
    unpaidLeaveDeduction +
    lateDeduction +
    otherDeductions;

  // Calculate net salary
  const netSalary = Math.max(0, grossEarnings - totalDeductions);

  // Generate payslip ID
  const payslipId = `PS-${userId.slice(-6)}-${cycle.startDate.replace(/-/g, "")}`;

  return {
    id: payslipId,
    userId,
    periodStart: cycle.startDate,
    periodEnd: cycle.endDate,
    generatedAt: new Date(),

    period: {
      totalDays,
      workingDays,
      weeklyOffs,
      holidays: 0,
    },

    attendance: {
      daysPresent: analysis.totalDaysWorked,
      daysAbsent: analysis.absences,
      halfDays: analysis.halfDays,
      lateArrivals: analysis.lateArrivals,
      paidLeave: analysis.paidLeaves,
      unpaidLeave: analysis.unpaidLeaves,
      overtimeHours: round2(analysis.overtimeHours),
      weekendWorkDays: Math.ceil(
        analysis.weekendHours / salaryRecord.working.hoursPerDay,
      ),
      totalHoursWorked: round2(analysis.totalHoursWorked),
      expectedHours: round2(workingDays * salaryRecord.working.hoursPerDay),
    },

    earnings: {
      basicPay: round2(basicPay - halfDayDeduction),
      hra: round2(hra),
      da: round2(da),
      transportAllowance: round2(transportAllowance),
      medicalAllowance: round2(medicalAllowance),
      specialAllowance: round2(specialAllowance),
      otherAllowances: round2(otherAllowances),
      overtimePay: round2(overtimePay),
      weekendPay: round2(weekendPay),
      holidayPay: 0,
      performanceBonus: 0,
      otherBonuses: 0,
      grossEarnings: round2(grossEarnings),
    },

    deductions: {
      incomeTax: round2(incomeTax),
      professionalTax: round2(professionalTax),
      providentFund: round2(pfAmount),
      healthInsurance: round2(healthInsurance),
      unpaidLeaveDeduction: round2(unpaidLeaveDeduction),
      lateDeduction: round2(lateDeduction),
      otherDeductions: round2(otherDeductions),
      totalDeductions: round2(totalDeductions),
    },

    summary: {
      grossSalary: round2(grossEarnings),
      totalDeductions: round2(totalDeductions),
      netSalary: round2(netSalary),
      paymentMode: "Bank Transfer",
    },
  };
}
