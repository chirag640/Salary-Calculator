/**
 * Payment Calculator - Salary Cycle Functions
 *
 * Functions for creating and managing salary cycles.
 */

import type { SalaryCycle } from "./types";
import { formatDate } from "./date-utils";

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
