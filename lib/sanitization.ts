/**
 * Input Sanitization Utilities
 *
 * Provides comprehensive input sanitization for:
 * - XSS prevention
 * - SQL/NoSQL injection prevention
 * - Path traversal prevention
 * - General input cleaning
 */

/**
 * Sanitize string to prevent XSS attacks
 * Escapes HTML special characters
 */
export function escapeHtml(str: string): string {
  const htmlEscapes: Record<string, string> = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#x27;",
    "/": "&#x2F;",
    "`": "&#x60;",
    "=": "&#x3D;",
  };

  return str.replace(/[&<>"'`=\/]/g, (char) => htmlEscapes[char]);
}

/**
 * Remove HTML tags from string
 */
export function stripHtml(str: string): string {
  return str.replace(/<[^>]*>/g, "");
}

/**
 * Sanitize string for safe storage and display
 * Removes potentially dangerous characters while preserving readability
 */
export function sanitizeString(
  str: string,
  options: {
    maxLength?: number;
    allowHtml?: boolean;
    trim?: boolean;
    normalizeWhitespace?: boolean;
  } = {},
): string {
  const {
    maxLength = 10000,
    allowHtml = false,
    trim = true,
    normalizeWhitespace = true,
  } = options;

  let result = str;

  // Strip HTML if not allowed
  if (!allowHtml) {
    result = stripHtml(result);
  }

  // Escape HTML entities
  result = escapeHtml(result);

  // Normalize whitespace
  if (normalizeWhitespace) {
    result = result.replace(/\s+/g, " ");
  }

  // Trim
  if (trim) {
    result = result.trim();
  }

  // Enforce max length
  if (maxLength && result.length > maxLength) {
    result = result.slice(0, maxLength);
  }

  return result;
}

/**
 * Sanitize work description (common use case)
 */
export function sanitizeWorkDescription(description: string): string {
  return sanitizeString(description, {
    maxLength: 2000,
    allowHtml: false,
    trim: true,
    normalizeWhitespace: false, // Preserve line breaks
  }).replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, ""); // Remove control chars except newline/tab
}

/**
 * Sanitize project/client name
 */
export function sanitizeProjectName(name: string): string {
  return sanitizeString(name, {
    maxLength: 200,
    allowHtml: false,
    trim: true,
    normalizeWhitespace: true,
  }).replace(/[^\w\s\-_.]/g, ""); // Allow only word chars, spaces, hyphens, underscores, dots
}

/**
 * Sanitize file path to prevent path traversal
 */
