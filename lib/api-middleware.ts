/**
 * API Route Middleware & Utilities
 *
 * Provides:
 * - withAuth wrapper for authenticated routes
 * - Standardized error responses
 * - Request validation utilities
 * - CSRF validation helper
 */

import { type NextRequest, NextResponse } from "next/server";
import { getUserFromSession } from "@/lib/auth";
import type { AuthUser } from "@/lib/types";
import { validateCsrf } from "@/lib/csrf";
import { rateLimit, buildRateLimitKey } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";
import { z } from "zod";

// Re-export AuthUser for convenience
export type { AuthUser };

/**
 * Rate limit configuration
 */
export interface RateLimitConfig {
  windowMs: number;
  max: number;
  key?: string;
}

/**
 * Standardized API Error Response
 */
export interface ApiError {
  error: string;
  code?: string;
  message?: string;
  details?: Array<{ field: string; message: string }> | Record<string, unknown>;
  status?: number;
}

/**
 * Standardized API Success Response
 */
export interface ApiSuccess<T = unknown> {
  data?: T;
  message?: string;
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    nextCursor?: string | null;
  };
}

/**
 * Error codes for consistent client handling
 */
export const ErrorCodes = {
  // Authentication errors (401)
  UNAUTHORIZED: "unauthorized",
  TOKEN_EXPIRED: "token_expired",
  INVALID_TOKEN: "invalid_token",

  // Authorization errors (403)
  FORBIDDEN: "forbidden",
  CSRF_INVALID: "csrf_invalid",
  INSUFFICIENT_PERMISSIONS: "insufficient_permissions",

  // Validation errors (400)
  VALIDATION_FAILED: "validation_failed",
  INVALID_INPUT: "invalid_input",
  MISSING_FIELD: "missing_field",
  INVALID_FORMAT: "invalid_format",

  // Resource errors (404)
  NOT_FOUND: "not_found",
  USER_NOT_FOUND: "user_not_found",
  ENTRY_NOT_FOUND: "entry_not_found",

  // Conflict errors (409)
  CONFLICT: "conflict",
  ALREADY_EXISTS: "already_exists",
  VERSION_CONFLICT: "version_conflict",

  // Rate limiting (429)
  RATE_LIMITED: "rate_limited",

  // Server errors (500)
  INTERNAL_ERROR: "internal_error",
  DATABASE_ERROR: "database_error",
  EXTERNAL_SERVICE_ERROR: "external_service_error",
} as const;

export type ErrorCode = (typeof ErrorCodes)[keyof typeof ErrorCodes];

/**
 * Create a standardized error response
 */
export function errorResponse(
  error: string,
  status: number = 400,
  options?: {
    code?: ErrorCode;
    details?: ApiError["details"];
    headers?: Record<string, string>;
  },
): NextResponse<ApiError> {
  const body: ApiError = {
    error,
    status,
    code: options?.code,
    details: options?.details,
  };

  logger.warn(`API Error: ${error}`, { status, code: options?.code });

  return NextResponse.json(body, {
    status,
    headers: options?.headers,
  });
}

/**
 * Create a standardized success response
 */
export function successResponse<T>(
  data?: T,
  options?: {
    message?: string;
    meta?: ApiSuccess["meta"];
    status?: number;
  },
): NextResponse<ApiSuccess<T>> {
  const body: ApiSuccess<T> = {
    data,
    message: options?.message,
    meta: options?.meta,
  };

  return NextResponse.json(body, {
    status: options?.status || 200,
  });
}

/**
 * Common error responses
 */
export const Errors = {
  unauthorized: (message = "Authentication required") =>
    errorResponse(message, 401, { code: ErrorCodes.UNAUTHORIZED }),

  forbidden: (message = "Access denied") =>
    errorResponse(message, 403, { code: ErrorCodes.FORBIDDEN }),

  csrfInvalid: () =>
    errorResponse("Invalid CSRF token", 403, { code: ErrorCodes.CSRF_INVALID }),

  notFound: (resource = "Resource") =>
    errorResponse(`${resource} not found`, 404, { code: ErrorCodes.NOT_FOUND }),

  validationFailed: (details: Array<{ field: string; message: string }>) =>
    errorResponse("Validation failed", 400, {
      code: ErrorCodes.VALIDATION_FAILED,
      details,
    }),

  rateLimited: (retryAfter: number) =>
    errorResponse("Too many requests", 429, {
      code: ErrorCodes.RATE_LIMITED,
      headers: { "Retry-After": String(retryAfter) },
    }),

  conflict: (message = "Resource already exists") =>
    errorResponse(message, 409, { code: ErrorCodes.CONFLICT }),

  internalError: (message = "Internal server error") =>
    errorResponse(message, 500, { code: ErrorCodes.INTERNAL_ERROR }),
};

/**
 * Handler function type for authenticated routes
 */
type AuthenticatedHandler = (
  request: NextRequest,
  user: AuthUser,
  context?: { params: Record<string, string> },
) => Promise<NextResponse>;

/**
 * Options for withAuth middleware
 */
interface WithAuthOptions {
  requireCsrf?: boolean;
  rateLimit?: RateLimitConfig & { key?: string };
}

/**
 * Middleware wrapper for authenticated routes
 * Handles authentication, CSRF validation, and rate limiting
 */
