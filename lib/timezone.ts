/**
 * Timezone Utilities
 *
 * Handles proper timezone conversion to prevent off-by-one date errors
 * when users are in different timezones.
 *
 * Key principles:
 * - Store dates as YYYY-MM-DD strings representing the user's local date
 * - Store timestamps as ISO strings for precise timing
 * - Convert appropriately when displaying or calculating
 *
 * NOTE: Run `pnpm add date-fns-tz` to install the required dependency
 */

// @ts-nocheck - date-fns-tz types will work once package is installed
import {
  format,
  parse,
  parseISO,
  isValid,
  startOfDay,
  endOfDay,
  addDays,
  subDays,
} from "date-fns";
import { formatInTimeZone, toZonedTime, fromZonedTime } from "date-fns-tz";

/**
 * Get the user's local timezone
 */
export function getUserTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return "UTC";
  }
}

/**
 * Convert a Date to a date string (YYYY-MM-DD) in the user's local timezone
 */
export function toLocalDateString(date: Date, timezone?: string): string {
  const tz = timezone || getUserTimezone();
  return formatInTimeZone(date, tz, "yyyy-MM-dd");
}

/**
 * Convert a Date to a time string (HH:mm) in the user's local timezone
 */
export function toLocalTimeString(date: Date, timezone?: string): string {
  const tz = timezone || getUserTimezone();
  return formatInTimeZone(date, tz, "HH:mm");
}

/**
 * Convert a Date to an ISO timestamp string
 */
export function toISOString(date: Date): string {
  return date.toISOString();
}

/**
 * Parse a date string (YYYY-MM-DD) as midnight in the user's local timezone
 * Returns a Date object representing the start of that day in UTC
 */
export function parseDateString(dateString: string, timezone?: string): Date {
  const tz = timezone || getUserTimezone();
  // Parse as midnight in the specified timezone
  const localMidnight = parse(dateString, "yyyy-MM-dd", new Date());
  return fromZonedTime(localMidnight, tz);
}

/**
 * Parse a date string and time string into a Date object
 */
export function parseDateTimeString(
  dateString: string,
  timeString: string,
  timezone?: string,
): Date {
  const tz = timezone || getUserTimezone();
  const dateTimeStr = `${dateString}T${timeString}`;
  const localDateTime = parse(dateTimeStr, "yyyy-MM-dd'T'HH:mm", new Date());
  return fromZonedTime(localDateTime, tz);
}

/**
 * Get today's date string in the user's local timezone
 */
export function getTodayString(timezone?: string): string {
  return toLocalDateString(new Date(), timezone);
}

/**
 * Get current time string in the user's local timezone
 */
export function getCurrentTimeString(timezone?: string): string {
  return toLocalTimeString(new Date(), timezone);
}

/**
 * Check if a date string represents today in the user's local timezone
 */
export function isToday(dateString: string, timezone?: string): boolean {
  return dateString === getTodayString(timezone);
}

/**
 * Get the start of day for a date string in UTC
 */
export function getStartOfDay(dateString: string, timezone?: string): Date {
  return parseDateString(dateString, timezone);
}

/**
 * Get the end of day for a date string in UTC
 */
export function getEndOfDay(dateString: string, timezone?: string): Date {
  const tz = timezone || getUserTimezone();
  const localDate = parse(dateString, "yyyy-MM-dd", new Date());
  const localEndOfDay = endOfDay(localDate);
  return fromZonedTime(localEndOfDay, tz);
}

/**
 * Calculate hours between two times on the same day
 */
export function calculateHoursBetween(timeIn: string, timeOut: string): number {
  if (!timeIn || !timeOut) return 0;

  const [inHours, inMinutes] = timeIn.split(":").map(Number);
  const [outHours, outMinutes] = timeOut.split(":").map(Number);

  const inTotalMinutes = inHours * 60 + inMinutes;
  const outTotalMinutes = outHours * 60 + outMinutes;

  // Handle overnight shifts (timeOut < timeIn means next day)
  let diffMinutes = outTotalMinutes - inTotalMinutes;
  if (diffMinutes < 0) {
    diffMinutes += 24 * 60; // Add 24 hours
  }

  return diffMinutes / 60;
}

/**
 * Format a date string for display
 */
export function formatDateForDisplay(
  dateString: string,
  formatStr: string = "MMM d, yyyy",
  timezone?: string,
): string {
  const date = parseDateString(dateString, timezone);
  const tz = timezone || getUserTimezone();
  return formatInTimeZone(date, tz, formatStr);
}

/**
 * Format a time string for display (12h or 24h format)
 */
