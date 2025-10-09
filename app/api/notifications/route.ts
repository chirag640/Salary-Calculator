import { NextRequest, NextResponse } from 'next/server'
import { getUserFromSession } from '@/lib/auth'
import {
  getUserNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  deleteNotification,
  getUnreadNotificationCount,
} from '@/lib/notifications/db'

// GET /api/notifications - Get user notifications
export async function GET(req: NextRequest) {
  try {
    const user = getUserFromSession(req)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const url = new URL(req.url)
    const includeRead = url.searchParams.get('includeRead') === 'true'

    const notifications = await getUserNotifications(user._id, includeRead)
    const unreadCount = await getUnreadNotificationCount(user._id)

    return NextResponse.json({
      notifications,
      unreadCount,
    })
  } catch (error) {
    console.error('Error fetching notifications:', error)
    return NextResponse.json(
      { error: 'Failed to fetch notifications' },
      { status: 500 }
    )
  }
}

// POST /api/notifications - Create a new notification (admin only)
export async function POST(req: NextRequest) {
  try {
    const user = getUserFromSession(req)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { action, notificationId } = body

    if (action === 'markRead' && notificationId) {
      const success = await markNotificationRead(notificationId)
      if (!success) {
        return NextResponse.json(
          { error: 'Failed to mark notification as read' },
          { status: 500 }
        )
      }
      return NextResponse.json({ success: true })
    }

    if (action === 'markAllRead') {
      const count = await markAllNotificationsRead(user._id)
      return NextResponse.json({ success: true, count })
    }

    if (action === 'delete' && notificationId) {
      const success = await deleteNotification(notificationId)
      if (!success) {
        return NextResponse.json(
          { error: 'Failed to delete notification' },
          { status: 500 }
        )
      }
      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (error) {
    console.error('Error processing notification action:', error)
    return NextResponse.json(
      { error: 'Failed to process notification action' },
      { status: 500 }
    )
  }
}
