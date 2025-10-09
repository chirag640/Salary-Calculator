// Notification types and configuration
export type NotificationType = 
  | 'IDLE_TIMER'
  | 'TIMER_REMINDER'
  | 'DAILY_SUMMARY'
  | 'WEEKLY_SUMMARY'
  | 'MONTHLY_SUMMARY'
  | 'OVERDUE_INVOICE'
  | 'HOURLY_RATE_REMINDER'

export type NotificationChannel = 'EMAIL' | 'IN_APP' | 'PUSH'

export type NotificationFrequency = 'ONCE' | 'DAILY' | 'WEEKLY' | 'MONTHLY'

export interface NotificationPreference {
  type: NotificationType
  enabled: boolean
  channels: NotificationChannel[]
  frequency?: NotificationFrequency
  schedule?: {
    dayOfWeek?: number // 0-6, 0 = Sunday
    hour: number // 0-23
    minute: number // 0-59
    timezone?: string
  }
}

export interface NotificationSettings {
  userId: string
  preferences: NotificationPreference[]
  emailNotificationsEnabled: boolean
  inAppNotificationsEnabled: boolean
  pushNotificationsEnabled: boolean
  quietHoursEnabled: boolean
  quietHours?: {
    start: string // HH:mm format
    end: string // HH:mm format
  }
  updatedAt: Date
}

export interface NotificationQueue {
  _id?: string
  userId: string
  type: NotificationType
  channel: NotificationChannel
  status: 'PENDING' | 'SENT' | 'FAILED' | 'CANCELLED'
  scheduledFor: Date
  sentAt?: Date
  failedAt?: Date
  retryCount: number
  maxRetries: number
  data: {
    subject?: string
    message: string
    actionUrl?: string
    metadata?: Record<string, any>
  }
  error?: string
  createdAt: Date
  updatedAt: Date
}

export interface ScheduledReport {
  _id?: string
  userId: string
  name: string
  type: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'CUSTOM'
  frequency: NotificationFrequency
  schedule: {
    dayOfWeek?: number // For weekly reports
    dayOfMonth?: number // For monthly reports
    hour: number
    minute: number
    timezone: string
  }
  enabled: boolean
  format: 'PDF' | 'CSV' | 'JSON' | 'EMAIL_HTML'
  recipients: string[] // Email addresses
  includeData: {
    timeEntries: boolean
    earnings: boolean
    projects: boolean
    charts: boolean
  }
  dateRange: {
    type: 'LAST_DAY' | 'LAST_WEEK' | 'LAST_MONTH' | 'CUSTOM'
    customStart?: Date
    customEnd?: Date
  }
  lastSent?: Date
  nextScheduled?: Date
  createdAt: Date
  updatedAt: Date
}

export interface InAppNotification {
  _id?: string
  userId: string
  type: NotificationType
  title: string
  message: string
  read: boolean
  actionUrl?: string
  actionLabel?: string
  icon?: string
  priority: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT'
  expiresAt?: Date
  createdAt: Date
  readAt?: Date
}

// Default notification preferences
export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreference[] = [
  {
    type: 'IDLE_TIMER',
    enabled: true,
    channels: ['IN_APP'],
  },
  {
    type: 'TIMER_REMINDER',
    enabled: false,
    channels: ['IN_APP', 'PUSH'],
    frequency: 'DAILY',
    schedule: {
      hour: 17,
      minute: 0,
    },
  },
  {
    type: 'DAILY_SUMMARY',
    enabled: false,
    channels: ['EMAIL'],
    frequency: 'DAILY',
    schedule: {
      hour: 18,
      minute: 0,
    },
  },
  {
    type: 'WEEKLY_SUMMARY',
    enabled: false,
    channels: ['EMAIL'],
    frequency: 'WEEKLY',
    schedule: {
      dayOfWeek: 1, // Monday
      hour: 9,
      minute: 0,
    },
  },
  {
    type: 'MONTHLY_SUMMARY',
    enabled: false,
    channels: ['EMAIL'],
    frequency: 'MONTHLY',
    schedule: {
      hour: 9,
      minute: 0,
    },
  },
  {
    type: 'OVERDUE_INVOICE',
    enabled: true,
    channels: ['EMAIL', 'IN_APP'],
  },
  {
    type: 'HOURLY_RATE_REMINDER',
    enabled: true,
    channels: ['IN_APP'],
  },
]

// Notification templates
export const NOTIFICATION_TEMPLATES: Record<
  NotificationType,
  {
    subject: string
    message: (data: any) => string
    emailTemplate?: (data: any) => string
  }
> = {
  IDLE_TIMER: {
    subject: 'Timer Still Running',
    message: (data) =>
      `Your timer has been running for ${data.hours} hours. Don't forget to stop it!`,
  },
  TIMER_REMINDER: {
    subject: 'Log Your Time',
    message: () => 'Have you logged your work hours for today?',
  },
  DAILY_SUMMARY: {
    subject: 'Daily Work Summary',
    message: (data) =>
      `Today you worked ${data.hours} hours and earned $${data.earnings}.`,
    emailTemplate: (data) => `
      <h2>Daily Summary</h2>
      <p>Here's your work summary for ${data.date}:</p>
      <ul>
        <li>Hours Worked: ${data.hours}</li>
        <li>Total Earnings: $${data.earnings}</li>
        <li>Entries: ${data.entriesCount}</li>
      </ul>
    `,
  },
  WEEKLY_SUMMARY: {
    subject: 'Weekly Work Summary',
    message: (data) =>
      `This week you worked ${data.hours} hours and earned $${data.earnings}.`,
    emailTemplate: (data) => `
      <h2>Weekly Summary</h2>
      <p>Here's your work summary for week of ${data.weekStart}:</p>
      <ul>
        <li>Total Hours: ${data.hours}</li>
        <li>Total Earnings: $${data.earnings}</li>
        <li>Days Worked: ${data.daysWorked}</li>
        <li>Average Daily Hours: ${data.avgDailyHours}</li>
      </ul>
    `,
  },
  MONTHLY_SUMMARY: {
    subject: 'Monthly Work Summary',
    message: (data) =>
      `This month you worked ${data.hours} hours and earned $${data.earnings}.`,
    emailTemplate: (data) => `
      <h2>Monthly Summary</h2>
      <p>Here's your work summary for ${data.month}:</p>
      <ul>
        <li>Total Hours: ${data.hours}</li>
        <li>Total Earnings: $${data.earnings}</li>
        <li>Days Worked: ${data.daysWorked}</li>
        <li>Leave Days: ${data.leaveDays}</li>
      </ul>
    `,
  },
  OVERDUE_INVOICE: {
    subject: 'Invoice Overdue',
    message: (data) =>
      `Invoice #${data.invoiceNumber} for $${data.amount} is ${data.daysOverdue} days overdue.`,
  },
  HOURLY_RATE_REMINDER: {
    subject: 'Set Your Hourly Rate',
    message: () => 'Please set your hourly rate in your profile to start tracking earnings.',
  },
}
