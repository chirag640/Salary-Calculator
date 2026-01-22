/**
 * Payment Calculator - Main Calculation Function
 *
 * Core payslip calculation logic.
 */

import type {
  PaySlipInput,
  PaySlipOutput,
  PaySlipBreakdown,
  WorkingDaysConfig,
} from "./types";
import { getDaysBetween, calculateWorkingDays, round2 } from "./date-utils";

/**
 * Calculate complete pay slip based on input configuration
 */
export function calculatePaySlip(input: PaySlipInput): PaySlipOutput {
  const {
    baseSalary,
    salaryPayType,
    salaryBasis,
    cycle,
    workingDays: workConfig,
    leaves,
    overtime,
    deductions,
    allowances,
    bonuses,
    joiningDate,
    leavingDate,
    currency = "INR",
  } = input;

  // Calculate period bounds (accounting for joining/leaving dates)
  const effectiveStart =
    joiningDate && joiningDate > cycle.startDate
      ? joiningDate
      : cycle.startDate;
  const effectiveEnd =
    leavingDate && leavingDate < cycle.endDate ? leavingDate : cycle.endDate;

  // Calculate days in cycle
  const totalDaysInCycle = getDaysBetween(cycle.startDate, cycle.endDate);
  const effectiveDaysInCycle = getDaysBetween(effectiveStart, effectiveEnd);
  const {
    workingDays: workingDaysInCycle,
    weeklyOffs,
    halfDays,
  } = calculateWorkingDays(
    effectiveStart,
    effectiveEnd,
    workConfig,
    input.paymentConfig?.weeklyOffs.saturdayMode,
  );

  // Calculate pro-rata factor if employee joined/left mid-cycle
  const proRataFactor =
    totalDaysInCycle > 0 ? effectiveDaysInCycle / totalDaysInCycle : 1;

  // Calculate daily rate based on salary type and basis
  let dailyRate = 0;
  let hourlyRate = 0;

  switch (salaryPayType) {
    case "fixed_monthly": {
      const proRatedSalary = baseSalary * proRataFactor;
      switch (salaryBasis) {
        case "calendar_month":
          dailyRate = proRatedSalary / 30;
          break;
        case "cycle_days":
          dailyRate = proRatedSalary / effectiveDaysInCycle;
          break;
        case "working_days_only":
          dailyRate =
            workingDaysInCycle > 0 ? proRatedSalary / workingDaysInCycle : 0;
          break;
      }
      hourlyRate =
        workConfig.hoursPerDay > 0 ? dailyRate / workConfig.hoursPerDay : 0;
      break;
    }
    case "daily_wage":
      dailyRate = baseSalary;
      hourlyRate =
        workConfig.hoursPerDay > 0 ? dailyRate / workConfig.hoursPerDay : 0;
      break;
    case "hourly":
      hourlyRate = baseSalary;
      dailyRate = hourlyRate * workConfig.hoursPerDay;
      break;
  }

  // Calculate leave deductions
  const unpaidLeaveDays = leaves.unpaidLeaveTaken + leaves.halfDaysTaken * 0.5;
  const unpaidLeaveDeduction = dailyRate * unpaidLeaveDays;

  // Calculate actual days worked
  const actualDaysWorked = Math.max(0, workingDaysInCycle - unpaidLeaveDays);

  // Calculate base pay
  let basePay: number;
  switch (salaryPayType) {
    case "fixed_monthly":
      basePay = baseSalary * proRataFactor - unpaidLeaveDeduction;
      break;
    case "daily_wage":
      basePay = dailyRate * actualDaysWorked;
      break;
    case "hourly":
      basePay = hourlyRate * (actualDaysWorked * workConfig.hoursPerDay);
      break;
    default:
      basePay = dailyRate * actualDaysWorked;
  }

  // Calculate allowances (pro-rated)
  const hraAmount = (allowances.hra || 0) * proRataFactor;
  const daAmount = (allowances.da || 0) * proRataFactor;
  const transportAmount = (allowances.transport || 0) * proRataFactor;
  const medicalAmount = (allowances.medical || 0) * proRataFactor;
  const specialAmount = (allowances.special || 0) * proRataFactor;
  const otherAllowancesAmount =
    (allowances.other || []).reduce((sum, a) => sum + a.amount, 0) *
    proRataFactor;
  const totalAllowances =
    hraAmount +
    daAmount +
    transportAmount +
    medicalAmount +
    specialAmount +
    otherAllowancesAmount;

  // Calculate overtime pay
  let overtimePay = 0;
  let weekendOvertimePay = 0;
  let holidayOvertimePay = 0;

  if (overtime.enabled) {
    if (overtime.overtimeHours > 0) {
      overtimePay = hourlyRate * overtime.multiplier * overtime.overtimeHours;
    }
    if (overtime.weekendOvertimeHours > 0) {
      weekendOvertimePay =
        hourlyRate * overtime.weekendMultiplier * overtime.weekendOvertimeHours;
    }
    if (overtime.holidayOvertimeHours > 0) {
      holidayOvertimePay =
        hourlyRate * overtime.holidayMultiplier * overtime.holidayOvertimeHours;
    }
  }
  const totalOvertimePay =
    overtimePay + weekendOvertimePay + holidayOvertimePay;

  // Calculate bonuses
  const totalBonusOther = bonuses.other.reduce((sum, b) => sum + b.amount, 0);
  const totalBonuses =
    bonuses.performance + bonuses.attendance + totalBonusOther;

  // Calculate gross earnings
  const grossEarnings =
    basePay + totalAllowances + totalOvertimePay + totalBonuses;

  // Calculate deductions
  const percentageDeduction = (grossEarnings * deductions.percentage) / 100;
  const pfDeduction = (grossEarnings * deductions.pfPercentage) / 100;

  // Calculate other deductions (can be fixed or percentage)
  let totalDeductionOther = 0;
  for (const d of deductions.other) {
    if (d.isPercentage) {
      totalDeductionOther += (grossEarnings * d.amount) / 100;
    } else {
      totalDeductionOther += d.amount;
    }
  }

  const totalDeductions =
    deductions.fixed +
    percentageDeduction +
    deductions.lateDeduction +
    deductions.professionalTax +
    pfDeduction +
    deductions.incomeTax +
    deductions.healthInsurance +
    totalDeductionOther;

  // Calculate net salary
  const grossSalary = grossEarnings;
  const netSalary = Math.max(0, grossSalary - totalDeductions);

  // Build breakdown
  const breakdown: PaySlipBreakdown = {
    period: {
      start: effectiveStart,
      end: effectiveEnd,
      totalDays: effectiveDaysInCycle,
      workingDays: workingDaysInCycle,
      weeklyOffs: weeklyOffs,
      holidays: 0,
    },
    earnings: {
      basePay: round2(basePay),
      hra: round2(hraAmount),
      da: round2(daAmount),
      transportAllowance: round2(transportAmount),
      medicalAllowance: round2(medicalAmount),
      specialAllowance: round2(specialAmount),
      otherAllowances: round2(otherAllowancesAmount),
      overtimePay: round2(overtimePay),
      weekendOvertimePay: round2(weekendOvertimePay),
      holidayOvertimePay: round2(holidayOvertimePay),
      bonuses: {
        performance: round2(bonuses.performance),
        attendance: round2(bonuses.attendance),
        other: round2(totalBonusOther),
        total: round2(totalBonuses),
      },
      grossEarnings: round2(grossEarnings),
    },
    deductionsBreakdown: {
      fixed: round2(deductions.fixed),
      percentage: round2(percentageDeduction),
      lateDeduction: round2(deductions.lateDeduction),
      unpaidLeave: round2(unpaidLeaveDeduction),
      professionalTax: round2(deductions.professionalTax),
      providentFund: round2(pfDeduction),
      incomeTax: round2(deductions.incomeTax),
      healthInsurance: round2(deductions.healthInsurance),
      other: round2(totalDeductionOther),
      total: round2(totalDeductions),
    },
    attendance: {
      daysWorked: round2(actualDaysWorked),
      paidLeaveTaken: leaves.paidLeaveTaken,
      unpaidLeaveTaken: leaves.unpaidLeaveTaken,
      halfDays: leaves.halfDaysTaken,
      overtimeHours: overtime.overtimeHours,
      weekendOvertimeHours: overtime.weekendOvertimeHours,
      holidayOvertimeHours: overtime.holidayOvertimeHours,
      lateArrivals: 0,
    },
  };

  return {
    grossSalary: round2(grossSalary),
    workingDays: workingDaysInCycle,
    actualDaysWorked: round2(actualDaysWorked),
    basePay: round2(basePay),
    totalAllowances: round2(totalAllowances),
    overtimePay: round2(totalOvertimePay),
    deductions: round2(totalDeductions),
    bonuses: round2(totalBonuses),
    netSalary: round2(netSalary),
    breakdown,
    currency,
  };
}
