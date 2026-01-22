/**
 * Payment Calculator Engine
 *
 * Comprehensive salary calculation system supporting:
 * - Custom salary cycles (e.g., 19th → 18th, 1st → 31st)
 * - Multiple pay types (fixed monthly, daily wage, hourly)
 * - Flexible weekly off configurations
 * - Leave handling (paid/unpaid/half-day)
 * - Overtime with multiple multipliers (regular, weekend, holiday)
 * - Allowances (HRA, DA, Transport, Medical, etc.)
 * - Tax and statutory deductions
 * - Auto-generation from time entries
 */

import type {
  PaymentConfig,
  PayslipData,
  TimeEntry,
  SalaryRecord,
  DEFAULT_PAYMENT_CONFIG,
} from "@/lib/types";

// ============================================================================
// Types & Interfaces
// ============================================================================

/**
 * Salary cycle defines the payment period
 */
export interface SalaryCycle {
  /** Start date of cycle (YYYY-MM-DD) */
  startDate: string;
  /** End date of cycle (YYYY-MM-DD) */
  endDate: string;
}

/**
 * How salary is calculated
 * - calendar_month: Use standard 30-day month
 * - cycle_days: Use actual days in the salary cycle
 * - working_days_only: Only count working days (exclude weekends/offs)
 */
export type SalaryBasis = "calendar_month" | "cycle_days" | "working_days_only";

/**
 * Type of salary payment
 * - fixed_monthly: Fixed amount per month
 * - daily_wage: Fixed amount per day worked
 * - hourly: Fixed amount per hour worked
 */
export type SalaryPayType = "fixed_monthly" | "daily_wage" | "hourly";

/**
 * Working days configuration
 */
export interface WorkingDaysConfig {
  /** Whether weekends count as working days */
  includeWeekends: boolean;
  /** Days of week that are off (0=Sunday, 1=Monday, ..., 6=Saturday) */
  weeklyOffs: number[];
  /** Standard working hours per day */
  hoursPerDay: number;
  /** Second Saturday off */
  secondSaturdayOff?: boolean;
  /** Fourth Saturday off */
  fourthSaturdayOff?: boolean;
}

/**
 * Leave configuration for the pay period
 */
export interface LeaveConfig {
  /** Maximum paid leave days allowed */
  paidLeaveLimit: number;
  /** Paid leave days taken in this period */
  paidLeaveTaken: number;
  /** Unpaid leave days taken */
  unpaidLeaveTaken: number;
  /** Half days taken (each counts as 0.5 day) */
  halfDaysTaken: number;
}

/**
 * Overtime calculation rules
 */
export interface OvertimeRules {
  /** Whether overtime is enabled */
  enabled: boolean;
  /** Threshold hours per day before overtime kicks in */
  thresholdHoursPerDay: number;
  /** Regular overtime multiplier (e.g., 1.5 for time-and-a-half) */
  multiplier: number;
  /** Weekend overtime multiplier */
  weekendMultiplier: number;
  /** Holiday overtime multiplier */
  holidayMultiplier: number;
  /** Total regular overtime hours worked in the period */
  overtimeHours: number;
  /** Weekend overtime hours */
  weekendOvertimeHours: number;
  /** Holiday overtime hours */
  holidayOvertimeHours: number;
}

/**
 * Deduction configuration
 */
export interface DeductionConfig {
  /** Fixed deduction amount */
  fixed: number;
  /** Percentage deduction (e.g., 10 for 10%) */
  percentage: number;
  /** Late penalty deduction */
  lateDeduction: number;
  /** Professional tax */
  professionalTax: number;
  /** Provident Fund percentage */
  pfPercentage: number;
  /** Income tax (calculated or fixed) */
  incomeTax: number;
  /** Health insurance */
  healthInsurance: number;
  /** Other deductions with descriptions */
  other: Array<{ description: string; amount: number; isPercentage?: boolean }>;
}

/**
 * Allowance configuration
 */
export interface AllowanceConfig {
  /** House Rent Allowance */
  hra: number;
  /** Dearness Allowance */
  da: number;
  /** Transport Allowance */
  transport: number;
  /** Medical Allowance */
  medical: number;
  /** Special Allowance */
  special: number;
  /** Other allowances with descriptions */
  other: Array<{ description: string; amount: number }>;
}

/**
 * Bonus configuration
 */
export interface BonusConfig {
  /** Performance bonus */
  performance: number;
  /** Attendance bonus */
  attendance: number;
  /** Other bonuses with descriptions */
  other: Array<{ description: string; amount: number }>;
}

/**
 * Complete input for pay slip calculation
 */
