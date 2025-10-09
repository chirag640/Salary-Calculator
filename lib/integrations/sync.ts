import type {
  Integration,
  GoogleCalendarEvent,
  EventMapping,
  ImportPreview,
  SyncResult,
} from './types'
import {
  fetchAllCalendarEvents,
  shouldImportEvent,
  calculateEventDuration,
  roundDuration,
  generateWorkDescription,
  refreshAccessToken,
} from './google-calendar'
import {
  getEventMapping,
  createEventMapping,
  updateIntegrationLastSync,
  updateIntegrationStatus,
  updateIntegrationTokens,
  applyMappingRules,
  saveSyncResult,
} from './db'
import type { TimeEntry } from '../types'
import { MongoClient } from 'mongodb'

// Sync Google Calendar events
export async function syncGoogleCalendar(integration: Integration): Promise<SyncResult> {
  const startTime = new Date()
  const result: SyncResult = {
    success: false,
    integrationId: integration._id!,
    startTime,
    endTime: new Date(),
    eventsProcessed: 0,
    eventsImported: 0,
    eventsSkipped: 0,
    eventsFailed: 0,
    errors: [],
  }

  try {
    // Check and refresh token if needed
    let accessToken = integration.accessToken!
    if (integration.tokenExpiry && integration.tokenExpiry < new Date()) {
      try {
        const tokens = await refreshAccessToken(integration.refreshToken!)
        accessToken = tokens.accessToken
        await updateIntegrationTokens(
          integration._id!,
          tokens.accessToken,
          integration.refreshToken!,
          new Date(tokens.expiryDate)
        )
      } catch (error) {
        result.errors.push('Failed to refresh access token')
        await updateIntegrationStatus(integration._id!, 'ERROR', 'Token refresh failed')
        return result
      }
    }

    // Determine time range
    const timeMin = new Date()
    timeMin.setDate(timeMin.getDate() - (integration.importSettings.lookbackDays || 7))
    
    const timeMax = new Date()
    timeMax.setDate(timeMax.getDate() + (integration.importSettings.lookforwardDays || 0))

    // Fetch events from all calendars
    const calendarIds = integration.importSettings.calendarIds || ['primary']
    const calendarResults = await fetchAllCalendarEvents(accessToken, calendarIds, {
      timeMin,
      timeMax,
      maxResults: 250,
    })

    // Process all events
    for (const { calendarId, events } of calendarResults) {
      for (const event of events) {
        result.eventsProcessed++

        try {
          // Check if already imported
          const existing = await getEventMapping(
            integration.userId,
            event.id,
            integration._id!
          )

          if (existing && existing.status === 'IMPORTED') {
            result.eventsSkipped++
            continue
          }

          // Apply import filters
          const importCheck = shouldImportEvent(
            event,
            integration.importSettings,
            integration.providerEmail
          )

          if (!importCheck.shouldImport) {
            // Create/update mapping with skipped status
            if (existing) {
              // Skip silently
            } else {
              await createEventMapping({
                userId: integration.userId,
                integrationId: integration._id!,
                integrationType: 'GOOGLE_CALENDAR',
                externalEventId: event.id,
                externalEventTitle: event.summary || 'Untitled Event',
                externalEventData: event,
                status: 'SKIPPED',
                error: importCheck.reason,
                eventStartTime: new Date(event.start.dateTime!),
                eventEndTime: new Date(event.end.dateTime!),
              })
            }
            result.eventsSkipped++
            continue
          }

          // Apply mapping rules
          const mapping = await applyMappingRules(
            integration.userId,
            integration._id!,
            event
          )

          if (!mapping.shouldImport) {
            result.eventsSkipped++
            continue
          }

          // Calculate duration
          let duration = calculateEventDuration(event)
          if (integration.importSettings.roundToNearest) {
            duration = roundDuration(duration, integration.importSettings.roundToNearest)
          }

          // Generate description
          const workDescription = mapping.workDescription || generateWorkDescription(
            event,
            integration.importSettings
          )

          // Only import if auto-import is enabled
          if (integration.autoImport) {
            // Create time entry
            const client = await MongoClient.connect(process.env.MONGODB_URI!)
            const db = client.db(process.env.MONGODB_DB || 'timetracker')
            
            const hourlyRate = mapping.hourlyRate || integration.importSettings.defaultHourlyRate || 0
            const eventStart = new Date(event.start.dateTime!)
            const eventEnd = new Date(event.end.dateTime!)
            
            const timeEntryDoc: TimeEntry = {
              userId: integration.userId,
              date: eventStart.toISOString().split('T')[0],
              timeIn: `${eventStart.getHours().toString().padStart(2, '0')}:${eventStart.getMinutes().toString().padStart(2, '0')}`,
              timeOut: `${eventEnd.getHours().toString().padStart(2, '0')}:${eventEnd.getMinutes().toString().padStart(2, '0')}`,
              breakMinutes: 0,
              totalHours: duration,
              hourlyRate,
              totalEarnings: hourlyRate * duration,
              workDescription,
              project: mapping.project || integration.importSettings.defaultProject || 'Imported from Calendar',
              client: mapping.client || integration.importSettings.defaultClient,
            }
            
            const timeEntryResult = await db.collection<TimeEntry>('timeEntries').insertOne(timeEntryDoc as any)
            const timeEntry = { ...timeEntryDoc, _id: timeEntryResult.insertedId }

            // Create mapping
            await createEventMapping({
              userId: integration.userId,
              integrationId: integration._id!,
              integrationType: 'GOOGLE_CALENDAR',
              externalEventId: event.id,
              externalEventTitle: event.summary || 'Untitled Event',
              externalEventData: event,
              timeEntryId: timeEntry._id?.toString(),
              project: mapping.project,
              client: mapping.client,
              hourlyRate: mapping.hourlyRate,
              workDescription,
              status: 'IMPORTED',
              eventStartTime: new Date(event.start.dateTime!),
              eventEndTime: new Date(event.end.dateTime!),
              importedAt: new Date(),
            })

            result.eventsImported++
          } else {
            // Create pending mapping for manual approval
            if (!existing) {
              await createEventMapping({
                userId: integration.userId,
                integrationId: integration._id!,
                integrationType: 'GOOGLE_CALENDAR',
                externalEventId: event.id,
                externalEventTitle: event.summary || 'Untitled Event',
                externalEventData: event,
                project: mapping.project,
                client: mapping.client,
                hourlyRate: mapping.hourlyRate,
                workDescription,
                status: 'PENDING',
                eventStartTime: new Date(event.start.dateTime!),
                eventEndTime: new Date(event.end.dateTime!),
              })
            }
            result.eventsSkipped++
          }
        } catch (error: any) {
          result.eventsFailed++
          result.errors.push(`Event ${event.summary}: ${error.message}`)
          console.error('Error processing event:', event.id, error)
        }
      }
    }

    // Calculate next sync
    const nextSync = new Date()
    switch (integration.syncFrequency) {
      case 'HOURLY':
        nextSync.setHours(nextSync.getHours() + 1)
        break
      case 'DAILY':
        nextSync.setDate(nextSync.getDate() + 1)
        break
      case 'WEEKLY':
        nextSync.setDate(nextSync.getDate() + 7)
        break
      default:
        // Manual sync, no next sync
        break
    }

    // Update integration
    await updateIntegrationLastSync(
      integration._id!,
      new Date(),
      integration.syncFrequency !== 'MANUAL' ? nextSync : undefined
    )

    await updateIntegrationStatus(integration._id!, 'CONNECTED')

    result.success = true
    result.endTime = new Date()
    result.nextSync = nextSync

    // Save sync result
    await saveSyncResult(result)

    return result
  } catch (error: any) {
    result.errors.push(error.message)
    result.endTime = new Date()
    
    await updateIntegrationStatus(integration._id!, 'ERROR', error.message)
    
    return result
  }
}

