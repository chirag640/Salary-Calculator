/**
 * Structured Logger with Environment Awareness
 *
 * Features:
 * - Log level control based on environment
 * - Sensitive data sanitization
 * - Structured JSON output for production
 * - Colorful console output for development
 */

export type LogLevel = "debug" | "info" | "warn" | "error";

interface LogContext {
  [key: string]: unknown;
}

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: LogContext;
}

// Sensitive field patterns to sanitize
const SENSITIVE_PATTERNS = [
  /password/i,
  /token/i,
  /secret/i,
  /key/i,
  /otp/i,
  /pin/i,
  /authorization/i,
  /cookie/i,
  /session/i,
  /credential/i,
  /apikey/i,
  /api_key/i,
  /bearer/i,
];

// Fields to completely mask (show only length)
const MASK_FIELDS = [
  "password",
  "token",
  "otp",
  "pin",
  "secret",
  "apiKey",
  "api_key",
];

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

// Environment-based minimum log level
function getMinLogLevel(): number {
  const env = process.env.NODE_ENV;
  const logLevel = process.env.LOG_LEVEL as LogLevel | undefined;

  if (logLevel && LOG_LEVELS[logLevel] !== undefined) {
    return LOG_LEVELS[logLevel];
  }

  // Default levels by environment
  switch (env) {
    case "production":
      return LOG_LEVELS.warn; // Only warn and error in production
    case "test":
      return LOG_LEVELS.error; // Only errors in test
    default:
      return LOG_LEVELS.debug; // Everything in development
  }
}

/**
 * Sanitize sensitive data from log context
 */
function sanitizeValue(key: string, value: unknown): unknown {
  if (value === null || value === undefined) {
    return value;
  }

  // Check if key matches sensitive patterns
  const isSensitive = SENSITIVE_PATTERNS.some((pattern) => pattern.test(key));
  const shouldMask = MASK_FIELDS.some((field) =>
    key.toLowerCase().includes(field.toLowerCase()),
  );

  if (shouldMask && typeof value === "string") {
    return `[REDACTED:${value.length} chars]`;
  }

  if (isSensitive && typeof value === "string") {
    // Partially mask - show first 2 and last 2 chars for debugging
    if (value.length > 8) {
      return `${value.slice(0, 2)}${"*".repeat(Math.min(value.length - 4, 20))}${value.slice(-2)}`;
    }
    return "[REDACTED]";
  }

  if (typeof value === "object") {
    if (Array.isArray(value)) {
      return value.map((item, idx) => sanitizeValue(String(idx), item));
    }
    return sanitizeObject(value as Record<string, unknown>);
  }

  return value;
}

/**
 * Recursively sanitize object
 */
function sanitizeObject(obj: Record<string, unknown>): Record<string, unknown> {
  const sanitized: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(obj)) {
    sanitized[key] = sanitizeValue(key, value);
  }

  return sanitized;
}

/**
 * Format error for logging
 */
function formatError(error: unknown): Record<string, unknown> {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
    };
  }
  return { error: String(error) };
}

/**
 * Create a log entry
 */
function createLogEntry(
  level: LogLevel,
  message: string,
  context?: LogContext,
): LogEntry {
  return {
    timestamp: new Date().toISOString(),
    level,
    message,
    context: context ? sanitizeObject(context) : undefined,
  };
}

/**
 * Format log for development (colorful console)
 */
function formatDevelopment(entry: LogEntry): void {
  const colors = {
    debug: "\x1b[36m", // Cyan
    info: "\x1b[32m", // Green
    warn: "\x1b[33m", // Yellow
    error: "\x1b[31m", // Red
  };
  const reset = "\x1b[0m";
  const color = colors[entry.level];

  const prefix = `${color}[${entry.level.toUpperCase()}]${reset} ${entry.timestamp}`;

  if (entry.context) {
    console.log(prefix, entry.message, entry.context);
  } else {
    console.log(prefix, entry.message);
  }
}

/**
 * Format log for production (JSON)
 */
function formatProduction(entry: LogEntry): void {
  // In production, output structured JSON for log aggregation
  console.log(JSON.stringify(entry));
}

/**
 * Main log function
 */
function log(level: LogLevel, message: string, context?: LogContext): void {
  const minLevel = getMinLogLevel();

  if (LOG_LEVELS[level] < minLevel) {
    return; // Skip logs below minimum level
  }

  const entry = createLogEntry(level, message, context);

  if (process.env.NODE_ENV === "production") {
    formatProduction(entry);
  } else {
    formatDevelopment(entry);
  }
}

/**
 * Logger instance with convenient methods
 */
export const logger = {
  debug: (message: string, context?: LogContext) =>
    log("debug", message, context),
  info: (message: string, context?: LogContext) =>
    log("info", message, context),
  warn: (message: string, context?: LogContext) =>
    log("warn", message, context),
  error: (message: string, context?: LogContext | Error) => {
    if (context instanceof Error) {
      log("error", message, formatError(context));
    } else {
      log("error", message, context);
    }
  },

  /**
   * Log API request (sanitizes headers automatically)
   */
  request: (method: string, path: string, context?: LogContext) => {
    log("info", `${method} ${path}`, context);
  },

  /**
   * Log API response
   */
  response: (
    method: string,
    path: string,
    status: number,
    durationMs?: number,
  ) => {
    const level: LogLevel =
      status >= 500 ? "error" : status >= 400 ? "warn" : "info";
    log(
      level,
      `${method} ${path} ${status}`,
      durationMs ? { durationMs } : undefined,
    );
  },

  /**
   * Log database operation
   */
  db: (operation: string, collection: string, context?: LogContext) => {
    log("debug", `DB ${operation} on ${collection}`, context);
  },

  /**
   * Create a child logger with preset context
   */
  child: (baseContext: LogContext) => ({
    debug: (message: string, context?: LogContext) =>
      log("debug", message, { ...baseContext, ...context }),
    info: (message: string, context?: LogContext) =>
      log("info", message, { ...baseContext, ...context }),
    warn: (message: string, context?: LogContext) =>
      log("warn", message, { ...baseContext, ...context }),
    error: (message: string, context?: LogContext | Error) => {
      if (context instanceof Error) {
        log("error", message, { ...baseContext, ...formatError(context) });
      } else {
        log("error", message, { ...baseContext, ...context });
      }
    },
  }),
};

export default logger;
