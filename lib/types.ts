export interface TimeEntry {
  _id?: string;
  userId: string; // Added for user-specific data isolation
  date: string; // YYYY-MM-DD format
  timeIn: string; // HH:mm format
  timeOut: string; // HH:mm format
  breakMinutes: number;
  hourlyRate: number;
  totalHours: number;
  totalEarnings: number;
  workDescription: string;
  client?: string;
  project?: string;
  leave?: LeaveEntry;
  // Holiday / weekend work flags
  isHolidayWork?: boolean;
  holidayCategory?: "sunday" | "saturday" | "other";
  isHolidayExtra?: boolean; // when true, time range represents extra hours in addition to base holiday hours
  // Timer fields for persistent timers
  timer?: TimerState;
  createdAt?: Date;
  updatedAt?: Date;
  deletedAt?: Date | null; // soft delete marker; null/undefined means active

  // Google Calendar sync fields (opt-in)
  // (Google Calendar sync fields removed)
  // If you previously relied on calendar sync, any existing DB fields will be ignored by the app.
}

export interface TimerState {
  isRunning: boolean;
  status?: "running" | "paused" | "stopped"; // Timer status for UI display
  startedAt?: Date; // ISO timestamp when timer started
  pausedAt?: Date[]; // Array of pause timestamps
  resumedAt?: Date[]; // Array of resume timestamps
  stoppedAt?: Date; // When timer was stopped (cannot be resumed after this)
  lastHeartbeatAt?: Date; // Last client heartbeat timestamp
  accumulatedSeconds: number; // Total seconds accumulated across all sessions
  idleThresholdMinutes?: number; // Configurable idle detection threshold (default 10)
}

export type LeaveType = "Sick" | "Vacation" | "Personal" | "Holiday" | "Other";

export interface LeaveEntry {
  isLeave: boolean;
  leaveType?: LeaveType;
  leaveReason?: string;
}

export interface TimeCalculation {
  totalHours: number;
  totalEarnings: number;
}

export interface SummaryData {
  totalHours: number;
  totalEarnings: number;
  entriesCount: number;
  leaveCount: number;
}

export interface ProjectSummary {
  project: string;
  client: string;
  hours: number;
  earnings: number;
}

export interface PeriodSummary {
  daily: { [date: string]: SummaryData };
  weekly: { [week: string]: SummaryData };
  monthly: { [month: string]: SummaryData };
  projects: ProjectSummary[];
}

export interface User {
  _id?: string;
  email: string;
  password?: string; // Optional now (for OAuth-only users)
  name: string;
  isVerified: boolean; // Email verification status
  passwordResetToken?: string; // hashed token (sha256)
  passwordResetExpires?: Date; // expiry timestamp
  googleId?: string; // Google OAuth ID
  contact?: {
    phone?: string;
    addressLine1?: string;
    addressLine2?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
  };
  // Salary & working configuration lives on the user document
  salaryHistory?: SalaryRecord[];
  workingConfig?: WorkingConfig; // Current defaults for working hours etc. (used when creating new salary records)
  overtime?: OvertimeConfig;
  paymentConfig?: PaymentConfig; // Complete payment configuration for payslip generation
  profileComplete?: boolean; // Whether user has completed initial profile setup (salary, PIN)
  showEarnings?: boolean; // Whether to show earnings and monetary values in UI (default: false for privacy)
  createdAt?: Date;
  updatedAt?: Date;
}

export interface AuthUser {
  _id: string;
  email: string;
  name: string;
  isVerified?: boolean;
  profileComplete?: boolean;
  pinSetup?: boolean;
}

// OTP verification for registration and magic links
export interface AuthOTP {
  _id?: string;
  email: string;
  otpHash: string; // bcrypt hash of the OTP code
  expiresAt: Date;
  used: boolean;
  attempts: number;
  purpose: "registration" | "login" | "link-account"; // Purpose of OTP
  createdAt: Date;
}

// OAuth integrations storage
export interface OAuthIntegration {
  _id?: string;
  userId: string;
  provider: "google"; // Extensible for other providers
  providerId: string; // Provider's user ID
  email: string; // Email from provider
  accessToken?: string; // Encrypted token
  refreshToken?: string; // Encrypted token
  tokenExpiry?: Date;
  scopes: string[];
  createdAt: Date;
  updatedAt: Date;
}

