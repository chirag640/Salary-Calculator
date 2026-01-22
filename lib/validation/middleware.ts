/**
 * Request Validation Middleware
 *
 * Centralized validation for API routes using Zod schemas
 */

import { z } from "zod";
import { type NextRequest, NextResponse } from "next/server";
import { ErrorCodes, errorResponse, type ApiError } from "@/lib/api-middleware";
import {
  sanitizeDateString,
  sanitizeTimeString,
  isValidObjectId,
} from "@/lib/sanitization";

/**
 * Common validation schemas
 */

// ObjectId validation
export const objectIdSchema = z.string().refine(isValidObjectId, {
  message: "Invalid ID format",
});

// Date string (YYYY-MM-DD)
export const dateSchema = z
  .string()
  .refine((val) => sanitizeDateString(val) !== null, {
    message: "Invalid date format (expected YYYY-MM-DD)",
  });

// Time string (HH:mm)
export const timeSchema = z
  .string()
  .refine((val) => !val || sanitizeTimeString(val) !== null, {
    message: "Invalid time format (expected HH:mm)",
  });

// Email
export const emailSchema = z
  .string()
  .email()
  .min(1)
  .max(255)
  .toLowerCase()
  .trim();

// Password (strict validation)
export const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .max(128, "Password must not exceed 128 characters")
  .regex(/[a-z]/, "Password must contain at least one lowercase letter")
  .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
  .regex(/[0-9]/, "Password must contain at least one number")
  .regex(
    /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/,
    "Password must contain at least one special character",
  );

// PIN (4-6 digits)
export const pinSchema = z
  .string()
  .min(4, "PIN must be at least 4 digits")
  .max(6, "PIN must not exceed 6 digits")
  .regex(/^\d+$/, "PIN must contain only digits");

// Name
export const nameSchema = z
  .string()
  .min(1, "Name is required")
  .max(100, "Name must not exceed 100 characters")
  .regex(
    /^[a-zA-Z\s'-]+$/,
    "Name can only contain letters, spaces, hyphens, and apostrophes",
  )
  .transform((val) => val.trim().replace(/\s+/g, " "));

// Work description
export const workDescriptionSchema = z
  .string()
  .max(2000, "Description must not exceed 2000 characters")
  .optional()
  .default("")
  .transform((val) => val?.trim() ?? "");

// Project/Client name
export const projectNameSchema = z
  .string()
  .max(200, "Name must not exceed 200 characters")
  .optional()
  .default("")
  .transform((val) => val?.trim().replace(/[^\w\s\-_.]/g, "") ?? "");

// Pagination
export const paginationSchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  cursor: objectIdSchema.optional(),
  offset: z.coerce.number().int().min(0).optional(),
});

// Date range
export const dateRangeSchema = z
  .object({
    startDate: dateSchema,
    endDate: dateSchema,
  })
  .refine((data) => new Date(data.startDate) <= new Date(data.endDate), {
    message: "Start date must be before or equal to end date",
    path: ["endDate"],
  });

/**
 * Time entry validation schemas
 */

export const createTimeEntryBodySchema = z.object({
  date: dateSchema,
  timeIn: timeSchema.optional().default(""),
  timeOut: timeSchema.optional().default(""),
  breakMinutes: z.coerce.number().int().min(0).max(1440).default(0),
  workDescription: workDescriptionSchema,
  client: projectNameSchema,
  project: projectNameSchema,
  leave: z
    .object({
      isLeave: z.boolean(),
      leaveType: z
        .enum(["Sick", "Vacation", "Personal", "Holiday", "Other"])
        .optional(),
      leaveReason: z.string().max(500).optional(),
    })
    .optional(),
  isHolidayWork: z.boolean().optional().default(false),
  holidayCategory: z.enum(["sunday", "saturday", "other"]).optional(),
  isHolidayExtra: z.boolean().optional().default(false),
  totalHours: z.coerce.number().min(0).max(48).optional(),
});

export const updateTimeEntryBodySchema = createTimeEntryBodySchema.partial();

/**
 * Profile validation schemas
 */

export const updateProfileBodySchema = z.object({
  name: nameSchema.optional(),
  contact: z
    .object({
      phone: z.string().max(20).optional(),
      addressLine1: z.string().max(200).optional(),
      addressLine2: z.string().max(200).optional(),
      city: z.string().max(100).optional(),
      state: z.string().max(100).optional(),
      postalCode: z.string().max(20).optional(),
      country: z.string().max(100).optional(),
    })
    .optional(),
  workingConfig: z
    .object({
      hoursPerDay: z.coerce.number().min(1).max(24),
      daysPerMonth: z.coerce.number().min(1).max(31),
    })
    .optional(),
  overtime: z
    .object({
      enabled: z.boolean(),
      thresholdHoursPerDay: z.coerce.number().min(1).max(24),
      multiplier: z.coerce.number().min(1).max(5),
    })
    .optional(),
  showEarnings: z.boolean().optional(),
});

