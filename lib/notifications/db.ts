import { MongoClient, Db, Collection } from 'mongodb'
import type {
  NotificationSettings,
  NotificationQueue,
  ScheduledReport,
  InAppNotification,
  NotificationPreference,
} from './types'
import { DEFAULT_NOTIFICATION_PREFERENCES } from './types'

let cachedDb: Db | null = null

async function getDb(): Promise<Db> {
  if (cachedDb) {
    return cachedDb
  }

  const client = await MongoClient.connect(process.env.MONGODB_URI!)
  const db = client.db(process.env.MONGODB_DB || 'timetracker')
  cachedDb = db
  return db
}

// Collections
async function getNotificationSettingsCollection(): Promise<
  Collection<NotificationSettings>
> {
  const db = await getDb()
  return db.collection<NotificationSettings>('notificationSettings')
}

async function getNotificationQueueCollection(): Promise<
  Collection<NotificationQueue>
> {
  const db = await getDb()
  return db.collection<NotificationQueue>('notificationQueue')
}

async function getScheduledReportsCollection(): Promise<
  Collection<ScheduledReport>
> {
  const db = await getDb()
  return db.collection<ScheduledReport>('scheduledReports')
}

async function getInAppNotificationsCollection(): Promise<
  Collection<InAppNotification>
> {
  const db = await getDb()
  return db.collection<InAppNotification>('inAppNotifications')
}

// Notification Settings
export async function getUserNotificationSettings(
  userId: string
): Promise<NotificationSettings | null> {
  const collection = await getNotificationSettingsCollection()
  return collection.findOne({ userId })
}

export async function createDefaultNotificationSettings(
  userId: string
): Promise<NotificationSettings> {
  const collection = await getNotificationSettingsCollection()
  const settings: NotificationSettings = {
    userId,
    preferences: DEFAULT_NOTIFICATION_PREFERENCES,
    emailNotificationsEnabled: false,
    inAppNotificationsEnabled: true,
    pushNotificationsEnabled: false,
    quietHoursEnabled: false,
    updatedAt: new Date(),
  }
  await collection.insertOne(settings)
  return settings
}

export async function updateNotificationSettings(
  userId: string,
  updates: Partial<NotificationSettings>
): Promise<boolean> {
  const collection = await getNotificationSettingsCollection()
  const result = await collection.updateOne(
    { userId },
    {
      $set: {
        ...updates,
        updatedAt: new Date(),
      },
    },
    { upsert: true }
  )
  return result.modifiedCount > 0 || result.upsertedCount > 0
}

export async function updateNotificationPreference(
  userId: string,
  preference: NotificationPreference
): Promise<boolean> {
  const collection = await getNotificationSettingsCollection()
  const settings = await getUserNotificationSettings(userId)
  
  if (!settings) {
    await createDefaultNotificationSettings(userId)
  }

  const result = await collection.updateOne(
    { userId },
    {
      $pull: { preferences: { type: preference.type } },
    }
  )

  await collection.updateOne(
    { userId },
    {
      $push: { preferences: preference },
      $set: { updatedAt: new Date() },
    }
  )

  return true
}

// Notification Queue
export async function queueNotification(
  notification: Omit<NotificationQueue, '_id' | 'createdAt' | 'updatedAt'>
): Promise<string> {
  const collection = await getNotificationQueueCollection()
  const doc: NotificationQueue = {
    ...notification,
    createdAt: new Date(),
    updatedAt: new Date(),
  }
  const result = await collection.insertOne(doc)
  return result.insertedId.toString()
}

export async function getPendingNotifications(
  limit: number = 100
): Promise<NotificationQueue[]> {
  const collection = await getNotificationQueueCollection()
  return collection
    .find({
      status: 'PENDING',
      scheduledFor: { $lte: new Date() },
    })
    .sort({ scheduledFor: 1 })
    .limit(limit)
    .toArray()
}

export async function markNotificationSent(id: string): Promise<boolean> {
  const collection = await getNotificationQueueCollection()
  const result = await collection.updateOne(
    { _id: id as any },
    {
      $set: {
        status: 'SENT',
        sentAt: new Date(),
        updatedAt: new Date(),
      },
    }
  )
  return result.modifiedCount > 0
}

