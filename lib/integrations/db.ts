import { MongoClient, Db, Collection } from 'mongodb'
import type { Integration, EventMapping, MappingRule, SyncResult } from './types'

let cachedDb: Db | null = null

async function getDb(): Promise<Db> {
  if (cachedDb) return cachedDb
  
  const client = await MongoClient.connect(process.env.MONGODB_URI!)
  const db = client.db(process.env.MONGODB_DB || 'timetracker')
  cachedDb = db
  return db
}

// Collections
async function getIntegrationsCollection(): Promise<Collection<Integration>> {
  const db = await getDb()
  return db.collection<Integration>('integrations')
}

async function getEventMappingsCollection(): Promise<Collection<EventMapping>> {
  const db = await getDb()
  return db.collection<EventMapping>('eventMappings')
}

async function getMappingRulesCollection(): Promise<Collection<MappingRule>> {
  const db = await getDb()
  return db.collection<MappingRule>('mappingRules')
}

// Integrations CRUD
export async function getUserIntegrations(userId: string): Promise<Integration[]> {
  const collection = await getIntegrationsCollection()
  return collection.find({ userId }).toArray()
}

export async function getIntegration(
  userId: string,
  type: Integration['type']
): Promise<Integration | null> {
  const collection = await getIntegrationsCollection()
  return collection.findOne({ userId, type })
}

export async function getIntegrationById(id: string): Promise<Integration | null> {
  const collection = await getIntegrationsCollection()
  return collection.findOne({ _id: id as any })
}

export async function createIntegration(
  integration: Omit<Integration, '_id' | 'connectedAt' | 'updatedAt'>
): Promise<string> {
  const collection = await getIntegrationsCollection()
  const now = new Date()
  
  const doc: Integration = {
    ...integration,
    connectedAt: now,
    updatedAt: now,
  }
  
  const result = await collection.insertOne(doc as any)
  return result.insertedId.toString()
}

export async function updateIntegration(
  id: string,
  updates: Partial<Integration>
): Promise<boolean> {
  const collection = await getIntegrationsCollection()
  
  const result = await collection.updateOne(
    { _id: id as any },
    {
      $set: {
        ...updates,
        updatedAt: new Date(),
      },
    }
  )
  
  return result.modifiedCount > 0
}

export async function updateIntegrationTokens(
  id: string,
  accessToken: string,
  refreshToken: string,
  tokenExpiry: Date
): Promise<boolean> {
  const collection = await getIntegrationsCollection()
  
  const result = await collection.updateOne(
    { _id: id as any },
    {
      $set: {
        accessToken,
        refreshToken,
        tokenExpiry,
        status: 'CONNECTED',
        error: undefined,
        updatedAt: new Date(),
      },
    }
  )
  
  return result.modifiedCount > 0
}

export async function updateIntegrationStatus(
  id: string,
  status: Integration['status'],
  error?: string
): Promise<boolean> {
  const collection = await getIntegrationsCollection()
  
  const result = await collection.updateOne(
    { _id: id as any },
    {
      $set: {
        status,
        error,
        updatedAt: new Date(),
      },
    }
  )
  
  return result.modifiedCount > 0
}

export async function updateIntegrationLastSync(
  id: string,
  lastSync: Date,
  nextSync?: Date
): Promise<boolean> {
  const collection = await getIntegrationsCollection()
  
  const result = await collection.updateOne(
    { _id: id as any },
    {
      $set: {
        lastSync,
        nextSync,
        updatedAt: new Date(),
      },
    }
  )
  
  return result.modifiedCount > 0
}

export async function deleteIntegration(id: string): Promise<boolean> {
  const collection = await getIntegrationsCollection()
  const result = await collection.deleteOne({ _id: id as any })
  return result.deletedCount > 0
}

// Event Mappings CRUD
export async function getEventMapping(
  userId: string,
  externalEventId: string,
  integrationId: string
): Promise<EventMapping | null> {
  const collection = await getEventMappingsCollection()
  return collection.findOne({ userId, externalEventId, integrationId })
}

export async function getUserEventMappings(
  userId: string,
  filter: {
    integrationId?: string
    status?: EventMapping['status']
    startDate?: Date
    endDate?: Date
  } = {}
): Promise<EventMapping[]> {
  const collection = await getEventMappingsCollection()
  
  const query: any = { userId }
  
  if (filter.integrationId) query.integrationId = filter.integrationId
  if (filter.status) query.status = filter.status
  
  if (filter.startDate || filter.endDate) {
    query.eventStartTime = {}
    if (filter.startDate) query.eventStartTime.$gte = filter.startDate
    if (filter.endDate) query.eventStartTime.$lte = filter.endDate
  }
  
  return collection.find(query).sort({ eventStartTime: -1 }).toArray()
}

export async function createEventMapping(
  mapping: Omit<EventMapping, '_id' | 'createdAt' | 'updatedAt'>
): Promise<string> {
  const collection = await getEventMappingsCollection()
  const now = new Date()
  
  const doc: EventMapping = {
    ...mapping,
    createdAt: now,
    updatedAt: now,
  }
  
  const result = await collection.insertOne(doc as any)
  return result.insertedId.toString()
}

export async function updateEventMapping(
  id: string,
  updates: Partial<EventMapping>
): Promise<boolean> {
  const collection = await getEventMappingsCollection()
  
  const result = await collection.updateOne(
    { _id: id as any },
    {
      $set: {
        ...updates,
        updatedAt: new Date(),
      },
    }
  )
  
  return result.modifiedCount > 0
}