/**
 * Auth validation schemas
 */

export const loginBodySchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Password is required"),
});

export const registerBodySchema = z.object({
  name: nameSchema,
  email: emailSchema,
  password: passwordSchema,
});

export const forgotPasswordBodySchema = z.object({
  email: emailSchema,
});

export const resetPasswordBodySchema = z.object({
  token: z.string().regex(/^[a-f0-9]{64}$/i, "Invalid reset token"),
  password: passwordSchema,
});

export const verifyOtpBodySchema = z.object({
  email: emailSchema,
  otp: z.string().regex(/^\d{6}$/, "OTP must be 6 digits"),
  returnTo: z.string().optional(),
});

export const setPinBodySchema = z.object({
  currentPin: pinSchema.optional(),
  newPin: pinSchema,
});

export const verifyPinBodySchema = z.object({
  pin: pinSchema,
});

/**
 * Export validation schemas
 */

export const exportRequestBodySchema = z.object({
  startDate: dateSchema,
  endDate: dateSchema,
  format: z.enum(["csv", "xlsx", "pdf"]).default("csv"),
  includeLeave: z.boolean().default(true),
  clientFilter: z.string().max(100).optional(),
  projectFilter: z.string().max(100).optional(),
});

/**
 * Validation result type
 */
export type ValidationResult<T> =
  | { success: true; data: T }
  | { success: false; error: NextResponse<ApiError> };

/**
 * Parse and validate request body
 */
export async function parseAndValidateBody<T>(
  request: NextRequest,
  schema: z.ZodSchema<T>,
): Promise<ValidationResult<T>> {
  try {
    const body = await request.json();
    const result = schema.safeParse(body);

    if (!result.success) {
      const details = result.error.errors.map((err) => ({
        field: err.path.join("."),
        message: err.message,
      }));

      return {
        success: false,
        error: errorResponse("Validation failed", 400, {
          code: ErrorCodes.VALIDATION_FAILED,
          details,
        }),
      };
    }

    return { success: true, data: result.data };
  } catch {
    return {
      success: false,
      error: errorResponse("Invalid JSON body", 400, {
        code: ErrorCodes.INVALID_INPUT,
      }),
    };
  }
}

/**
 * Parse and validate query parameters
 */
export function parseAndValidateQuery<T>(
  request: NextRequest,
  schema: z.ZodSchema<T>,
): ValidationResult<T> {
  const searchParams = Object.fromEntries(new URL(request.url).searchParams);
  const result = schema.safeParse(searchParams);

  if (!result.success) {
    const details = result.error.errors.map((err) => ({
      field: err.path.join("."),
      message: err.message,
    }));

    return {
      success: false,
      error: errorResponse("Invalid query parameters", 400, {
        code: ErrorCodes.VALIDATION_FAILED,
        details,
      }),
    };
  }

  return { success: true, data: result.data };
}

/**
 * Parse and validate path parameters
 */
export function parseAndValidateParams<T>(
  params: Record<string, string | string[] | undefined>,
  schema: z.ZodSchema<T>,
): ValidationResult<T> {
  // Convert array params to strings (take first element)
  const normalized = Object.fromEntries(
    Object.entries(params).map(([key, value]) => [
      key,
      Array.isArray(value) ? value[0] : value,
    ]),
  );

  const result = schema.safeParse(normalized);

  if (!result.success) {
    const details = result.error.errors.map((err) => ({
      field: err.path.join("."),
      message: err.message,
    }));

    return {
      success: false,
      error: errorResponse("Invalid path parameters", 400, {
        code: ErrorCodes.VALIDATION_FAILED,
        details,
      }),
    };
  }

  return { success: true, data: result.data };
}

export default {
  objectIdSchema,
  dateSchema,
  timeSchema,
  emailSchema,
  passwordSchema,
  pinSchema,
  nameSchema,
  workDescriptionSchema,
  projectNameSchema,
  paginationSchema,
  dateRangeSchema,
  createTimeEntryBodySchema,
  updateTimeEntryBodySchema,
  updateProfileBodySchema,
  loginBodySchema,
  registerBodySchema,
  forgotPasswordBodySchema,
  resetPasswordBodySchema,
  verifyOtpBodySchema,
  setPinBodySchema,
  verifyPinBodySchema,
  exportRequestBodySchema,
  parseAndValidateBody,
  parseAndValidateQuery,
  parseAndValidateParams,
};