export function withAuth(
  handler: AuthenticatedHandler,
  options: WithAuthOptions = {},
): (
  request: NextRequest,
  context?: { params: Record<string, string> },
) => Promise<NextResponse> {
  const { requireCsrf = true, rateLimit: rateLimitConfig } = options;

  return async (
    request: NextRequest,
    context?: { params: Record<string, string> },
  ) => {
    const startTime = Date.now();
    const method = request.method;
    const path = new URL(request.url).pathname;

    try {
      // Authentication check
      const user = getUserFromSession(request);
      if (!user) {
        logger.warn("Unauthorized request", { method, path });
        return Errors.unauthorized();
      }

      // Rate limiting (if configured)
      if (rateLimitConfig) {
        const ip =
          request.headers.get("x-forwarded-for")?.split(",")[0] || "unknown";
        const key = rateLimitConfig.key
          ? buildRateLimitKey(ip, rateLimitConfig.key)
          : buildRateLimitKey(ip, `${method}:${path}`);

        const result = rateLimit(key, rateLimitConfig);
        if (!result.ok) {
          logger.warn("Rate limit exceeded", {
            method,
            path,
            userId: user._id,
          });
          return Errors.rateLimited(result.retryAfter ?? 60);
        }
      }

      // CSRF validation for state-changing methods
      if (requireCsrf && ["POST", "PUT", "DELETE", "PATCH"].includes(method)) {
        if (!validateCsrf(request)) {
          logger.warn("CSRF validation failed", {
            method,
            path,
            userId: user._id,
          });
          return Errors.csrfInvalid();
        }
      }

      // Execute handler
      const response = await handler(request, user, context);

      // Log response
      const duration = Date.now() - startTime;
      logger.response(method, path, response.status, duration);

      return response;
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error(`Request failed: ${method} ${path}`, error as Error);
      logger.response(method, path, 500, duration);

      return Errors.internalError();
    }
  };
}

/**
 * Options for withValidation middleware
 */
interface WithValidationOptions<T> {
  schema: z.ZodSchema<T>;
  source?: "body" | "query" | "params";
}

/**
 * Validate request body against a Zod schema
 */
export async function validateBody<T>(
  request: NextRequest,
  schema: z.ZodSchema<T>,
): Promise<{ data: T } | { error: NextResponse<ApiError> }> {
  try {
    const body = await request.json();
    const result = schema.safeParse(body);

    if (!result.success) {
      const details = result.error.errors.map((err) => ({
        field: err.path.join("."),
        message: err.message,
      }));
      return { error: Errors.validationFailed(details) };
    }

    return { data: result.data };
  } catch {
    return {
      error: errorResponse("Invalid JSON body", 400, {
        code: ErrorCodes.INVALID_INPUT,
      }),
    };
  }
}

/**
 * Validate query parameters against a Zod schema
 */
export function validateQuery<T>(
  request: NextRequest,
  schema: z.ZodSchema<T>,
): { data: T } | { error: NextResponse<ApiError> } {
  const searchParams = Object.fromEntries(new URL(request.url).searchParams);
  const result = schema.safeParse(searchParams);

  if (!result.success) {
    const details = result.error.errors.map((err) => ({
      field: err.path.join("."),
      message: err.message,
    }));
    return { error: Errors.validationFailed(details) };
  }

  return { data: result.data };
}

/**
 * Helper to extract and validate ObjectId from params
 */
export function validateObjectId(
  id: string | undefined,
  fieldName: string = "id",
):
  | { valid: true; id: string }
  | { valid: false; error: NextResponse<ApiError> } {
  if (!id || !/^[a-fA-F0-9]{24}$/.test(id)) {
    return {
      valid: false,
      error: errorResponse(`Invalid ${fieldName}`, 400, {
        code: ErrorCodes.INVALID_FORMAT,
        details: [{ field: fieldName, message: "Must be a valid ObjectId" }],
      }),
    };
  }
  return { valid: true, id };
}

/**
 * Get client IP from request
 */
export function getClientIp(request: NextRequest): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
    request.headers.get("x-real-ip") ||
    "unknown"
  );
}

/**
 * Parse pagination parameters
 */
export function parsePagination(
  request: NextRequest,
  defaults: { limit: number; maxLimit: number } = { limit: 20, maxLimit: 100 },
): { limit: number; cursor?: string; offset?: number } {
  const url = new URL(request.url);
  const limitParam = url.searchParams.get("limit");
  const cursor = url.searchParams.get("cursor") || undefined;
  const offsetParam = url.searchParams.get("offset");

  let limit = defaults.limit;
  if (limitParam) {
    const parsed = parseInt(limitParam, 10);
    if (!isNaN(parsed) && parsed > 0) {
      limit = Math.min(parsed, defaults.maxLimit);
    }
  }

  let offset: number | undefined;
  if (offsetParam) {
    const parsed = parseInt(offsetParam, 10);
    if (!isNaN(parsed) && parsed >= 0) {
      offset = parsed;
    }
  }

  return { limit, cursor, offset };
}

/**
 * Create paginated response
 */
export function paginatedResponse<T>(
  items: T[],
  options: {
    limit: number;
    cursor?: string | null;
    total?: number;
    nextCursor?: string | null;
  },
): NextResponse<ApiSuccess<T[]>> {
  return successResponse(items, {
    meta: {
      limit: options.limit,
      total: options.total,
      nextCursor: options.nextCursor,
    },
  });
}