export async function markEventAsImported(
  id: string,
  timeEntryId: string
): Promise<boolean> {
  const collection = await getEventMappingsCollection()
  
  const result = await collection.updateOne(
    { _id: id as any },
    {
      $set: {
        status: 'IMPORTED',
        timeEntryId,
        importedAt: new Date(),
        updatedAt: new Date(),
      },
    }
  )
  
  return result.modifiedCount > 0
}

export async function deleteEventMapping(id: string): Promise<boolean> {
  const collection = await getEventMappingsCollection()
  const result = await collection.deleteOne({ _id: id as any })
  return result.deletedCount > 0
}

// Mapping Rules CRUD
export async function getUserMappingRules(
  userId: string,
  integrationId?: string
): Promise<MappingRule[]> {
  const collection = await getMappingRulesCollection()
  
  const query: any = { userId }
  if (integrationId) query.integrationId = integrationId
  
  return collection.find(query).sort({ priority: 1 }).toArray()
}

export async function createMappingRule(
  rule: Omit<MappingRule, '_id' | 'createdAt' | 'updatedAt'>
): Promise<string> {
  const collection = await getMappingRulesCollection()
  const now = new Date()
  
  const doc: MappingRule = {
    ...rule,
    createdAt: now,
    updatedAt: now,
  }
  
  const result = await collection.insertOne(doc as any)
  return result.insertedId.toString()
}

export async function updateMappingRule(
  id: string,
  updates: Partial<MappingRule>
): Promise<boolean> {
  const collection = await getMappingRulesCollection()
  
  const result = await collection.updateOne(
    { _id: id as any },
    {
      $set: {
        ...updates,
        updatedAt: new Date(),
      },
    }
  )
  
  return result.modifiedCount > 0
}

export async function deleteMappingRule(id: string): Promise<boolean> {
  const collection = await getMappingRulesCollection()
  const result = await collection.deleteOne({ _id: id as any })
  return result.deletedCount > 0
}

// Apply mapping rules to event
export async function applyMappingRules(
  userId: string,
  integrationId: string,
  event: any
): Promise<{
  project?: string
  client?: string
  hourlyRate?: number
  workDescription?: string
  shouldImport: boolean
}> {
  const rules = await getUserMappingRules(userId, integrationId)
  
  const result: {
    project?: string
    client?: string
    hourlyRate?: number
    workDescription?: string
    shouldImport: boolean
  } = {
    shouldImport: true,
  }
  
  for (const rule of rules.filter((r) => r.enabled)) {
    if (matchesConditions(event, rule.conditions)) {
      // Apply actions from this rule
      if (rule.actions.project) result.project = rule.actions.project
      if (rule.actions.client) result.client = rule.actions.client
      if (rule.actions.hourlyRate) result.hourlyRate = rule.actions.hourlyRate
      
      if (rule.actions.workDescriptionTemplate) {
        result.workDescription = rule.actions.workDescriptionTemplate
          .replace('{{title}}', event.summary || '')
          .replace('{{description}}', event.description || '')
      }
      
      result.shouldImport = rule.actions.shouldImport
      
      // Stop at first matching rule (highest priority)
      break
    }
  }
  
  return result
}

function matchesConditions(event: any, conditions: MappingRule['conditions']): boolean {
  const title = (event.summary || '').toLowerCase()
  const description = (event.description || '').toLowerCase()
  
  // Title contains
  if (conditions.titleContains?.length) {
    const matches = conditions.titleContains.some((keyword) =>
      title.includes(keyword.toLowerCase())
    )
    if (!matches) return false
  }
  
  // Title not contains
  if (conditions.titleNotContains?.length) {
    const matches = conditions.titleNotContains.some((keyword) =>
      title.includes(keyword.toLowerCase())
    )
    if (matches) return false
  }
  
  // Description contains
  if (conditions.descriptionContains?.length) {
    const matches = conditions.descriptionContains.some((keyword) =>
      description.includes(keyword.toLowerCase())
    )
    if (!matches) return false
  }
  
  // Organizer email
  if (conditions.organizerEmail?.length) {
    const organizerEmail = event.organizer?.email?.toLowerCase() || ''
    if (!conditions.organizerEmail.some((email) => organizerEmail.includes(email.toLowerCase()))) {
      return false
    }
  }
  
  // Duration
  if (event.start?.dateTime && event.end?.dateTime) {
    const duration = (new Date(event.end.dateTime).getTime() - new Date(event.start.dateTime).getTime()) / 60000
    
    if (conditions.minDuration && duration < conditions.minDuration) return false
    if (conditions.maxDuration && duration > conditions.maxDuration) return false
  }
  
  // Recurring
  if (conditions.isRecurring !== undefined) {
    const isRecurring = !!event.recurringEventId
    if (isRecurring !== conditions.isRecurring) return false
  }
  
  return true
}

// Sync statistics
export async function saveSyncResult(result: SyncResult): Promise<void> {
  const db = await getDb()
  const collection = db.collection('syncResults')
  
  await collection.insertOne({
    ...result,
    timestamp: new Date(),
  })
}

export async function getLatestSyncResult(integrationId: string): Promise<SyncResult | null> {
  const db = await getDb()
  const collection = db.collection('syncResults')
  
  return collection.findOne(
    { integrationId },
    { sort: { timestamp: -1 } }
  ) as Promise<SyncResult | null>
}

// Cleanup old mappings
export async function cleanupOldMappings(daysToKeep: number = 90): Promise<number> {
  const collection = await getEventMappingsCollection()
  const cutoffDate = new Date()
  cutoffDate.setDate(cutoffDate.getDate() - daysToKeep)
  
  const result = await collection.deleteMany({
    status: { $in: ['IMPORTED', 'SKIPPED'] },
    importedAt: { $lt: cutoffDate },
  })
  
  return result.deletedCount
}