export function sanitizeFilePath(path: string): string {
  // Remove null bytes
  let sanitized = path.replace(/\0/g, "");

  // Remove path traversal sequences
  sanitized = sanitized.replace(/\.\.\//g, "");
  sanitized = sanitized.replace(/\.\.\\/, "");
  sanitized = sanitized.replace(/\.\./g, "");

  // Remove absolute path indicators
  sanitized = sanitized.replace(/^\/+/, "");
  sanitized = sanitized.replace(/^[a-zA-Z]:/, "");

  // Remove special characters that could be dangerous
  sanitized = sanitized.replace(/[<>:"|?*\x00-\x1F]/g, "");

  return sanitized;
}

/**
 * Validate and sanitize filename
 */
export function sanitizeFilename(filename: string): string {
  // Remove path components
  let sanitized = filename.split(/[\/\\]/).pop() || "";

  // Remove null bytes and control characters
  sanitized = sanitized.replace(/[\x00-\x1F\x7F]/g, "");

  // Remove or replace dangerous characters
  sanitized = sanitized.replace(/[<>:"|?*\/\\]/g, "_");

  // Limit length
  if (sanitized.length > 255) {
    const ext = sanitized.split(".").pop() || "";
    const name = sanitized.slice(0, 250 - ext.length);
    sanitized = ext ? `${name}.${ext}` : name;
  }

  // Prevent empty filename
  if (!sanitized || sanitized === "." || sanitized === "..") {
    sanitized = "unnamed";
  }

  return sanitized;
}

/**
 * Sanitize MongoDB query operators to prevent NoSQL injection
 */
export function sanitizeMongoQuery<T extends Record<string, unknown>>(
  obj: T,
): T {
  if (typeof obj !== "object" || obj === null) {
    return obj;
  }

  const sanitized = { ...obj };

  for (const [key, value] of Object.entries(sanitized)) {
    // Remove keys starting with $ (MongoDB operators)
    if (key.startsWith("$")) {
      delete (sanitized as Record<string, unknown>)[key];
      continue;
    }

    // Recursively sanitize nested objects
    if (typeof value === "object" && value !== null) {
      (sanitized as Record<string, unknown>)[key] = sanitizeMongoQuery(
        value as Record<string, unknown>,
      );
    }

    // Prevent prototype pollution
    if (key === "__proto__" || key === "constructor" || key === "prototype") {
      delete (sanitized as Record<string, unknown>)[key];
    }
  }

  return sanitized;
}

/**
 * Validate email format strictly
 */
export function isValidEmailStrict(email: string): boolean {
  // More strict email validation
  const emailRegex =
    /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;

  if (!emailRegex.test(email)) {
    return false;
  }

  // Additional checks
  const [localPart, domain] = email.split("@");

  // Local part constraints
  if (localPart.length > 64) return false;
  if (localPart.startsWith(".") || localPart.endsWith(".")) return false;
  if (localPart.includes("..")) return false;

  // Domain constraints
  if (domain.length > 255) return false;
  if (domain.startsWith("-") || domain.endsWith("-")) return false;

  return true;
}

/**
 * Sanitize URL to prevent open redirect
 */
export function sanitizeRedirectUrl(
  url: string,
  allowedHosts: string[],
): string | null {
  try {
    // Allow relative URLs
    if (url.startsWith("/") && !url.startsWith("//")) {
      // Ensure it doesn't contain protocol-relative URLs
      return url;
    }

    const parsed = new URL(url);

    // Check if host is allowed
    if (allowedHosts.includes(parsed.host)) {
      return url;
    }

    // Not allowed
    return null;
  } catch {
    // Invalid URL - check if it's a safe relative path
    if (/^\/[a-zA-Z0-9\-._~:/?#\[\]@!$&'()*+,;=%]+$/.test(url)) {
      return url;
    }
    return null;
  }
}

/**
 * Sanitize date string input
 */
export function sanitizeDateString(dateStr: string): string | null {
  // Only allow YYYY-MM-DD format
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return null;
  }

  // Validate it's a real date
  const date = new Date(dateStr + "T00:00:00Z");
  if (isNaN(date.getTime())) {
    return null;
  }

  // Ensure the date string represents the actual date
  const [year, month, day] = dateStr.split("-").map(Number);
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() + 1 !== month ||
    date.getUTCDate() !== day
  ) {
    return null;
  }

  return dateStr;
}

/**
 * Sanitize time string input (HH:mm format)
 */
export function sanitizeTimeString(timeStr: string): string | null {
  if (!/^\d{2}:\d{2}$/.test(timeStr)) {
    return null;
  }

  const [hours, minutes] = timeStr.split(":").map(Number);
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
    return null;
  }

  return timeStr;
}

/**
 * Deep clone and sanitize object for safe logging
 */
export function sanitizeForLogging<T extends Record<string, unknown>>(
  obj: T,
  sensitiveKeys: string[] = [
    "password",
    "token",
    "secret",
    "otp",
    "pin",
    "key",
    "authorization",
  ],
): T {
  if (typeof obj !== "object" || obj === null) {
    return obj;
  }

  const sanitized = { ...obj };

  for (const [key, value] of Object.entries(sanitized)) {
    const lowerKey = key.toLowerCase();

    if (sensitiveKeys.some((sk) => lowerKey.includes(sk.toLowerCase()))) {
      (sanitized as Record<string, unknown>)[key] = "[REDACTED]";
    } else if (typeof value === "object" && value !== null) {
      (sanitized as Record<string, unknown>)[key] = sanitizeForLogging(
        value as Record<string, unknown>,
        sensitiveKeys,
      );
    }
  }

  return sanitized;
}

/**
 * Validate ObjectId string format (MongoDB)
 */
export function isValidObjectId(str: string): boolean {
  return /^[a-fA-F0-9]{24}$/.test(str);
}

/**
 * Create sanitization middleware for API routes
 */
export function createSanitizedBody<T extends Record<string, unknown>>(
  body: unknown,
  sanitizers: Partial<Record<keyof T, (value: unknown) => unknown>>,
): T {
  if (typeof body !== "object" || body === null) {
    throw new Error("Invalid request body");
  }

  const result: Record<string, unknown> = {};

  for (const [key, sanitizer] of Object.entries(sanitizers)) {
    const value = (body as Record<string, unknown>)[key];
    if (value !== undefined) {
      result[key] = sanitizer ? sanitizer(value) : value;
    }
  }

  return result as T;
}

export default {
  escapeHtml,
  stripHtml,
  sanitizeString,
  sanitizeWorkDescription,
  sanitizeProjectName,
  sanitizeFilePath,
  sanitizeFilename,
  sanitizeMongoQuery,
  isValidEmailStrict,
  sanitizeRedirectUrl,
  sanitizeDateString,
  sanitizeTimeString,
  sanitizeForLogging,
  isValidObjectId,
  createSanitizedBody,
};
