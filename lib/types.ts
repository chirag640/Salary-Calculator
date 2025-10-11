export interface TimeEntry {
  _id?: string
  userId: string // Added for user-specific data isolation
  date: string // YYYY-MM-DD format
  timeIn: string // HH:mm format
  timeOut: string // HH:mm format
  breakMinutes: number
  hourlyRate: number
  totalHours: number
  totalEarnings: number
  workDescription: string
  client?: string
  project?: string
  leave?: LeaveEntry
  // Holiday / weekend work flags
  isHolidayWork?: boolean
  holidayCategory?: "sunday" | "saturday" | "other"
  isHolidayExtra?: boolean // when true, time range represents extra hours in addition to base holiday hours
  // Timer fields for persistent timers
  timer?: TimerState
  createdAt?: Date
  updatedAt?: Date
  deletedAt?: Date | null // soft delete marker; null/undefined means active

  // Google Calendar sync fields (opt-in)
  // (Google Calendar sync fields removed)
  // If you previously relied on calendar sync, any existing DB fields will be ignored by the app.
}

export interface TimerState {
  isRunning: boolean
  status?: "running" | "paused" | "stopped" // Timer status for UI display
  startedAt?: Date // ISO timestamp when timer started
  pausedAt?: Date[] // Array of pause timestamps
  resumedAt?: Date[] // Array of resume timestamps
  stoppedAt?: Date // When timer was stopped (cannot be resumed after this)
  lastHeartbeatAt?: Date // Last client heartbeat timestamp
  accumulatedSeconds: number // Total seconds accumulated across all sessions
  idleThresholdMinutes?: number // Configurable idle detection threshold (default 10)
}

export type LeaveType = "Sick" | "Vacation" | "Personal" | "Holiday" | "Other"

export interface LeaveEntry {
  isLeave: boolean
  leaveType?: LeaveType
  leaveReason?: string
}

export interface TimeCalculation {
  totalHours: number
  totalEarnings: number
}

export interface SummaryData {
  totalHours: number
  totalEarnings: number
  entriesCount: number
  leaveCount: number
}

export interface ProjectSummary {
  project: string
  client: string
  hours: number
  earnings: number
}

export interface PeriodSummary {
  daily: { [date: string]: SummaryData }
  weekly: { [week: string]: SummaryData }
  monthly: { [month: string]: SummaryData }
  projects: ProjectSummary[]
}

export interface User {
  _id?: string
  email: string
  password?: string // Optional now (for OAuth-only users)
  name: string
  isVerified: boolean // Email verification status
  passwordResetToken?: string // hashed token (sha256)
  passwordResetExpires?: Date // expiry timestamp
  googleId?: string // Google OAuth ID
  contact?: {
    phone?: string
    addressLine1?: string
    addressLine2?: string
    city?: string
    state?: string
    postalCode?: string
    country?: string
  }
  // Salary & working configuration lives on the user document
  salaryHistory?: SalaryRecord[]
  workingConfig?: WorkingConfig // Current defaults for working hours etc. (used when creating new salary records)
  overtime?: OvertimeConfig
  createdAt?: Date
  updatedAt?: Date
}

export interface AuthUser {
  _id: string
  email: string
  name: string
  isVerified?: boolean
}

// OTP verification for registration and magic links
export interface AuthOTP {
  _id?: string
  email: string
  otpHash: string // bcrypt hash of the OTP code
  expiresAt: Date
  used: boolean
  attempts: number
  purpose: "registration" | "login" | "link-account" // Purpose of OTP
  createdAt: Date
}

// OAuth integrations storage
export interface OAuthIntegration {
  _id?: string
  userId: string
  provider: "google" // Extensible for other providers
  providerId: string // Provider's user ID
  email: string // Email from provider
  accessToken?: string // Encrypted token
  refreshToken?: string // Encrypted token
  tokenExpiry?: Date
  scopes: string[]
  createdAt: Date
  updatedAt: Date
}

// Session/refresh token storage (optional)
export interface RefreshToken {
  _id?: string
  userId: string
  tokenHash: string // bcrypt hash of refresh token
  expiresAt: Date
  createdAt: Date
  deviceInfo?: string
  ipAddress?: string
}

export interface LoginCredentials {
  email: string
  password: string
}

export interface RegisterCredentials {
  email: string
  password: string
  name: string
}

// ---- Salary & Profile types ----

export type SalaryType = "monthly" | "annual"

export interface WorkingConfig {
  hoursPerDay: number // e.g., 8
  daysPerMonth: number // e.g., 22 (configurable)
}

export interface OvertimeConfig {
  enabled: boolean
  thresholdHoursPerDay: number // e.g., 8
  multiplier: number // e.g., 1.5
}

export interface SalaryRecord {
  salaryType: SalaryType
  amount: number // salary amount in currency units
  effectiveFrom: string // YYYY-MM-DD (inclusive)
  working: WorkingConfig // working hours at the time of this salary
  note?: string
  createdAt?: Date
}

export interface ProfileResponse {
  _id: string
  email: string
  name: string
  username?: string
  contact?: User["contact"]
  workingConfig?: WorkingConfig
  overtime?: OvertimeConfig
  salaryHistory: SalaryRecord[]
  currentSalary?: {
    amount: number
    salaryType: SalaryType
  }
  defaultHourlyRate?: number
}

export interface UpdateProfileRequest {
  name?: string
  username?: string
  defaultHourlyRate?: number
  contact?: User["contact"]
  workingConfig?: WorkingConfig
  overtime?: OvertimeConfig
}

export interface AddSalaryIncrementRequest {
  salaryType: SalaryType
  amount: number
  effectiveFrom: string // YYYY-MM-DD
  working?: Partial<WorkingConfig>
  note?: string
}

export interface HourlyRateResponse {
  date: string
  hourlyRate: number
}

export interface TimerActionResponse {
  success: boolean
  timer: TimerState
  entry: TimeEntry
}

export interface IdleDetectionPrompt {
  detectedIdleSeconds: number
  idleStartedAt: Date
  suggestedCorrection: {
    discardIdleTime: boolean
    adjustedSeconds: number
  }
}
