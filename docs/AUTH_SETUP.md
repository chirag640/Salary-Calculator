# Authentication System Setup Guide

## Quick Start

This guide will help you set up the complete authentication system in under 10 minutes.

## Prerequisites

- Node.js 18+ installed
- MongoDB running locally or remote instance
- Gmail account (for SMTP) or other email provider
- Google Cloud Console account (for OAuth)

## Step 1: Install Dependencies ✅

All required packages are already in `package.json`:
- `bcryptjs` - Password hashing
- `jsonwebtoken` - JWT tokens
- `nodemailer` - Email sending
- `googleapis` - Google OAuth

Dependencies are already installed via pnpm.

## Step 2: Configure Environment Variables

Create or update `.env.local` in the project root:

```bash
# Application URLs
APP_URL=http://localhost:3000
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Security Keys
JWT_SECRET=change-this-to-a-random-32-char-secret-key-12345
ENCRYPTION_KEY=change-this-to-another-random-32-char-key-67890

# MongoDB
MONGODB_URI=mongodb://localhost:27017/time-tracker

# Email (Gmail Example)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password-here
MAIL_FROM_NAME=Time Tracker
MAIL_FROM_EMAIL=noreply@yourdomain.com

# Google OAuth
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret
GOOGLE_REDIRECT_URI=http://localhost:3000/api/auth/google/callback
```

### Generate Secure Keys

Run this in Node.js console to generate secrets:

```javascript
// In terminal
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
// Run twice for JWT_SECRET and ENCRYPTION_KEY
```

## Step 3: Set Up Gmail SMTP (5 minutes)

### Option A: Gmail App Password (Recommended)

1. Go to your Google Account settings: https://myaccount.google.com/
2. Navigate to **Security** → **2-Step Verification** (enable if not enabled)
3. Scroll to **App passwords**
4. Select **Mail** and **Other (Custom name)** → Enter "Time Tracker"
5. Copy the 16-character password
6. Paste into `SMTP_PASS` in `.env.local`
7. Set `SMTP_USER` to your Gmail address

### Option B: Other Email Providers

**SendGrid:**
```bash
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASS=your-sendgrid-api-key
```

**AWS SES:**
```bash
SMTP_HOST=email-smtp.us-east-1.amazonaws.com
SMTP_PORT=587
SMTP_USER=your-aws-access-key-id
SMTP_PASS=your-aws-secret-access-key
```

**Mailgun:**
```bash
SMTP_HOST=smtp.mailgun.org
SMTP_PORT=587
SMTP_USER=postmaster@your-domain.mailgun.org
SMTP_PASS=your-mailgun-password
```

## Step 4: Set Up Google OAuth (5 minutes)

1. **Go to Google Cloud Console**
   - Visit: https://console.cloud.google.com/

2. **Create/Select Project**
   - Click on project dropdown → "New Project"
   - Name it "Time Tracker" → Create

3. **Enable Google+ API**
   - Navigate to "APIs & Services" → "Library"
   - Search for "Google+ API" → Enable

4. **Configure OAuth Consent Screen**
   - Go to "APIs & Services" → "OAuth consent screen"
   - Select "External" → Create
   - Fill in:
     - App name: `Time Tracker`
     - User support email: Your email
     - Developer contact: Your email
   - Click "Save and Continue"
   - Skip scopes (default scopes are fine)
   - Add test users (your email for testing)
   - Click "Save and Continue"

5. **Create OAuth Client ID**
   - Go to "APIs & Services" → "Credentials"
   - Click "+ CREATE CREDENTIALS" → "OAuth client ID"
   - Application type: "Web application"
   - Name: `Time Tracker Web Client`
   - Authorized JavaScript origins:
     - `http://localhost:3000`
   - Authorized redirect URIs:
     - `http://localhost:3000/api/auth/google/callback`
   - Click "Create"

6. **Copy Credentials**
   - Copy the Client ID → Paste into `GOOGLE_CLIENT_ID`
   - Copy the Client Secret → Paste into `GOOGLE_CLIENT_SECRET`

## Step 5: Set Up MongoDB Indexes

Run this script to create optimal indexes:

```javascript
// In MongoDB shell or Compass
use time_tracker

// Users collection
db.users.createIndex({ email: 1 }, { unique: true })
db.users.createIndex({ googleId: 1 }, { sparse: true })

// OTPs collection with auto-expiry
db.auth_otps.createIndex({ email: 1, purpose: 1 })
db.auth_otps.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 })

// OAuth integrations
db.oauth_integrations.createIndex({ userId: 1, provider: 1 })
db.oauth_integrations.createIndex({ providerId: 1, provider: 1 })
```

Or run via Node.js:

```javascript
// In terminal at project root
node -e "
const { MongoClient } = require('mongodb');
const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/time-tracker';

(async () => {
  const client = await MongoClient.connect(uri);
  const db = client.db();
  
  await db.collection('users').createIndex({ email: 1 }, { unique: true });
  await db.collection('users').createIndex({ googleId: 1 }, { sparse: true });
  await db.collection('auth_otps').createIndex({ email: 1, purpose: 1 });
  await db.collection('auth_otps').createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });
  await db.collection('oauth_integrations').createIndex({ userId: 1, provider: 1 });
  await db.collection('oauth_integrations').createIndex({ providerId: 1, provider: 1 });
  
  console.log('✅ Indexes created successfully');
  await client.close();
})();
"
```

