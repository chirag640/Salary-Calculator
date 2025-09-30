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

  const fromName = process.env.MAIL_FROM_NAME || "Time Tracker Support"
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
    subject: "Reset your Time Tracker password",
    html,
    text: `Hi ${name || "there"},\n\nReset your password using the link (valid 15 min): ${resetUrl}\nIf you didn't request this you can ignore it.\n`,
  })
}
