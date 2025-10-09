// Email service using NodeMailer
import nodemailer from 'nodemailer'
import type { NotificationType } from './types'
import { NOTIFICATION_TEMPLATES } from './types'

// Email configuration
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD,
  },
})

interface SendEmailOptions {
  to: string | string[]
  subject: string
  text: string
  html?: string
  from?: string
}

export async function sendEmail(options: SendEmailOptions): Promise<boolean> {
  try {
    const from = options.from || process.env.SMTP_FROM || 'Time Tracker <noreply@timetracker.app>'
    
    const info = await transporter.sendMail({
      from,
      to: Array.isArray(options.to) ? options.to.join(', ') : options.to,
      subject: options.subject,
      text: options.text,
      html: options.html || options.text,
    })

    console.log('Email sent:', info.messageId)
    return true
  } catch (error) {
    console.error('Failed to send email:', error)
    return false
  }
}

export async function sendNotificationEmail(
  to: string,
  type: NotificationType,
  data: any
): Promise<boolean> {
  const template = NOTIFICATION_TEMPLATES[type]
  if (!template) {
    console.error('Unknown notification type:', type)
    return false
  }

  const subject = template.subject
  const text = template.message(data)
  const html = template.emailTemplate ? template.emailTemplate(data) : undefined

  return sendEmail({ to, subject, text, html })
}

export async function sendWeeklySummaryEmail(
  to: string,
  data: {
    weekStart: string
    weekEnd: string
    hours: number
    earnings: number
    daysWorked: number
    avgDailyHours: number
    entries: Array<{
      date: string
      project: string
      hours: number
      earnings: number
    }>
  }
): Promise<boolean> {
  const subject = `Weekly Summary: ${data.weekStart} - ${data.weekEnd}`
  
  const text = `
    Weekly Work Summary
    
    Period: ${data.weekStart} - ${data.weekEnd}
    Total Hours: ${data.hours.toFixed(2)}
    Total Earnings: $${data.earnings.toFixed(2)}
    Days Worked: ${data.daysWorked}
    Average Daily Hours: ${data.avgDailyHours.toFixed(2)}
    
    Daily Breakdown:
    ${data.entries.map(e => `${e.date}: ${e.hours.toFixed(2)}h - $${e.earnings.toFixed(2)}`).join('\n')}
  `

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body {
          font-family: Arial, sans-serif;
          line-height: 1.6;
          color: #333;
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
        }
        .header {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          padding: 30px;
          border-radius: 10px 10px 0 0;
          text-align: center;
        }
        .content {
          background: #f9fafb;
          padding: 30px;
          border-radius: 0 0 10px 10px;
        }
        .stats {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 15px;
          margin: 20px 0;
        }
        .stat-card {
          background: white;
          padding: 20px;
          border-radius: 8px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .stat-label {
          font-size: 12px;
          color: #6b7280;
          text-transform: uppercase;
          margin-bottom: 5px;
        }
        .stat-value {
          font-size: 24px;
          font-weight: bold;
          color: #667eea;
        }
        .entries {
          margin-top: 30px;
        }
        .entry {
          background: white;
          padding: 15px;
          margin-bottom: 10px;
          border-radius: 8px;
          border-left: 4px solid #667eea;
        }
        .entry-date {
          font-weight: bold;
          color: #1f2937;
        }
        .entry-details {
          color: #6b7280;
          margin-top: 5px;
        }
        .footer {
          text-align: center;
          margin-top: 30px;
          color: #6b7280;
          font-size: 12px;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>📊 Weekly Summary</h1>
        <p>${data.weekStart} - ${data.weekEnd}</p>
      </div>
      <div class="content">
        <div class="stats">
          <div class="stat-card">
            <div class="stat-label">Total Hours</div>
            <div class="stat-value">${data.hours.toFixed(1)}h</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">Total Earnings</div>
            <div class="stat-value">$${data.earnings.toFixed(2)}</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">Days Worked</div>
            <div class="stat-value">${data.daysWorked}</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">Avg Daily Hours</div>
            <div class="stat-value">${data.avgDailyHours.toFixed(1)}h</div>
          </div>
        </div>
        
        <div class="entries">
          <h3>Daily Breakdown</h3>
          ${data.entries.map(entry => `
            <div class="entry">
              <div class="entry-date">${entry.date}</div>
              <div class="entry-details">
                ${entry.project} • ${entry.hours.toFixed(2)} hours • $${entry.earnings.toFixed(2)}
              </div>
            </div>
          `).join('')}
        </div>
      </div>
      <div class="footer">
        <p>You're receiving this email because you enabled weekly summaries in your Time Tracker settings.</p>
        <p><a href="${process.env.NEXT_PUBLIC_APP_URL}/profile#notifications">Manage notification preferences</a></p>
      </div>
    </body>
    </html>
  `

  return sendEmail({ to, subject, text, html })
}

export async function verifyEmailConfig(): Promise<boolean> {
  try {
    await transporter.verify()
    console.log('Email server is ready')
    return true
  } catch (error) {
    console.error('Email server verification failed:', error)
    return false
  }
}