export interface PaySlipInput {
  /** Base salary amount */
  baseSalary: number;
  /** Type of salary payment */
  salaryPayType: SalaryPayType;
  /** Basis for salary calculation */
  salaryBasis: SalaryBasis;
  /** Salary cycle period */
  cycle: SalaryCycle;
  /** Working days configuration */
  workingDays: WorkingDaysConfig;
  /** Leave information */
  leaves: LeaveConfig;
  /** Overtime rules */
  overtime: OvertimeRules;
  /** Deduction configuration */
  deductions: DeductionConfig;
  /** Allowance configuration */
  allowances: AllowanceConfig;
  /** Bonus configuration */
  bonuses: BonusConfig;
  /** Optional: Employee joining date (for pro-rata calculation) */
  joiningDate?: string;
  /** Optional: Employee leaving date (for pro-rata calculation) */
  leavingDate?: string;
  /** Currency code */
  currency?: string;
  /** Optional: Payment configuration for advanced features */
  paymentConfig?: PaymentConfig;
}

/**
 * Detailed breakdown of the pay slip
 */
export interface PaySlipBreakdown {
  /** Calculation period summary */
  period: {
    start: string;
    end: string;
    totalDays: number;
    workingDays: number;
    weeklyOffs: number;
    holidays: number;
  };
  /** Earnings breakdown */
  earnings: {
    basePay: number;
    hra: number;
    da: number;
    transportAllowance: number;
    medicalAllowance: number;
    specialAllowance: number;
    otherAllowances: number;
    overtimePay: number;
    weekendOvertimePay: number;
    holidayOvertimePay: number;
    bonuses: {
      performance: number;
      attendance: number;
      other: number;
      total: number;
    };
    grossEarnings: number;
  };
  /** Deductions breakdown */
  deductionsBreakdown: {
    fixed: number;
    percentage: number;
    lateDeduction: number;
    unpaidLeave: number;
    professionalTax: number;
    providentFund: number;
    incomeTax: number;
    healthInsurance: number;
    other: number;
    total: number;
  };
  /** Attendance summary */
  attendance: {
    daysWorked: number;
    paidLeaveTaken: number;
    unpaidLeaveTaken: number;
    halfDays: number;
    overtimeHours: number;
    weekendOvertimeHours: number;
    holidayOvertimeHours: number;
    lateArrivals: number;
  };
}

/**
 * Complete output of pay slip calculation
 */
