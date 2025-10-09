import { google } from 'googleapis'
import type {
  Integration,
  GoogleCalendarEvent,
  GoogleCalendar,
  OAuthConfig,
} from './types'
import { GOOGLE_OAUTH_CONFIG } from './types'

// OAuth2 client setup
export function getOAuth2Client(redirectUri?: string) {
  const defaultIntegrationRedirect = process.env.GOOGLE_REDIRECT_URI || `${process.env.NEXT_PUBLIC_APP_URL}/api/integrations/google/callback`
  const defaultAuthRedirect = process.env.GOOGLE_AUTH_REDIRECT_URI || `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/google/callback`
  const finalRedirect = redirectUri || defaultIntegrationRedirect
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    finalRedirect
  )
}

// Generate authorization URL
export function getAuthorizationUrl(state: string): string {
  // For integration flows we must ensure the redirect URI used here matches
  // the integration redirect registered in the Google Console.
  const integrationRedirect = process.env.GOOGLE_REDIRECT_URI || `${process.env.NEXT_PUBLIC_APP_URL}/api/integrations/google/callback`
  const oauth2Client = getOAuth2Client(integrationRedirect)

  return oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: GOOGLE_OAUTH_CONFIG.scopes,
    state, // User ID encrypted
    prompt: 'consent', // Force consent screen to get refresh token
  })
}

// Exchange authorization code for tokens
export async function exchangeCodeForTokens(code: string, redirectUri?: string): Promise<{
  accessToken: string
  refreshToken: string
  expiryDate: number
}> {
  const oauth2Client = getOAuth2Client(redirectUri)

  const { tokens } = await oauth2Client.getToken(code)
  
  if (!tokens.access_token) {
    throw new Error('No access token received')
  }
  
  return {
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token || '',
    expiryDate: tokens.expiry_date || Date.now() + 3600000,
  }
}

// Refresh access token
export async function refreshAccessToken(refreshToken: string, redirectUri?: string): Promise<{
  accessToken: string
  expiryDate: number
}> {
  const oauth2Client = getOAuth2Client(redirectUri)
  oauth2Client.setCredentials({ refresh_token: refreshToken })

  // googleapis may use oauth2Client.getAccessToken / refresh API; keep using refreshAccessToken for now
  const { credentials } = await oauth2Client.refreshAccessToken()
  
  if (!credentials.access_token) {
    throw new Error('Failed to refresh access token')
  }
  
  return {
    accessToken: credentials.access_token,
    expiryDate: credentials.expiry_date || Date.now() + 3600000,
  }
}

// Get authenticated calendar client
export function getCalendarClient(accessToken: string, redirectUri?: string) {
  const oauth2Client = getOAuth2Client(redirectUri)
  oauth2Client.setCredentials({ access_token: accessToken })

  return google.calendar({ version: 'v3', auth: oauth2Client })
}

// Get user profile
export async function getUserProfile(accessToken: string, redirectUri?: string): Promise<{
  id: string
  email: string
  name: string
  picture?: string
}> {
  const oauth2Client = getOAuth2Client(redirectUri)
  oauth2Client.setCredentials({ access_token: accessToken })

  const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client })
  const { data } = await oauth2.userinfo.get()
  
  return {
    id: data.id || '',
    email: data.email || '',
    name: data.name || '',
    picture: data.picture || undefined,
  }
}

// List calendars
export async function listCalendars(accessToken: string): Promise<GoogleCalendar[]> {
  const calendar = getCalendarClient(accessToken)
  
  const response = await calendar.calendarList.list()
  
  return (response.data.items || []).map((cal: any) => ({
    id: cal.id || '',
    summary: cal.summary || '',
    description: cal.description,
    backgroundColor: cal.backgroundColor,
    foregroundColor: cal.foregroundColor,
    primary: cal.primary,
    accessRole: cal.accessRole as any,
  }))
}

// Fetch events from a calendar
export async function fetchCalendarEvents(
  accessToken: string,
  calendarId: string,
  options: {
    timeMin?: Date
    timeMax?: Date
    maxResults?: number
    singleEvents?: boolean
    orderBy?: 'startTime' | 'updated'
  } = {}
): Promise<GoogleCalendarEvent[]> {
  const calendar = getCalendarClient(accessToken)
  
  const response = await calendar.events.list({
    calendarId,
    timeMin: options.timeMin?.toISOString(),
    timeMax: options.timeMax?.toISOString(),
    maxResults: options.maxResults || 100,
    singleEvents: options.singleEvents !== false,
    orderBy: options.orderBy || 'startTime',
  })
  
  return (response.data.items || []) as GoogleCalendarEvent[]
}

// Fetch events from multiple calendars
export async function fetchAllCalendarEvents(
  accessToken: string,
  calendarIds: string[],
  options: {
    timeMin?: Date
    timeMax?: Date
    maxResults?: number
  } = {}
): Promise<Array<{ calendarId: string; events: GoogleCalendarEvent[] }>> {
  const results = await Promise.allSettled(
    calendarIds.map(async (calendarId) => {
      const events = await fetchCalendarEvents(accessToken, calendarId, options)
      return { calendarId, events }
    })
  )
  
  return results
    .filter((result) => result.status === 'fulfilled')
    .map((result) => (result as PromiseFulfilledResult<any>).value)
}

