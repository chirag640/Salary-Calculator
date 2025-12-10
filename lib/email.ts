import nodemailer from "nodemailer"

// Creates a transporter using Gmail SMTP with App Password.
// Expect env vars: SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, APP_URL
export function createTransporter() {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env
  if (!SMTP_HOST || !SMTP_PORT || !SMTP_USER || !SMTP_PASS) {
    throw new Error("Missing SMTP environment variables. Set SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS")
  }
  return nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT),
    secure: Number(SMTP_PORT) === 465, // true for 465, false for 587
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASS,
    },
  })
}

interface SendResetEmailParams {
  to: string
  name: string
  token: string // raw token
}

export async function sendPasswordResetEmail({ to, name, token }: SendResetEmailParams) {
  const transporter = createTransporter()
  const baseUrl = process.env.APP_URL || "http://localhost:3000"
  const resetUrl = `${baseUrl}/reset-password?token=${encodeURIComponent(token)}`

  const fromName = process.env.MAIL_FROM_NAME || "Salary Calculator Support"
  const fromEmail = process.env.MAIL_FROM_EMAIL || process.env.SMTP_USER || "no-reply@example.com"

  const html = `
  <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:16px;">
    <h2>Password Reset Request</h2>
    <p>Hi ${name || "there"},</p>
    <p>We received a request to reset your password. Click the button below to choose a new one. This link is valid for 15 minutes.</p>
    <p style="text-align:center;margin:24px 0;">
      <a href="${resetUrl}" style="background:#2563eb;color:#fff;padding:12px 20px;border-radius:6px;text-decoration:none;display:inline-block;">Reset Password</a>
    </p>
    <p>If the button doesn't work, copy and paste this URL into your browser:</p>
    <code style="word-break:break-all;">${resetUrl}</code>
    <p>If you didn't request this, you can ignore this email.</p>
    <p style="margin-top:32px;">— ${fromName}</p>
  </div>`

  await transporter.sendMail({
    from: `${fromName} <${fromEmail}>`,
    to,
    subject: "Reset your Salary Calculator password",
    html,
    text: `Hi ${name || "there"},\n\nReset your password using the link (valid 15 min): ${resetUrl}\nIf you didn't request this you can ignore it.\n`,
  })
}

interface SendOTPEmailParams {
  to: string
  name?: string
  otp: string
  purpose: "registration" | "login" | "link-account"
  expiryMinutes?: number
}

export async function sendOTPEmail({ to, name, otp, purpose, expiryMinutes = 10 }: SendOTPEmailParams) {
  const transporter = createTransporter()
  const fromName = process.env.MAIL_FROM_NAME || "Salary Calculator Support"
  const fromEmail = process.env.MAIL_FROM_EMAIL || process.env.SMTP_USER || "no-reply@example.com"

  // Mask email for privacy (show first 2 chars and domain)
  const maskedEmail = to.replace(/(.{2})(.*)(@.*)/, "$1***$3")

  const purposeText = {
    registration: "complete your registration",
    login: "sign in to your account",
    "link-account": "link your Google account",
  }[purpose]

  const subjectText = {
    registration: "Verify your email",
    login: "Your login code",
    "link-account": "Link your account",
  }[purpose]

  const html = `
  <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:16px;background:#f9fafb;border-radius:8px;">
    <div style="background:#fff;padding:24px;border-radius:8px;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
      <h2 style="margin:0 0 16px;color:#1f2937;">Verification Code</h2>
      <p style="margin:0 0 16px;color:#4b5563;">Hi ${name || "there"},</p>
      <p style="margin:0 0 24px;color:#4b5563;">Use this code to ${purposeText}:</p>
      
      <div style="text-align:center;margin:24px 0;">
        <div style="display:inline-block;background:#f3f4f6;padding:16px 32px;border-radius:8px;border:2px solid #e5e7eb;">
          <span style="font-size:32px;font-weight:bold;letter-spacing:8px;color:#1f2937;font-family:monospace;">${otp}</span>
        </div>
      </div>
      
      <p style="margin:24px 0 16px;color:#6b7280;font-size:14px;">
        This code will expire in <strong>${expiryMinutes} minutes</strong>.
      </p>
      
      <div style="margin-top:32px;padding-top:24px;border-top:1px solid #e5e7eb;">
        <p style="margin:0 0 8px;color:#6b7280;font-size:13px;">
          If you didn't request this code, please ignore this email.
        </p>
        <p style="margin:0;color:#9ca3af;font-size:12px;">
          This email was sent to ${maskedEmail}
        </p>
      </div>
    </div>
    <p style="text-align:center;margin-top:16px;color:#9ca3af;font-size:12px;">
      © ${new Date().getFullYear()} ${fromName}. All rights reserved.
    </p>
  </div>`

  const text = `Hi ${name || "there"},\n\nYour verification code is: ${otp}\n\nThis code will expire in ${expiryMinutes} minutes.\n\nUse this code to ${purposeText}.\n\nIf you didn't request this, please ignore this email.\n\n— ${fromName}`

  await transporter.sendMail({
    from: `${fromName} <${fromEmail}>`,
    to,
    subject: `${subjectText} - ${fromName}`,
    html,
    text,
  })
}
