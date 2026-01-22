/**
 * Payment Calculator Date Utilities
 *
 * Helper functions for date handling in payment calculations.
 */

import type { WorkingDaysConfig, SaturdayMode } from "./types";

/**
 * Parse a date string (YYYY-MM-DD) to Date object
 */
export function parseDate(dateStr: string): Date {
  const [year, month, day] = dateStr.split("-").map(Number);
  return new Date(year, month - 1, day);
}

/**
 * Format a Date object to YYYY-MM-DD string
 */
export function formatDate(date: Date): string {
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
export function isNthDayOfMonth(
  date: Date,
  dayOfWeek: number,
  n: number,
): boolean {
  if (date.getDay() !== dayOfWeek) return false;
  const dayOfMonth = date.getDate();
  const weekNumber = Math.ceil(dayOfMonth / 7);
  return weekNumber === n;
}

/**
 * Check if a date is a weekly off based on configuration
 */
export function isWeeklyOff(
  date: Date,
  config: WorkingDaysConfig,
  saturdayMode?: SaturdayMode,
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
  saturdayMode?: SaturdayMode,
): boolean {
  return date.getDay() === 6 && saturdayMode === "half-day";
}

/**
 * Get the working hours factor for a day (1.0 for full day, 0.5 for half day, 0 for off)
 */
export function getWorkingHoursFactor(
  date: Date,
  config: WorkingDaysConfig,
  saturdayMode?: SaturdayMode,
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
  saturdayMode?: SaturdayMode,
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
export function round2(num: number): number {
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