export async function markNotificationFailed(
  id: string,
  error: string
): Promise<boolean> {
  const collection = await getNotificationQueueCollection()
  const notification = await collection.findOne({ _id: id as any })
  
  if (!notification) return false

  const shouldRetry =
    notification.retryCount < notification.maxRetries

  const result = await collection.updateOne(
    { _id: id as any },
    {
      $set: {
        status: shouldRetry ? 'PENDING' : 'FAILED',
        failedAt: new Date(),
        error,
        updatedAt: new Date(),
      },
      $inc: { retryCount: 1 },
    }
  )
  return result.modifiedCount > 0
}

// Scheduled Reports
export async function getUserScheduledReports(
  userId: string
): Promise<ScheduledReport[]> {
  const collection = await getScheduledReportsCollection()
  return collection.find({ userId }).toArray()
}

export async function createScheduledReport(
  report: Omit<ScheduledReport, '_id' | 'createdAt' | 'updatedAt'>
): Promise<string> {
  const collection = await getScheduledReportsCollection()
  const doc: ScheduledReport = {
    ...report,
    createdAt: new Date(),
    updatedAt: new Date(),
  }
  const result = await collection.insertOne(doc)
  return result.insertedId.toString()
}

export async function updateScheduledReport(
  id: string,
  updates: Partial<ScheduledReport>
): Promise<boolean> {
  const collection = await getScheduledReportsCollection()
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

export async function deleteScheduledReport(id: string): Promise<boolean> {
  const collection = await getScheduledReportsCollection()
  const result = await collection.deleteOne({ _id: id as any })
  return result.deletedCount > 0
}

export async function getReportsDueForSending(): Promise<ScheduledReport[]> {
  const collection = await getScheduledReportsCollection()
  const now = new Date()
  
  return collection
    .find({
      enabled: true,
      $or: [
        { nextScheduled: { $lte: now } },
        { nextScheduled: { $exists: false } },
      ],
    })
    .toArray()
}

// In-App Notifications
export async function createInAppNotification(
  notification: Omit<InAppNotification, '_id' | 'createdAt'>
): Promise<string> {
  const collection = await getInAppNotificationsCollection()
  const doc: InAppNotification = {
    ...notification,
    createdAt: new Date(),
  }
  const result = await collection.insertOne(doc)
  return result.insertedId.toString()
}

export async function getUserNotifications(
  userId: string,
  includeRead: boolean = false
): Promise<InAppNotification[]> {
  const collection = await getInAppNotificationsCollection()
  const query: any = { userId }
  
  if (!includeRead) {
    query.read = false
  }

  // Also filter out expired notifications
  query.$or = [
    { expiresAt: { $exists: false } },
    { expiresAt: { $gt: new Date() } },
  ]

  return collection
    .find(query)
    .sort({ createdAt: -1 })
    .limit(50)
    .toArray()
}

export async function markNotificationRead(id: string): Promise<boolean> {
  const collection = await getInAppNotificationsCollection()
  const result = await collection.updateOne(
    { _id: id as any },
    {
      $set: {
        read: true,
        readAt: new Date(),
      },
    }
  )
  return result.modifiedCount > 0
}

export async function markAllNotificationsRead(userId: string): Promise<number> {
  const collection = await getInAppNotificationsCollection()
  const result = await collection.updateMany(
    { userId, read: false },
    {
      $set: {
        read: true,
        readAt: new Date(),
      },
    }
  )
  return result.modifiedCount
}

export async function deleteNotification(id: string): Promise<boolean> {
  const collection = await getInAppNotificationsCollection()
  const result = await collection.deleteOne({ _id: id as any })
  return result.deletedCount > 0
}

export async function getUnreadNotificationCount(userId: string): Promise<number> {
  const collection = await getInAppNotificationsCollection()
  return collection.countDocuments({
    userId,
    read: false,
    $or: [
      { expiresAt: { $exists: false } },
      { expiresAt: { $gt: new Date() } },
    ],
  })
}

// Cleanup old notifications
export async function cleanupOldNotifications(daysToKeep: number = 30): Promise<number> {
  const collection = await getInAppNotificationsCollection()
  const cutoffDate = new Date()
  cutoffDate.setDate(cutoffDate.getDate() - daysToKeep)
  
  const result = await collection.deleteMany({
    read: true,
    readAt: { $lt: cutoffDate },
  })
  
  return result.deletedCount
}