// Session/refresh token storage (optional)
export interface RefreshToken {
  _id?: string;
  userId: string;
  tokenHash: string; // bcrypt hash of refresh token
  expiresAt: Date;
  createdAt: Date;
  deviceInfo?: string;
  ipAddress?: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterCredentials {
  email: string;
  password: string;
  name: string;
}

// ---- Salary & Profile types ----

export type SalaryType = "monthly" | "annual";

export interface WorkingConfig {
  hoursPerDay: number; // e.g., 8
  daysPerMonth: number; // e.g., 22 (configurable)
}

export interface OvertimeConfig {
  enabled: boolean;
  thresholdHoursPerDay: number; // e.g., 8
  multiplier: number; // e.g., 1.5
}

export interface SalaryRecord {
  salaryType: SalaryType;
  amount: number; // salary amount in currency units
  effectiveFrom: string; // YYYY-MM-DD (inclusive)
  working: WorkingConfig; // working hours at the time of this salary
  note?: string;
  createdAt?: Date;
}

export interface ProfileResponse {
  _id: string;
  email: string;
  name: string;
  username?: string;
  contact?: User["contact"];
  workingConfig?: WorkingConfig;
  overtime?: OvertimeConfig;
  paymentConfig?: PaymentConfig;
  salaryHistory: SalaryRecord[];
  currentSalary?: {
    amount: number;
    salaryType: SalaryType;
  };
  defaultHourlyRate?: number;
  showEarnings?: boolean;
}

export interface UpdateProfileRequest {
  name?: string;
  username?: string;
  defaultHourlyRate?: number;
  contact?: User["contact"];
  workingConfig?: WorkingConfig;
  overtime?: OvertimeConfig;
  paymentConfig?: PaymentConfig;
  profileComplete?: boolean;
}

export interface AddSalaryIncrementRequest {
  salaryType: SalaryType;
  amount: number;
  effectiveFrom: string; // YYYY-MM-DD
  working?: Partial<WorkingConfig>;
  note?: string;
}

export interface HourlyRateResponse {
  date: string;
  hourlyRate: number;
}

export interface TimerActionResponse {
  success: boolean;
  timer: TimerState;
  entry: TimeEntry;
}

export interface IdleDetectionPrompt {
  detectedIdleSeconds: number;
  idleStartedAt: Date;
  suggestedCorrection: {
    discardIdleTime: boolean;
    adjustedSeconds: number;
  };
}

// ---- Payment & Payslip Configuration Types ----
// Optimized for MongoDB storage - compact, denormalized where appropriate

/**
 * Salary cycle configuration
 * Compact: only store what differs from default (calendar month)
 */
export interface SalaryCycleConfig {
  /** Day of month when salary cycle starts (1-28). Default: 1 */
  cycleStartDay: number;
  /** Whether to use calendar month (1st-last). Default: true */
  useCalendarMonth: boolean;
}

/**
 * Weekly off configuration - Optimized with saturdayMode enum
 * Storage: ~20-50 bytes vs 100+ with legacy flags
 */
export interface WeeklyOffsConfig {
  /** Days that are weekly offs (0=Sun...6=Sat). Stored as small int array */
  offDays: number[];
  /** Saturday work pattern - single enum replaces 3 boolean flags */
  saturdayMode?:
    | "all-off"
    | "working"
    | "alternate-1-3"
    | "alternate-2-4"
    | "half-day";
  // Legacy flags (deprecated - kept for backward compatibility)
  /** @deprecated Use saturdayMode='alternate-2-4' */
  secondSaturdayOff?: boolean;
  /** @deprecated Use saturdayMode='alternate-2-4' */
  fourthSaturdayOff?: boolean;
  /** @deprecated Use saturdayMode='half-day' */
  saturdayHalfDay?: boolean;
}

/**
 * Leave allowance - Compact monthly/yearly quotas
 */
export interface LeaveAllowanceConfig {
  /** Casual leave days per month (0-5) */
  casualLeavePerMonth: number;
  /** Sick leave days per month (0-5) */
  sickLeavePerMonth: number;
  /** Earned/privilege leave per year (0-30) */
  earnedLeavePerYear: number;
  /** Allow unused leave to carry forward */
  carryForwardEnabled: boolean;
  /** Max days that can be carried forward */
  maxCarryForwardDays: number;
}

/**
 * Overtime settings - Multipliers stored as decimals
 */
export interface OvertimeSettings {
  /** Enable overtime calculation */
  enabled: boolean;
  /** Hours/day before OT kicks in (typically 8-10) */
  thresholdHoursPerDay: number;
  /** Regular OT multiplier (1.0-3.0, e.g., 1.5 = time-and-a-half) */
  regularMultiplier: number;
  /** Weekend OT multiplier (1.0-3.0, e.g., 2.0 = double time) */
  weekendMultiplier: number;
  /** Holiday OT multiplier (1.0-4.0) */
  holidayMultiplier: number;
  /** Monthly OT cap in hours (0 = unlimited) */
  maxOvertimeHoursPerMonth?: number;
}

/**
 * Tax & Statutory Deductions
 * Percentages stored as decimals (12.5 = 12.5%, not 0.125)
 */
export interface TaxDeductionConfig {
  /** Master switch for tax calculations */
  taxEnabled: boolean;
  /** Tax regime: 'old'|'new' (India) or 'standard' */
  taxRegime?: "old" | "new" | "standard";
  /** Fixed tax % if using simple calculation */
  fixedTaxPercentage?: number;
  /** Professional tax (fixed monthly amount) */
  professionalTax?: number;
  /** PF/EPF contribution % (typically 12%) */
  pfPercentage?: number;
  /** Health insurance (fixed monthly amount) */
  healthInsurance?: number;
  /** Custom deductions array - kept sparse, only store if used */
  otherDeductions?: Array<{
    name: string; // max 50 chars
    amount: number; // amount or percentage value
    isPercentage: boolean;
  }>;
}

/**
 * Allowances - All optional, only store non-zero values
 * Amounts in smallest currency unit or percentage based on context
 */
export interface AllowancesConfig {
  /** House Rent Allowance (typically % of basic or fixed) */
  hra?: number;
  /** Dearness Allowance */
  da?: number;
  /** Transport/Conveyance Allowance */
  transportAllowance?: number;
  /** Medical Allowance */
  medicalAllowance?: number;
  /** Special Allowance (catch-all for CTC adjustments) */
  specialAllowance?: number;
  /** Custom allowances - kept sparse */
  otherAllowances?: Array<{ name: string; amount: number }>;
}

/**
 * Complete Payment Configuration
 *
 * MongoDB Storage Optimization:
 * - Nested objects kept shallow (max 2 levels)
 * - Arrays only where truly variable-length
 * - Enums instead of multiple booleans
 * - Optional fields omitted when default
 *
 * Estimated document size: 500-800 bytes (vs 1500+ unoptimized)
 */
export interface PaymentConfig {
  /** Salary cycle settings */
  salaryCycle: SalaryCycleConfig;
  /** Weekly off configuration */
  weeklyOffs: WeeklyOffsConfig;
  /** Leave quotas */
  leaveAllowance: LeaveAllowanceConfig;
  /** Overtime rules */
  overtime: OvertimeSettings;
  /** Tax & deductions (optional - omit if disabled) */
  taxDeductions: TaxDeductionConfig;
  /** Allowances (optional - omit if all zero) */
  allowances: AllowancesConfig;
  /** ISO 4217 currency code */
  currency: string;
  /** BCP 47 locale tag */
  locale: string;
}

/**
 * Generated payslip data
 */
export interface PayslipData {
  /** Unique payslip ID */
  id: string;
  /** User ID */
  userId: string;
  /** Pay period start date (YYYY-MM-DD) */
  periodStart: string;
  /** Pay period end date (YYYY-MM-DD) */
  periodEnd: string;
  /** Generation timestamp */
  generatedAt: Date;

