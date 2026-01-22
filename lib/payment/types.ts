/**
 * Payment Calculator Types & Interfaces
 *
 * Type definitions for the payment calculation system.
 */

import type {
  PaymentConfig,
  TimeEntry,
  SalaryRecord,
  PayslipData,
} from "@/lib/types";

// Re-export types from lib/types
export type { PaymentConfig, TimeEntry, SalaryRecord, PayslipData };

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
 * Saturday working mode configuration
 */
export type SaturdayMode =
  | "all-off"
  | "working"
  | "alternate-1-3"
  | "alternate-2-4"
  | "half-day";

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
  /** Second Saturday off (legacy) */
  secondSaturdayOff?: boolean;
  /** Fourth Saturday off (legacy) */
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

/**
 * Time entry analysis result
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
