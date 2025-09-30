# Forgot Password Endpoint

POST /api/auth/forgot
Body: { "email": "user@example.com" }

Always returns 200 with a generic message to avoid user enumeration.
Rate limited: 5 requests / 15 minutes per IP.

Environment variables required:
- SMTP_HOST (e.g., smtp.gmail.com)
- SMTP_PORT (e.g., 587)
- SMTP_USER (Gmail address)
- SMTP_PASS (App password)
- APP_URL (Base URL for building reset links)
- MAIL_FROM_NAME (Optional display name)
- MAIL_FROM_EMAIL (Optional from email; falls back to SMTP_USER)
