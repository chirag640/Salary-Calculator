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
  createdAt?: Date
  updatedAt?: Date
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
  password: string
  name: string
  createdAt?: Date
  updatedAt?: Date
}

export interface AuthUser {
  _id: string
  email: string
  name: string
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
