/**
 * Payment Calculator Module
 *
 * Modular payment and payslip calculation system.
 * This file re-exports all functionality from the split modules.
 */

// Types
export type {
  SalaryCycle,
  SalaryBasis,
  SalaryPayType,
  WorkingDaysConfig,
  LeaveConfig,
  OvertimeRules,
  DeductionConfig,
  AllowanceConfig,
  BonusConfig,
  PaySlipInput,
  PaySlipBreakdown,
  PaySlipOutput,
  TimeEntry,
  TimeEntryAnalysis,
  SalaryRecord,
  PaymentConfig,
  PayslipData,
} from "./types";

// Date utilities
export {
  parseDate,
  formatDate,
  getDaysBetween,
  isNthDayOfMonth,
  isWeeklyOff,
  isSaturdayHalfDay,
  getWorkingHoursFactor,
  calculateWorkingDays,
  round2,
  formatCurrency,
} from "./date-utils";

// Main calculator
export { calculatePaySlip } from "./calculator";

// Time entry analysis
export {
  analyzeTimeEntries,
  generatePayslipFromEntries,
} from "./time-entry-analysis";

// Default configurations
export {
  getDefaultWorkingDaysConfig,
  getFiveDayWorkWeekConfig,
  getDefaultLeaveConfig,
  getDefaultOvertimeRules,
  getDefaultDeductionConfig,
  getDefaultAllowanceConfig,
  getDefaultBonusConfig,
} from "./defaults";

// Salary cycles
export {
  createMonthlyCycle,
  getCurrentSalaryCycle,
  getYearlySalaryCycles,
  getLastNCycles,
} from "./cycles";