export function formatTimeForDisplay(
  timeString: string,
  use24Hour: boolean = false,
): string {
  if (!timeString) return "";

  const [hours, minutes] = timeString.split(":").map(Number);

  if (use24Hour) {
    return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`;
  }

  const period = hours >= 12 ? "PM" : "AM";
  const displayHours = hours % 12 || 12;
  return `${displayHours}:${minutes.toString().padStart(2, "0")} ${period}`;
}

/**
 * Get date range for a week containing the given date
 */
export function getWeekRange(
  dateString: string,
  weekStartsOn: 0 | 1 = 1, // 0 = Sunday, 1 = Monday
  timezone?: string,
): { start: string; end: string } {
  const date = parseDateString(dateString, timezone);
  const dayOfWeek = date.getDay();

  // Calculate days to subtract to get to start of week
  const daysToStart =
    weekStartsOn === 0 ? dayOfWeek : dayOfWeek === 0 ? 6 : dayOfWeek - 1;

  const weekStart = subDays(date, daysToStart);
  const weekEnd = addDays(weekStart, 6);

  return {
    start: toLocalDateString(weekStart, timezone),
    end: toLocalDateString(weekEnd, timezone),
  };
}

/**
 * Get date range for a month containing the given date
 */
export function getMonthRange(
  dateString: string,
  timezone?: string,
): { start: string; end: string } {
  const date = parseDateString(dateString, timezone);
  const year = date.getFullYear();
  const month = date.getMonth();

  const monthStart = new Date(year, month, 1);
  const monthEnd = new Date(year, month + 1, 0);

  return {
    start: toLocalDateString(monthStart, timezone),
    end: toLocalDateString(monthEnd, timezone),
  };
}

/**
 * Get the day of week for a date string (0-6, where 0 is Sunday)
 */
export function getDayOfWeek(dateString: string, timezone?: string): number {
  const date = parseDateString(dateString, timezone);
  return date.getDay();
}

/**
 * Check if a date is a weekend (Saturday or Sunday)
 */
export function isWeekend(dateString: string, timezone?: string): boolean {
  const day = getDayOfWeek(dateString, timezone);
  return day === 0 || day === 6;
}

/**
 * Get array of date strings between start and end (inclusive)
 */
export function getDateRange(startDate: string, endDate: string): string[] {
  const dates: string[] = [];
  let current = new Date(startDate + "T00:00:00");
  const end = new Date(endDate + "T00:00:00");

  while (current <= end) {
    dates.push(format(current, "yyyy-MM-dd"));
    current = addDays(current, 1);
  }

  return dates;
}

/**
 * Validate a date string is in correct format and represents a real date
 */
export function isValidDateString(dateString: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
    return false;
  }

  const date = parse(dateString, "yyyy-MM-dd", new Date());
  if (!isValid(date)) {
    return false;
  }

  // Ensure it represents the same date when formatted back
  return format(date, "yyyy-MM-dd") === dateString;
}

/**
 * Validate a time string is in correct format and represents a real time
 */
export function isValidTimeString(timeString: string): boolean {
  if (!/^\d{2}:\d{2}$/.test(timeString)) {
    return false;
  }

  const [hours, minutes] = timeString.split(":").map(Number);
  return hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59;
}

/**
 * Get relative time description (e.g., "2 hours ago", "in 3 days")
 */
export function getRelativeTimeString(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMinutes = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (Math.abs(diffMinutes) < 1) {
    return "just now";
  }

  if (Math.abs(diffMinutes) < 60) {
    const mins = Math.abs(diffMinutes);
    return diffMinutes > 0
      ? `${mins} minute${mins > 1 ? "s" : ""} ago`
      : `in ${mins} minute${mins > 1 ? "s" : ""}`;
  }

  if (Math.abs(diffHours) < 24) {
    const hrs = Math.abs(diffHours);
    return diffHours > 0
      ? `${hrs} hour${hrs > 1 ? "s" : ""} ago`
      : `in ${hrs} hour${hrs > 1 ? "s" : ""}`;
  }

  const days = Math.abs(diffDays);
  return diffDays > 0
    ? `${days} day${days > 1 ? "s" : ""} ago`
    : `in ${days} day${days > 1 ? "s" : ""}`;
}

export default {
  getUserTimezone,
  toLocalDateString,
  toLocalTimeString,
  toISOString,
  parseDateString,
  parseDateTimeString,
  getTodayString,
  getCurrentTimeString,
  isToday,
  getStartOfDay,
  getEndOfDay,
  calculateHoursBetween,
  formatDateForDisplay,
  formatTimeForDisplay,
  getWeekRange,
  getMonthRange,
  getDayOfWeek,
  isWeekend,
  getDateRange,
  isValidDateString,
  isValidTimeString,
  getRelativeTimeString,
};