  /** Period summary */
  period: {
    totalDays: number;
    workingDays: number;
    weeklyOffs: number;
    holidays: number;
  };

  /** Attendance summary */
  attendance: {
    daysPresent: number;
    daysAbsent: number;
    halfDays: number;
    lateArrivals: number;
    paidLeave: number;
    unpaidLeave: number;
    overtimeHours: number;
    weekendWorkDays: number;
    totalHoursWorked: number;
    expectedHours: number;
  };

  /** Earnings breakdown */
  earnings: {
    basicPay: number;
    hra: number;
    da: number;
    transportAllowance: number;
    medicalAllowance: number;
    specialAllowance: number;
    otherAllowances: number;
    overtimePay: number;
    weekendPay: number;
    holidayPay: number;
    performanceBonus: number;
    otherBonuses: number;
    grossEarnings: number;
  };

  /** Deductions breakdown */
  deductions: {
    incomeTax: number;
    professionalTax: number;
    providentFund: number;
    healthInsurance: number;
    unpaidLeaveDeduction: number;
    lateDeduction: number;
    otherDeductions: number;
    totalDeductions: number;
  };

  /** Final amounts */
  summary: {
    grossSalary: number;
    totalDeductions: number;
    netSalary: number;
    paymentMode?: string;
  };
}

/**
 * Default payment configuration
 * Used for initializing new users and filling missing values
 */
export const DEFAULT_PAYMENT_CONFIG: PaymentConfig = {
  salaryCycle: {
    cycleStartDay: 1,
    useCalendarMonth: true,
  },
  weeklyOffs: {
    offDays: [0], // Sunday off by default
    saturdayMode: "working",
  },
  leaveAllowance: {
    casualLeavePerMonth: 1,
    sickLeavePerMonth: 1,
    earnedLeavePerYear: 15,
    carryForwardEnabled: false,
    maxCarryForwardDays: 0,
  },
  overtime: {
    enabled: false,
    thresholdHoursPerDay: 8,
    regularMultiplier: 1.5,
    weekendMultiplier: 2,
    holidayMultiplier: 2.5,
    maxOvertimeHoursPerMonth: 50,
  },
  taxDeductions: {
    taxEnabled: false,
  },
  allowances: {},
  currency: "INR",
  locale: "en-IN",
};

/**
 * Compact a PaymentConfig for database storage
 * Removes default values and empty objects to minimize document size
 */
export function compactPaymentConfig(
  config: PaymentConfig,
): Partial<PaymentConfig> {
  const compact: Partial<PaymentConfig> = {};
  const defaults = DEFAULT_PAYMENT_CONFIG;

  // Salary cycle - only store if non-default
  if (
    config.salaryCycle.cycleStartDay !== 1 ||
    !config.salaryCycle.useCalendarMonth
  ) {
    compact.salaryCycle = config.salaryCycle;
  }

  // Weekly offs - always store (critical for calculations)
  compact.weeklyOffs = {
    offDays: config.weeklyOffs.offDays,
    saturdayMode: config.weeklyOffs.saturdayMode,
  };

  // Leave allowance - only store non-default values
  const leave = config.leaveAllowance;
  const defLeave = defaults.leaveAllowance;
  if (
    leave.casualLeavePerMonth !== defLeave.casualLeavePerMonth ||
    leave.sickLeavePerMonth !== defLeave.sickLeavePerMonth ||
    leave.earnedLeavePerYear !== defLeave.earnedLeavePerYear ||
    leave.carryForwardEnabled !== defLeave.carryForwardEnabled ||
    leave.maxCarryForwardDays !== defLeave.maxCarryForwardDays
  ) {
    compact.leaveAllowance = leave;
  }

  // Overtime - only store if enabled or non-default multipliers
  if (config.overtime.enabled) {
    compact.overtime = config.overtime;
  }

  // Tax - only store if enabled
  if (config.taxDeductions.taxEnabled) {
    compact.taxDeductions = config.taxDeductions;
  }

  // Allowances - only store non-zero values
  const allowances: AllowancesConfig = {};
  if (config.allowances.hra) allowances.hra = config.allowances.hra;
  if (config.allowances.da) allowances.da = config.allowances.da;
  if (config.allowances.transportAllowance)
    allowances.transportAllowance = config.allowances.transportAllowance;
  if (config.allowances.medicalAllowance)
    allowances.medicalAllowance = config.allowances.medicalAllowance;
  if (config.allowances.specialAllowance)
    allowances.specialAllowance = config.allowances.specialAllowance;
  if (config.allowances.otherAllowances?.length)
    allowances.otherAllowances = config.allowances.otherAllowances;
  if (Object.keys(allowances).length > 0) {
    compact.allowances = allowances;
  }

  // Currency/locale - only store if non-default
  if (config.currency !== "INR") compact.currency = config.currency;
  if (config.locale !== "en-IN") compact.locale = config.locale;

  return compact;
}

/**
 * Expand a compact PaymentConfig from database to full config
 * Fills in missing values with defaults
 */
export function expandPaymentConfig(
  compact: Partial<PaymentConfig> | undefined,
): PaymentConfig {
  if (!compact) return { ...DEFAULT_PAYMENT_CONFIG };

  return {
    salaryCycle: compact.salaryCycle || DEFAULT_PAYMENT_CONFIG.salaryCycle,
    weeklyOffs: {
      ...DEFAULT_PAYMENT_CONFIG.weeklyOffs,
      ...compact.weeklyOffs,
    },
    leaveAllowance:
      compact.leaveAllowance || DEFAULT_PAYMENT_CONFIG.leaveAllowance,
    overtime: compact.overtime || DEFAULT_PAYMENT_CONFIG.overtime,
    taxDeductions:
      compact.taxDeductions || DEFAULT_PAYMENT_CONFIG.taxDeductions,
    allowances: compact.allowances || DEFAULT_PAYMENT_CONFIG.allowances,
    currency: compact.currency || DEFAULT_PAYMENT_CONFIG.currency,
    locale: compact.locale || DEFAULT_PAYMENT_CONFIG.locale,
  };
}
