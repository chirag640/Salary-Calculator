export type IntegrationType = 'GITHUB' | 'GITLAB' | 'JIRA' | 'TRELLO'

export type IntegrationStatus = 'CONNECTED' | 'DISCONNECTED' | 'ERROR' | 'EXPIRED'

export interface Integration {
  _id?: string
  userId: string
  type: IntegrationType
  status: IntegrationStatus
  displayName: string
  
  // OAuth tokens
  accessToken?: string
  refreshToken?: string
  tokenExpiry?: Date
  
  // Provider-specific data
  providerUserId?: string
  providerEmail?: string
  providerData?: Record<string, any>
  
  // Sync settings
  lastSync?: Date
  nextSync?: Date
  syncEnabled: boolean
  syncFrequency: 'MANUAL' | 'HOURLY' | 'DAILY' | 'WEEKLY'
  
  // Import settings
  autoImport: boolean
  importSettings: IntegrationImportSettings
  
  // Metadata
  connectedAt: Date
  updatedAt: Date
  error?: string
}

export interface IntegrationImportSettings {
  // What to import
  includeAllEvents?: boolean
  onlyWorkEvents?: boolean
  keywords?: string[] // e.g., ["meeting", "call", "standup"]
  excludeKeywords?: string[] // e.g., ["lunch", "personal", "birthday"]
  
  // Default mapping
  defaultProject?: string
  defaultClient?: string
  defaultHourlyRate?: number
  
  // Calendar-specific
  // calendarIds?: string[] // (previously used for Google Calendar) removed
  
  // Time range
  lookbackDays?: number // How many days in the past to import
  lookforwardDays?: number // How many days in the future to import
  
  // Filters
  minDuration?: number // Minimum event duration in minutes
  maxDuration?: number // Maximum event duration in minutes
  onlyAcceptedEvents?: boolean // Only import events you've accepted
  
  // Conversion
  roundToNearest?: number // Round duration to nearest X minutes (e.g., 15, 30)
  includeDescription?: boolean // Import event description as work description
  includeAttendees?: boolean // Include attendee names in description
}

export interface EventMapping {
  _id?: string
  userId: string
  integrationId: string
  integrationType: IntegrationType
  
  // External event data
  externalEventId: string
  externalEventTitle: string
  externalEventData: Record<string, any>
  
  // Mapped time entry
  timeEntryId?: string
  
  // Mapping rules
  project?: string
  client?: string
  hourlyRate?: number
  workDescription?: string
  
  // Status
  status: 'PENDING' | 'IMPORTED' | 'SKIPPED' | 'ERROR' | 'DUPLICATE'
  error?: string
  
  // Timestamps
  eventStartTime: Date
  eventEndTime: Date
  importedAt?: Date
  createdAt: Date
  updatedAt: Date
}


export interface ImportPreview {
  totalEvents: number
  importableEvents: number
  skippedEvents: number
  duplicateEvents: number
  totalHours: number
  estimatedEarnings: number
  events: Array<{
    externalEvent: any
    mapping: Partial<EventMapping>
    willImport: boolean
    skipReason?: string
  }>
}

export interface SyncResult {
  success: boolean
  integrationId: string
  startTime: Date
  endTime: Date
  eventsProcessed: number
  eventsImported: number
  eventsSkipped: number
  eventsFailed: number
  errors: string[]
  nextSync?: Date
}

// OAuth configuration
export interface OAuthConfig {
  clientId: string
  clientSecret: string
  redirectUri: string
  scopes: string[]
  authUrl: string
  tokenUrl: string
}

// Generic integration types and minimal OAuth config
export const GOOGLE_OAUTH_CONFIG: Partial<OAuthConfig> = {
  authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
  tokenUrl: 'https://oauth2.googleapis.com/token',
  scopes: [],
}

// Mapping rules for automatic categorization
export interface MappingRule {
  _id?: string
  userId: string
  integrationId?: string
  integrationType: IntegrationType
  
  name: string
  enabled: boolean
  priority: number // Lower = higher priority
  
  // Conditions (all must match)
  conditions: {
    titleContains?: string[]
    titleNotContains?: string[]
    descriptionContains?: string[]
    organizerEmail?: string[]
    attendeeEmails?: string[]
    calendarIds?: string[]
    minDuration?: number
    maxDuration?: number
    isRecurring?: boolean
  }
  
  // Actions (what to set)
  actions: {
    project?: string
    client?: string
    hourlyRate?: number
    tags?: string[]
    workDescriptionTemplate?: string // e.g., "Meeting: {{title}}"
    shouldImport: boolean
  }
  
  createdAt: Date
  updatedAt: Date
}
