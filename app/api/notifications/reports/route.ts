import { NextRequest, NextResponse } from 'next/server'
import { getUserFromSession } from '@/lib/auth'
import {
  getUserScheduledReports,
  createScheduledReport,
  updateScheduledReport,
  deleteScheduledReport,
} from '@/lib/notifications/db'
import type { ScheduledReport, NotificationFrequency } from '@/lib/notifications/types'

// GET /api/notifications/reports - Get user's scheduled reports
export async function GET(req: NextRequest) {
  try {
    const user = getUserFromSession(req)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const reports = await getUserScheduledReports(user._id)
    return NextResponse.json(reports)
  } catch (error) {
    console.error('Error fetching scheduled reports:', error)
    return NextResponse.json(
      { error: 'Failed to fetch scheduled reports' },
      { status: 500 }
    )
  }
}

// POST /api/notifications/reports - Create a new scheduled report
export async function POST(req: NextRequest) {
  try {
    const user = getUserFromSession(req)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const {
      name,
      type,
      frequency,
      schedule,
      enabled,
      format,
      recipients,
      includeData,
      dateRange,
    } = body

    // Validate required fields
    if (!name || !type || !frequency || !schedule || !format || !recipients || !includeData || !dateRange) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    const reportId = await createScheduledReport({
      userId: user._id,
      name,
      type,
      frequency: frequency as NotificationFrequency,
      schedule: {
        ...schedule,
        timezone: schedule.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
      },
      enabled: enabled ?? true,
      format,
      recipients,
      includeData,
      dateRange,
    })

    return NextResponse.json({ id: reportId, success: true })
  } catch (error) {
    console.error('Error creating scheduled report:', error)
    return NextResponse.json(
      { error: 'Failed to create scheduled report' },
      { status: 500 }
    )
  }
}

// PUT /api/notifications/reports - Update a scheduled report
export async function PUT(req: NextRequest) {
  try {
    const user = getUserFromSession(req)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { id, ...updates } = body

    if (!id) {
      return NextResponse.json(
        { error: 'Report ID is required' },
        { status: 400 }
      )
    }

    const success = await updateScheduledReport(id, updates)

    if (!success) {
      return NextResponse.json(
        { error: 'Failed to update scheduled report' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error updating scheduled report:', error)
    return NextResponse.json(
      { error: 'Failed to update scheduled report' },
      { status: 500 }
    )
  }
}

// DELETE /api/notifications/reports - Delete a scheduled report
export async function DELETE(req: NextRequest) {
  try {
    const user = getUserFromSession(req)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const url = new URL(req.url)
    const id = url.searchParams.get('id')

    if (!id) {
      return NextResponse.json(
        { error: 'Report ID is required' },
        { status: 400 }
      )
    }

    const success = await deleteScheduledReport(id)

    if (!success) {
      return NextResponse.json(
        { error: 'Failed to delete scheduled report' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting scheduled report:', error)
    return NextResponse.json(
      { error: 'Failed to delete scheduled report' },
      { status: 500 }
    )
  }
}