// Generate import preview without actually importing
export async function generateImportPreview(
  integration: Integration,
  timeMin: Date,
  timeMax: Date
): Promise<ImportPreview> {
  try {
    // Refresh token if needed
    let accessToken = integration.accessToken!
    if (integration.tokenExpiry && integration.tokenExpiry < new Date()) {
      const tokens = await refreshAccessToken(integration.refreshToken!)
      accessToken = tokens.accessToken
    }

    // Fetch events
    const calendarIds = integration.importSettings.calendarIds || ['primary']
    const calendarResults = await fetchAllCalendarEvents(accessToken, calendarIds, {
      timeMin,
      timeMax,
      maxResults: 250,
    })

    const preview: ImportPreview = {
      totalEvents: 0,
      importableEvents: 0,
      skippedEvents: 0,
      duplicateEvents: 0,
      totalHours: 0,
      estimatedEarnings: 0,
      events: [],
    }

    for (const { calendarId, events } of calendarResults) {
      for (const event of events) {
        preview.totalEvents++

        // Check if already imported
        const existing = await getEventMapping(
          integration.userId,
          event.id,
          integration._id!
        )

        if (existing && existing.status === 'IMPORTED') {
          preview.duplicateEvents++
          preview.events.push({
            externalEvent: event,
            mapping: {},
            willImport: false,
            skipReason: 'Already imported',
          })
          continue
        }

        // Check import criteria
        const importCheck = shouldImportEvent(
          event,
          integration.importSettings,
          integration.providerEmail
        )

        if (!importCheck.shouldImport) {
          preview.skippedEvents++
          preview.events.push({
            externalEvent: event,
            mapping: {},
            willImport: false,
            skipReason: importCheck.reason,
          })
          continue
        }

        // Apply mapping rules
        const mapping = await applyMappingRules(
          integration.userId,
          integration._id!,
          event
        )

        if (!mapping.shouldImport) {
          preview.skippedEvents++
          preview.events.push({
            externalEvent: event,
            mapping,
            willImport: false,
            skipReason: 'Excluded by mapping rule',
          })
          continue
        }

        // Calculate duration and earnings
        let duration = calculateEventDuration(event)
        if (integration.importSettings.roundToNearest) {
          duration = roundDuration(duration, integration.importSettings.roundToNearest)
        }

        const hourlyRate = mapping.hourlyRate || integration.importSettings.defaultHourlyRate || 0
        const earnings = duration * hourlyRate

        preview.importableEvents++
        preview.totalHours += duration
        preview.estimatedEarnings += earnings

        preview.events.push({
          externalEvent: event,
          mapping: {
            ...mapping,
            workDescription: mapping.workDescription || generateWorkDescription(event, integration.importSettings),
          },
          willImport: true,
        })
      }
    }

    return preview
  } catch (error: any) {
    throw new Error(`Failed to generate preview: ${error.message}`)
  }
}