export interface PaySlipOutput {
  /** Gross salary (before deductions) */
  grossSalary: number;
  /** Total working days in the period */
  workingDays: number;
  /** Actual days worked (excluding unpaid leave) */
  actualDaysWorked: number;
  /** Base pay component */
  basePay: number;
  /** Total allowances */
  totalAllowances: number;
  /** Overtime pay component */
  overtimePay: number;
  /** Total deductions */
  deductions: number;
  /** Total bonuses */
  bonuses: number;
  /** Net salary (take-home pay) */
  netSalary: number;
  /** Detailed breakdown */
  breakdown: PaySlipBreakdown;
  /** Currency */
  currency: string;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Parse a date string (YYYY-MM-DD) to Date object
 */
function parseDate(dateStr: string): Date {
  const [year, month, day] = dateStr.split("-").map(Number);
  return new Date(year, month - 1, day);
}

/**
 * Format a Date object to YYYY-MM-DD string
 */
function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Get total days between two dates (inclusive)
 */
export function getDaysBetween(startDate: string, endDate: string): number {
  const start = parseDate(startDate);
  const end = parseDate(endDate);
  const diffTime = Math.abs(end.getTime() - start.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays + 1; // +1 to include both start and end dates
}

/**
 * Check if a date is the nth occurrence of a day in its month
 */
function isNthDayOfMonth(date: Date, dayOfWeek: number, n: number): boolean {
  if (date.getDay() !== dayOfWeek) return false;
  const dayOfMonth = date.getDate();
  const weekNumber = Math.ceil(dayOfMonth / 7);
  return weekNumber === n;
}

/**
 * Check if a date is a weekly off based on configuration
 * @param saturdayMode - New Saturday configuration mode from weeklyOffs
 */
export function isWeeklyOff(
  date: Date,
  config: WorkingDaysConfig,
  saturdayMode?:
    | "all-off"
    | "working"
    | "alternate-1-3"
    | "alternate-2-4"
    | "half-day",
): boolean {
  const dayOfWeek = date.getDay();

  // Check regular weekly offs
  if (config.weeklyOffs.includes(dayOfWeek)) {
    return true;
  }

  // Handle Saturday based on mode
  if (dayOfWeek === 6 && saturdayMode) {
    if (saturdayMode === "all-off") {
      return true;
    } else if (saturdayMode === "alternate-1-3") {
      return isNthDayOfMonth(date, 6, 1) || isNthDayOfMonth(date, 6, 3);
    } else if (saturdayMode === "alternate-2-4") {
      return isNthDayOfMonth(date, 6, 2) || isNthDayOfMonth(date, 6, 4);
    } else if (saturdayMode === "half-day") {
      return false; // Half day is not an off day, handled separately
    }
    // 'working' mode - fall through to return false
  }

  // Legacy support: Check second Saturday
  if (config.secondSaturdayOff && isNthDayOfMonth(date, 6, 2)) {
    return true;
  }

  // Legacy support: Check fourth Saturday
  if (config.fourthSaturdayOff && isNthDayOfMonth(date, 6, 4)) {
    return true;
  }

  return false;
}

/**
 * Check if a date is a Saturday half day
 */
export function isSaturdayHalfDay(
  date: Date,
  saturdayMode?:
    | "all-off"
    | "working"
    | "alternate-1-3"
    | "alternate-2-4"
    | "half-day",
): boolean {
  return date.getDay() === 6 && saturdayMode === "half-day";
}

/**
 * Get the working hours factor for a day (1.0 for full day, 0.5 for half day, 0 for off)
 */
export function getWorkingHoursFactor(
  date: Date,
  config: WorkingDaysConfig,
  saturdayMode?:
    | "all-off"
    | "working"
    | "alternate-1-3"
    | "alternate-2-4"
    | "half-day",
): number {
  if (isWeeklyOff(date, config, saturdayMode)) {
    return 0; // Off day
  }
  if (isSaturdayHalfDay(date, saturdayMode)) {
    return 0.5; // Half day
  }
  return 1.0; // Full working day
}

/**
 * Calculate working days in a period
 */
export function calculateWorkingDays(
  startDate: string,
  endDate: string,
  config: WorkingDaysConfig,
  saturdayMode?:
    | "all-off"
    | "working"
    | "alternate-1-3"
    | "alternate-2-4"
    | "half-day",
): { workingDays: number; weeklyOffs: number; halfDays: number } {
  const start = parseDate(startDate);
  const end = parseDate(endDate);
  let workingDays = 0;
  let weeklyOffs = 0;
  let halfDays = 0;

  const current = new Date(start);
  while (current <= end) {
    const factor = getWorkingHoursFactor(current, config, saturdayMode);
    if (factor === 0) {
      weeklyOffs++;
    } else if (factor === 0.5) {
      halfDays++;
      workingDays += 0.5;
    } else {
      workingDays++;
    }
    current.setDate(current.getDate() + 1);
  }

  return { workingDays, weeklyOffs, halfDays };
}

/**
 * Round a number to 2 decimal places
 */
function round2(num: number): number {
  return Math.round(num * 100) / 100;
}

/**
 * Format currency amount
 */
export function formatCurrency(
  amount: number,
  currency: string = "INR",
  locale: string = "en-IN",
): string {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

// ============================================================================
// Main Calculation Function
// ============================================================================

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

// ============================================================================
// Time Entry Based Calculation
// ============================================================================

/**
 * Analyze time entries for a pay period
 */
export interface TimeEntryAnalysis {
  totalHoursWorked: number;
  totalDaysWorked: number;
  overtimeHours: number;
  weekendHours: number;
  holidayHours: number;
  lateArrivals: number;
  earlyDepartures: number;
  halfDays: number;
  absences: number;
  paidLeaves: number;
  unpaidLeaves: number;
  entriesByDate: Map<string, TimeEntry[]>;
}

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
  const { workingDays, weeklyOffs, halfDays } = calculateWorkingDays(
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

// ============================================================================
// Default Configurations
// ============================================================================

/**
 * Get default working days configuration
 * Standard 6-day work week (Monday-Saturday), 8 hours per day, Sunday off
 */
export function getDefaultWorkingDaysConfig(): WorkingDaysConfig {
  return {
    includeWeekends: false,
    weeklyOffs: [0], // Sunday only
    hoursPerDay: 8,
    secondSaturdayOff: false,
    fourthSaturdayOff: false,
  };
}

/**
 * Get 5-day work week configuration (Monday-Friday)
 */
export function getFiveDayWorkWeekConfig(): WorkingDaysConfig {
  return {
    includeWeekends: false,
    weeklyOffs: [0, 6], // Sunday and Saturday
    hoursPerDay: 8,
    secondSaturdayOff: false,
    fourthSaturdayOff: false,
  };
}

/**
 * Get default leave configuration
 */
export function getDefaultLeaveConfig(): LeaveConfig {
  return {
    paidLeaveLimit: 2,
    paidLeaveTaken: 0,
    unpaidLeaveTaken: 0,
    halfDaysTaken: 0,
  };
}

/**
 * Get default overtime rules
 */
export function getDefaultOvertimeRules(): OvertimeRules {
  return {
    enabled: false,
    thresholdHoursPerDay: 8,
    multiplier: 1.5,
    weekendMultiplier: 2,
    holidayMultiplier: 2.5,
    overtimeHours: 0,
    weekendOvertimeHours: 0,
    holidayOvertimeHours: 0,
  };
}

/**
 * Get default deduction configuration
 */
export function getDefaultDeductionConfig(): DeductionConfig {
  return {
    fixed: 0,
    percentage: 0,
    lateDeduction: 0,
    professionalTax: 0,
    pfPercentage: 0,
    incomeTax: 0,
    healthInsurance: 0,
    other: [],
  };
}

/**
 * Get default allowance configuration
 */
export function getDefaultAllowanceConfig(): AllowanceConfig {
  return {
    hra: 0,
    da: 0,
    transport: 0,
    medical: 0,
    special: 0,
    other: [],
  };
}

/**
 * Get default bonus configuration
 */
export function getDefaultBonusConfig(): BonusConfig {
  return {
    performance: 0,
    attendance: 0,
    other: [],
  };
}

/**
 * Create a salary cycle for a given month with custom start day
 * @param year - Year (e.g., 2026)
 * @param month - Month (1-12)
 * @param cycleStartDay - Day of month when cycle starts (e.g., 19)
 */
export function createMonthlyCycle(
  year: number,
  month: number,
  cycleStartDay: number = 1,
): SalaryCycle {
  if (cycleStartDay === 1) {
    // Calendar month: 1st to last day of month
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0); // Last day of the month

    return {
      startDate: formatDate(startDate),
      endDate: formatDate(endDate),
    };
  }

  // Custom cycle: e.g., 19th of this month to 18th of next month
  const startDate = new Date(year, month - 1, cycleStartDay);

  // End date is one day before the start day of the next month
  const endYear = month === 12 ? year + 1 : year;
  const endMonth = month === 12 ? 0 : month;
  const endDate = new Date(endYear, endMonth, cycleStartDay - 1);

  return {
    startDate: formatDate(startDate),
    endDate: formatDate(endDate),
  };
}

/**
 * Get the current salary cycle based on configuration
 */
export function getCurrentSalaryCycle(cycleStartDay: number = 1): SalaryCycle {
  const today = new Date();
  const currentDay = today.getDate();
  const currentMonth = today.getMonth() + 1;
  const currentYear = today.getFullYear();

  if (cycleStartDay === 1) {
    // Calendar month
    return createMonthlyCycle(currentYear, currentMonth, 1);
  }

  // Custom cycle
  if (currentDay >= cycleStartDay) {
    // We're in a cycle that started this month
    return createMonthlyCycle(currentYear, currentMonth, cycleStartDay);
  } else {
    // We're in a cycle that started last month
    const prevMonth = currentMonth === 1 ? 12 : currentMonth - 1;
    const prevYear = currentMonth === 1 ? currentYear - 1 : currentYear;
    return createMonthlyCycle(prevYear, prevMonth, cycleStartDay);
  }
}

/**
 * Get list of salary cycles for a year
 */
export function getYearlySalaryCycles(
  year: number,
  cycleStartDay: number = 1,
): SalaryCycle[] {
  const cycles: SalaryCycle[] = [];

  for (let month = 1; month <= 12; month++) {
    cycles.push(createMonthlyCycle(year, month, cycleStartDay));
  }

  return cycles;
}

/**
 * Get the last N salary cycles
 */
export function getLastNCycles(
  n: number,
  cycleStartDay: number = 1,
): SalaryCycle[] {
  const cycles: SalaryCycle[] = [];
  const today = new Date();
  let currentMonth = today.getMonth() + 1;
  let currentYear = today.getFullYear();

  // Adjust if we're before the cycle start day
  if (today.getDate() < cycleStartDay && cycleStartDay !== 1) {
    currentMonth = currentMonth === 1 ? 12 : currentMonth - 1;
    if (currentMonth === 12) currentYear--;
  }

  for (let i = 0; i < n; i++) {
    cycles.push(createMonthlyCycle(currentYear, currentMonth, cycleStartDay));
    currentMonth--;
    if (currentMonth < 1) {
      currentMonth = 12;
      currentYear--;
    }
  }

  return cycles.reverse();
}

// ============================================================================
// Utility Exports
// ============================================================================

export { parseDate, formatDate, round2 };
