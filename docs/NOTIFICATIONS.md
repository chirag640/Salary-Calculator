# Notifications & Reminders System

Complete notification system with email summaries, scheduled reports, and in-app alerts.

## Features

### 🔔 Notification Types

1. **Idle Timer Alert** ⏱️
   - Notifies when timer runs too long without stopping
   - Prevents accidental overnight timers
   - In-app notifications only

2. **Daily Timer Reminder** ⏰
   - Reminds you to start tracking time
   - Configurable time (default: 5 PM)
   - Email + Push notifications

3. **Daily Summary** 📊
   - End-of-day work summary
   - Total hours, earnings, entries
   - Email with formatted HTML

4. **Weekly Summary** 📈 (Featured)
   - Comprehensive weekly report
   - Day-by-day breakdown
   - Average daily hours, total earnings
   - Beautiful HTML email template

5. **Monthly Summary** 📅
   - Full month overview
   - Working days, leave days
   - Monthly totals and averages

6. **Overdue Invoice Alert** 💰
   - Automatic reminders for overdue invoices
   - Email + In-app notifications
   - Days overdue counter

7. **Hourly Rate Reminder** 💵
   - Reminds new users to set hourly rate
   - One-time notification
   - Dismissible

### 📧 Delivery Channels

- **Email** - Rich HTML emails with templates
- **In-App** - Bell icon with notification panel
- **Push** - Browser/mobile push notifications (future)

### ⚙️ Preferences

- Enable/disable individual notification types
- Choose delivery channels per notification
- Set quiet hours (pause notifications)
- Schedule custom report times
- Timezone support

## Installation

### 1. Install Dependencies

```bash
npm install nodemailer
npm install --save-dev @types/nodemailer
```

Note: If you encounter PowerShell execution policy errors, run:
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

### 2. Environment Variables

Add to your `.env.local`:

```env
# SMTP Configuration (Gmail example)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
SMTP_FROM="Time Tracker <noreply@timetracker.app>"

# App URL for email links
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

#### Gmail Setup

1. Enable 2-Factor Authentication on your Google account
2. Go to [App Passwords](https://myaccount.google.com/apppasswords)
3. Create an app password for "Mail"
4. Use that password in `SMTP_PASSWORD`

#### Other Email Services

**SendGrid:**
```env
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASSWORD=your-sendgrid-api-key
```

**Mailgun:**
```env
SMTP_HOST=smtp.mailgun.org
SMTP_PORT=587
SMTP_USER=postmaster@yourdomain.com
SMTP_PASSWORD=your-mailgun-password
```

**AWS SES:**
```env
SMTP_HOST=email-smtp.us-east-1.amazonaws.com
SMTP_PORT=587
SMTP_USER=your-ses-smtp-username
SMTP_PASSWORD=your-ses-smtp-password
```

### 3. Database Collections

MongoDB will auto-create these collections:

- `notificationSettings` - User preferences
- `notificationQueue` - Pending notifications
- `scheduledReports` - Scheduled report configs
- `inAppNotifications` - In-app notification history

### 4. Test Email Configuration

Create a test file to verify email setup:

```typescript
// scripts/test-email.ts
import { sendEmail } from '@/lib/notifications/email'

async function testEmail() {
  const success = await sendEmail({
    to: 'your-test-email@example.com',
    subject: 'Test Email',
    text: 'If you receive this, email is working!',
    html: '<h1>Email works!</h1><p>Your SMTP configuration is correct.</p>',
  })
  
  console.log('Email sent:', success)
}

testEmail()
```

Run with: `npx tsx scripts/test-email.ts`

## Usage

### Access Notification Settings

1. Go to Profile page
2. Scroll to "Notification Settings" section
3. Or navigate to `/profile#notifications`

### Configure Notifications

#### Global Settings

- **Email Notifications** - Master switch for all emails
- **In-App Notifications** - Show notifications in app
- **Push Notifications** - Browser/mobile push (future)
- **Quiet Hours** - Pause notifications (e.g., 10 PM - 8 AM)

#### Individual Preferences

For each notification type:

1. Toggle enabled/disabled
2. Choose delivery channels (Email, In-App, Push)
3. View schedule if applicable
4. Adjust frequency

### Weekly Summary Setup

1. Enable "Weekly Summary" notification
2. Select "EMAIL" channel
3. Default schedule: Monday 9:00 AM
4. Customize schedule in scheduled reports (future)

### Create Scheduled Report

Use the API endpoint:

```typescript
POST /api/notifications/reports
{
  "name": "Weekly Work Report",
  "type": "WEEKLY",
  "frequency": "WEEKLY",
  "schedule": {
    "dayOfWeek": 1,  // Monday
    "hour": 9,
    "minute": 0,
    "timezone": "America/New_York"
  },
  "enabled": true,
  "format": "EMAIL_HTML",
  "recipients": ["your-email@example.com"],
  "includeData": {
    "timeEntries": true,
    "earnings": true,
    "projects": true,
    "charts": false
  },
  "dateRange": {
    "type": "LAST_WEEK"
  }
}
```

## API Endpoints

### GET /api/notifications

Get user's in-app notifications

Query params:
- `includeRead=true` - Include read notifications

Response:
```json
{
  "notifications": [...],
  "unreadCount": 5
}
```

### POST /api/notifications

Perform actions on notifications

```json
{
  "action": "markRead",
  "notificationId": "123"
}

{
  "action": "markAllRead"
}

{
  "action": "delete",
  "notificationId": "123"
}
```

### GET /api/notifications/settings

Get user's notification preferences

### PUT /api/notifications/settings

Update global notification settings

