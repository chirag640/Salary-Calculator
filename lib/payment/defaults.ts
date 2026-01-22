/**
 * Payment Calculator - Default Configurations
 *
 * Factory functions for creating default configuration objects.
 */

import type {
  WorkingDaysConfig,
  LeaveConfig,
  OvertimeRules,
  DeductionConfig,
  AllowanceConfig,
  BonusConfig,
} from "./types";

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
