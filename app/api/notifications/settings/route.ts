import { NextRequest, NextResponse } from 'next/server'
import { getUserFromSession } from '@/lib/auth'
import {
  getUserNotificationSettings,
  createDefaultNotificationSettings,
  updateNotificationSettings,
  updateNotificationPreference,
} from '@/lib/notifications/db'
import type { NotificationPreference } from '@/lib/notifications/types'

export async function GET(req: NextRequest) {
  try {
    const user = getUserFromSession(req)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    let settings = await getUserNotificationSettings(user._id)
    
    if (!settings) {
      settings = await createDefaultNotificationSettings(user._id)
    }

    return NextResponse.json(settings)
  } catch (error) {
    console.error('Error fetching notification settings:', error)
    return NextResponse.json(
      { error: 'Failed to fetch notification settings' },
      { status: 500 }
    )
  }
}

export async function PUT(req: NextRequest) {
  try {
    const user = getUserFromSession(req)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const {
      emailNotificationsEnabled,
      inAppNotificationsEnabled,
      pushNotificationsEnabled,
      quietHoursEnabled,
      quietHours,
    } = body

    const success = await updateNotificationSettings(user._id, {
      emailNotificationsEnabled,
      inAppNotificationsEnabled,
      pushNotificationsEnabled,
      quietHoursEnabled,
      quietHours,
    })

    if (!success) {
      return NextResponse.json(
        { error: 'Failed to update notification settings' },
        { status: 500 }
      )
    }

    const settings = await getUserNotificationSettings(user._id)
    return NextResponse.json(settings)
  } catch (error) {
    console.error('Error updating notification settings:', error)
    return NextResponse.json(
      { error: 'Failed to update notification settings' },
      { status: 500 }
    )
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = getUserFromSession(req)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const preference = body as NotificationPreference

    if (!preference.type) {
      return NextResponse.json(
        { error: 'Notification type is required' },
        { status: 400 }
      )
    }

    const success = await updateNotificationPreference(user._id, preference)

    if (!success) {
      return NextResponse.json(
        { error: 'Failed to update notification preference' },
        { status: 500 }
      )
    }

    const settings = await getUserNotificationSettings(user._id)
    return NextResponse.json(settings)
  } catch (error) {
    console.error('Error updating notification preference:', error)
    return NextResponse.json(
      { error: 'Failed to update notification preference' },
      { status: 500 }
    )
  }
}