```json
{
  "emailNotificationsEnabled": true,
  "inAppNotificationsEnabled": true,
  "quietHoursEnabled": true,
  "quietHours": {
    "start": "22:00",
    "end": "08:00"
  }
}
```

### POST /api/notifications/settings

Update individual notification preference

```json
{
  "type": "WEEKLY_SUMMARY",
  "enabled": true,
  "channels": ["EMAIL"],
  "frequency": "WEEKLY",
  "schedule": {
    "dayOfWeek": 1,
    "hour": 9,
    "minute": 0
  }
}
```

### GET /api/notifications/reports

Get user's scheduled reports

### POST /api/notifications/reports

Create scheduled report (see Weekly Summary Setup)

### PUT /api/notifications/reports

Update scheduled report

```json
{
  "id": "report-id",
  "enabled": false
}
```

### DELETE /api/notifications/reports

Delete scheduled report

Query params:
- `id=report-id`

## Background Jobs (TODO)

For automated sending, you'll need a job queue:

### Option 1: Cron Jobs (Simple)

Create `scripts/send-notifications.ts`:

```typescript
import { getPendingNotifications, markNotificationSent } from '@/lib/notifications/db'
import { sendNotificationEmail } from '@/lib/notifications/email'

async function processNotifications() {
  const pending = await getPendingNotifications(50)
  
  for (const notification of pending) {
    if (notification.channel === 'EMAIL') {
      const success = await sendNotificationEmail(
        notification.userId, // Get email from user
        notification.type,
        notification.data.metadata
      )
      
      if (success) {
        await markNotificationSent(notification._id)
      }
    }
  }
}

processNotifications()
```

Run every minute:
```bash
# Add to crontab
* * * * * cd /path/to/app && npx tsx scripts/send-notifications.ts
```

### Option 2: BullMQ + Redis (Production)

```bash
npm install bullmq ioredis
```

Create queue worker:

```typescript
// workers/notifications.ts
import { Worker } from 'bullmq'
import { sendEmail } from '@/lib/notifications/email'

const worker = new Worker(
  'notifications',
  async (job) => {
    const { type, userId, data } = job.data
    await sendEmail(...)
  },
  { connection: { host: 'localhost', port: 6379 } }
)
```

Add jobs:

```typescript
import { Queue } from 'bullmq'

const queue = new Queue('notifications')

await queue.add('send-email', {
  type: 'WEEKLY_SUMMARY',
  userId: '123',
  data: {...},
})
```

### Option 3: Vercel Cron (Serverless)

Add to `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/cron/notifications",
      "schedule": "*/5 * * * *"
    }
  ]
}
```

Create endpoint:

```typescript
// app/api/cron/notifications/route.ts
export async function GET(req: Request) {
  // Verify cron secret
  if (req.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 })
  }
  
  // Process notifications
  await processNotifications()
  
  return Response.json({ success: true })
}
```

## Email Templates

Weekly summary email includes:

- 📊 Beautiful header with gradient
- 📈 Stats cards (hours, earnings, days worked, avg)
- 📅 Day-by-day breakdown
- 🔗 Link to manage preferences
- 📱 Mobile-responsive design

Customize in `lib/notifications/email.ts`:

```typescript
export async function sendWeeklySummaryEmail(
  to: string,
  data: {
    weekStart: string
    weekEnd: string
    hours: number
    earnings: number
    // ... customize data structure
  }
)
```

## Troubleshooting

### Emails Not Sending

1. Check SMTP credentials in `.env.local`
2. Test with `scripts/test-email.ts`
3. Check Gmail security settings (app passwords, less secure apps)
4. Verify port (587 for TLS, 465 for SSL)
5. Check firewall/network restrictions

### Notifications Not Appearing

1. Check global notification settings (must be enabled)
2. Verify notification type is enabled
3. Check delivery channel is selected
4. Ensure quiet hours not active
5. Check browser console for errors

### Scheduled Reports Not Sending

1. Set up cron job or background worker
2. Verify timezone in schedule configuration
3. Check `nextScheduled` field is calculated correctly
4. Monitor queue for failed jobs

### Type Errors

If you see module not found errors:

```bash
npm install --save-dev @types/nodemailer @types/node
```

### MongoDB Connection

Ensure MongoDB URI is set:

```env
MONGODB_URI=mongodb://localhost:27017
MONGODB_DB=timetracker
```

## Next Steps

1. ✅ Install nodemailer dependencies
2. ✅ Configure SMTP credentials
3. ✅ Test email sending
4. ✅ Add notification settings to Profile page
5. ⏳ Set up background job processor
6. ⏳ Test weekly summary emails
7. ⏳ Add in-app notification UI (bell icon)
8. ⏳ Implement push notifications

## Security Notes

- Never commit `.env.local` with real credentials
- Use app-specific passwords (not your main email password)
- Rate limit notification endpoints
- Validate user permissions before sending
- Sanitize email content to prevent XSS
- Use CSRF tokens for settings updates (already implemented)

## Performance

- Queue processes 50 notifications at a time
- Failed notifications retry up to 3 times
- Old read notifications auto-delete after 30 days
- Use background workers to avoid blocking requests
- Consider email service limits (Gmail: 500/day)

## Future Enhancements

- 🔔 Browser push notifications via Service Worker
- 📱 Mobile app notifications (React Native)
- 🎨 Customizable email templates
- 📊 Notification analytics dashboard
- 🌐 Multi-language support
- 🤖 AI-powered notification timing
- 📅 Calendar integration (Google, Outlook)
- 💬 Slack/Discord webhooks
- 📈 Notification delivery reports