## Step 6: Test the System

### Start the Development Server

```bash
pnpm dev
```

### Test 1: Email Registration

1. Open http://localhost:3000/register
2. Fill in name, email, and password (must meet requirements)
3. Click "Register"
4. Check your email for OTP code
5. Enter OTP code
6. Should redirect to dashboard ✅

### Test 2: Password Login

1. Open http://localhost:3000/login
2. Enter email and password
3. Click "Login"
4. Should redirect to dashboard ✅

### Test 3: OTP Login

1. Open http://localhost:3000/login
2. Click "Sign in with email code" (or similar)
3. Enter email only
4. Check email for OTP
5. Enter OTP code
6. Should redirect to dashboard ✅

### Test 4: Google Sign-In (New Account)

1. Open http://localhost:3000/login
2. Click "Sign in with Google"
3. Select Google account
4. Consent to permissions
5. Should redirect to dashboard ✅

### Test 5: Google Sign-In (Existing Account)

1. Register normally with email (e.g., test@example.com)
2. Logout
3. Click "Sign in with Google" using same email
4. Should see account linking page
5. Enter password or request OTP
6. Verify and link accounts ✅

### Test 6: Check Account Status

```bash
# In browser console or curl
curl http://localhost:3000/api/auth/account-status \
  -H "Cookie: auth-token=YOUR_TOKEN"
```

Should show linked accounts and auth methods.

## Troubleshooting

### Issue: OTP Email Not Sending

**Check:**
```bash
# Test SMTP connection
node -e "
const nodemailer = require('nodemailer');
const transport = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});
transport.verify((err) => {
  if (err) console.error('❌ SMTP Error:', err);
  else console.log('✅ SMTP Connected');
});
"
```

**Solutions:**
- Verify SMTP credentials
- Check if port 587 is blocked (try 465 with `secure: true`)
- Enable "Less secure app access" for Gmail (not recommended)
- Use App Password instead

### Issue: Google OAuth Error

**Check:**
- Client ID and Secret are correct
- Redirect URI exactly matches in Google Console
- OAuth consent screen is configured
- Test user is added (if in testing mode)

**Common Error:**
```
redirect_uri_mismatch
```
**Solution:** Ensure redirect URI in `.env.local` exactly matches the one in Google Console (including protocol and port).

### Issue: Rate Limit Blocking Tests

**Solution:**
Restart dev server to clear in-memory rate limits:
```bash
# Stop server (Ctrl+C)
pnpm dev
```

For production, implement Redis-based rate limiting.

### Issue: MongoDB Connection Failed

**Check:**
```bash
# Test MongoDB connection
mongosh mongodb://localhost:27017/time-tracker --eval "db.stats()"
```

**Solutions:**
- Ensure MongoDB is running: `brew services start mongodb-community` (Mac) or `sudo systemctl start mongod` (Linux)
- Check `MONGODB_URI` in `.env.local`
- Verify network access if using MongoDB Atlas

### Issue: Cookies Not Set

**Check:**
- Browser is not blocking cookies
- Using `http://localhost:3000` (not `127.0.0.1`)
- SameSite is set to "lax" for OAuth flows
- Check browser DevTools → Application → Cookies

## Production Deployment

### Environment Variables for Production

Update these in your hosting platform (Vercel, Railway, etc.):

```bash
# Change to production URLs
APP_URL=https://yourdomain.com
NEXT_PUBLIC_APP_URL=https://yourdomain.com

# Keep existing secrets (or generate new ones)
JWT_SECRET=your-production-jwt-secret
ENCRYPTION_KEY=your-production-encryption-key

# Update Google OAuth redirect
GOOGLE_REDIRECT_URI=https://yourdomain.com/api/auth/google/callback
```

### Update Google Cloud Console

1. Go to OAuth Client credentials
2. Add production URLs to:
   - **Authorized JavaScript origins**: `https://yourdomain.com`
   - **Authorized redirect URIs**: `https://yourdomain.com/api/auth/google/callback`

### Security Checklist

- [ ] All environment variables set
- [ ] JWT_SECRET is strong (32+ chars)
- [ ] ENCRYPTION_KEY is strong (32+ chars)
- [ ] HTTPS enabled (required for secure cookies)
- [ ] MongoDB has authentication enabled
- [ ] Rate limiting configured (consider Redis)
- [ ] CORS settings reviewed
- [ ] Email templates tested
- [ ] Error monitoring set up (Sentry, etc.)

## Next Steps

1. **Customize Email Templates**
   - Edit `/lib/email.ts`
   - Add your branding and logo

2. **Add Frontend UI**
   - Create registration page
   - Create login page with multiple options
   - Create account linking page
   - Add account settings page

3. **Enhance Security**
   - Implement 2FA
   - Add suspicious login detection
   - Set up monitoring and alerts

4. **Compliance**
   - Add privacy policy
   - Add terms of service
   - Implement GDPR data export
   - Add cookie consent banner

## Getting Help

- **Documentation**: `/docs/AUTH_SYSTEM.md`
- **API Reference**: See documentation for all endpoints
- **Code Examples**: Check the test section in docs

---

**Setup Complete! 🎉**

You now have a production-ready authentication system with:
- ✅ Email/Password registration with OTP
- ✅ Multiple login options (password, OTP, Google)
- ✅ Account linking
- ✅ Rate limiting
- ✅ Secure token storage
- ✅ Professional email templates

Happy coding! 🚀