// Check if event matches import criteria
export function shouldImportEvent(
  event: GoogleCalendarEvent,
  settings: Integration['importSettings'],
  userEmail?: string
): { shouldImport: boolean; reason?: string } {
  // Skip cancelled events
  if (event.status === 'cancelled') {
    return { shouldImport: false, reason: 'Event is cancelled' }
  }
  
  // Skip all-day events (no specific time)
  if (event.start.date && !event.start.dateTime) {
    return { shouldImport: false, reason: 'All-day event' }
  }
  
  // Check duration
  const start = new Date(event.start.dateTime!)
  const end = new Date(event.end.dateTime!)
  const durationMinutes = (end.getTime() - start.getTime()) / 60000
  
  if (settings.minDuration && durationMinutes < settings.minDuration) {
    return { shouldImport: false, reason: `Too short (${durationMinutes}m < ${settings.minDuration}m)` }
  }
  
  if (settings.maxDuration && durationMinutes > settings.maxDuration) {
    return { shouldImport: false, reason: `Too long (${durationMinutes}m > ${settings.maxDuration}m)` }
  }
  
  // Check if event is accepted (if setting enabled)
  if (settings.onlyAcceptedEvents && userEmail) {
    const userAttendee = event.attendees?.find((a) => a.email === userEmail)
    if (userAttendee && userAttendee.responseStatus !== 'accepted') {
      return { shouldImport: false, reason: 'Not accepted' }
    }
  }
  
  // Check keywords
  const title = event.summary?.toLowerCase() || ''
  const description = event.description?.toLowerCase() || ''
  
  if (settings.excludeKeywords?.length) {
    for (const keyword of settings.excludeKeywords) {
      if (title.includes(keyword.toLowerCase()) || description.includes(keyword.toLowerCase())) {
        return { shouldImport: false, reason: `Excluded keyword: ${keyword}` }
      }
    }
  }
  
  if (settings.keywords?.length && !settings.includeAllEvents) {
    const hasKeyword = settings.keywords.some(
      (keyword) => title.includes(keyword.toLowerCase()) || description.includes(keyword.toLowerCase())
    )
    if (!hasKeyword) {
      return { shouldImport: false, reason: 'No matching keywords' }
    }
  }
  
  // Check transparency (free/busy)
  if (!settings.onlyWorkEvents && event.transparency === 'transparent') {
    return { shouldImport: false, reason: 'Marked as free time' }
  }
  
  return { shouldImport: true }
}

// Calculate event duration in hours
export function calculateEventDuration(event: GoogleCalendarEvent): number {
  if (!event.start.dateTime || !event.end.dateTime) return 0
  
  const start = new Date(event.start.dateTime)
  const end = new Date(event.end.dateTime)
  const hours = (end.getTime() - start.getTime()) / 3600000
  
  return Math.max(0, hours)
}

// Round duration to nearest interval
export function roundDuration(hours: number, roundToMinutes: number): number {
  if (roundToMinutes <= 0) return hours
  
  const totalMinutes = hours * 60
  const rounded = Math.round(totalMinutes / roundToMinutes) * roundToMinutes
  
  return rounded / 60
}

// Generate work description from event
export function generateWorkDescription(
  event: GoogleCalendarEvent,
  settings: Integration['importSettings']
): string {
  let description = event.summary || 'Calendar Event'
  
  if (settings.includeDescription && event.description) {
    description += `\n\n${event.description}`
  }
  
  if (settings.includeAttendees && event.attendees?.length) {
    const attendeeNames = event.attendees
      .filter((a) => !a.self)
      .map((a) => a.displayName || a.email)
      .join(', ')
    
    if (attendeeNames) {
      description += `\n\nAttendees: ${attendeeNames}`
    }
  }
  
  if (event.location) {
    description += `\n\nLocation: ${event.location}`
  }
  
  return description.trim()
}

// Validate OAuth tokens
export async function validateTokens(integration: Integration): Promise<boolean> {
  if (!integration.accessToken) return false
  
  try {
    // Try to fetch user profile to validate token
    await getUserProfile(integration.accessToken)
    return true
  } catch (error) {
    // If token expired, try to refresh
    if (integration.refreshToken) {
      try {
        await refreshAccessToken(integration.refreshToken)
        return true
      } catch (refreshError) {
        return false
      }
    }
    return false
  }
}

// Handle API rate limits with exponential backoff
export async function withRateLimit<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3
): Promise<T> {
  let retries = 0
  
  while (true) {
    try {
      return await fn()
    } catch (error: any) {
      if (error.code === 429 || error.code === 'RATE_LIMIT_EXCEEDED') {
        if (retries >= maxRetries) {
          throw new Error('Rate limit exceeded, max retries reached')
        }
        
        // Exponential backoff: 2^retries seconds
        const delay = Math.pow(2, retries) * 1000
        await new Promise((resolve) => setTimeout(resolve, delay))
        retries++
      } else {
        throw error
      }
    }
  }
}
