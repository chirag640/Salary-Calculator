# Authentication System Documentation

## Overview

This authentication system provides secure, user-friendly authentication with multiple options:

- **Email/Password Registration** with OTP email verification
- **Password-based Login** with rate limiting
- **Magic Link / OTP Login** (passwordless)
- **Google OAuth Sign-In** with account linking
- **Account Linking** to merge Google with existing email accounts

## Security Features

### 🔐 Core Security

- **HttpOnly Cookies**: Auth tokens stored in HttpOnly cookies (not accessible to JavaScript)
- **Secure Flag**: Cookies marked as Secure in production (HTTPS only)
- **SameSite=Lax**: Protection against CSRF while allowing OAuth redirects
- **JWT Signing**: 7-day token expiry with rotation capability
- **Password Hashing**: bcrypt with 12 rounds for passwords
- **OTP Hashing**: bcrypt with 10 rounds for short-lived OTPs

### 🛡️ Protection Mechanisms

- **Rate Limiting**: All endpoints protected against brute force
  - Registration: 5 per hour per IP
  - Login: 5 attempts per 15 minutes per email
  - OTP verification: 10 attempts per 15 minutes
  - OTP resend: 1 per minute, 5 per day
  
- **OTP Security**:
  - 6-digit numeric codes
  - 10-minute expiry
  - Single-use only
  - Max 5 verification attempts
  - Hashed before storage

- **OAuth State Verification**: CSRF protection with signed state tokens
- **Redirect Validation**: Prevents open redirect vulnerabilities
- **Email Validation**: RFC 5322 compliant email validation
- **Password Requirements**: 8+ chars, uppercase, lowercase, number, special character

## API Endpoints

### Registration Flow

#### 1. Register with Email
```http
POST /api/auth/register
Content-Type: application/json

{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "SecurePass123!"
}
```

**Response:**
```json
{
  "message": "Verification code sent",
  "email": "jo***@example.com",
  "expiresIn": 600
}
```

#### 2. Verify OTP
```http
POST /api/auth/verify-otp
Content-Type: application/json

{
  "email": "john@example.com",
  "otp": "123456",
  "returnTo": "/"
}
```

**Response:**
```json
{
  "message": "Registration successful",
  "user": {
    "_id": "...",
    "email": "john@example.com",
    "name": "John Doe",
    "isVerified": true
  },
  "returnTo": "/"
}
```
*Sets `auth-token` HttpOnly cookie*

#### 3. Resend OTP
```http
POST /api/auth/resend-otp
Content-Type: application/json

{
  "email": "john@example.com",
  "purpose": "registration"
}
```

### Login Flow

#### Option A: Password Login
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "john@example.com",
  "password": "SecurePass123!"
}
```

**Response:**
```json
{
  "message": "Login successful",
  "user": {
    "_id": "...",
    "email": "john@example.com",
    "name": "John Doe",
    "isVerified": true
  }
}
```
*Sets `auth-token` HttpOnly cookie*

#### Option B: Magic Link / OTP Login

**Step 1: Request OTP**
```http
POST /api/auth/send-login-otp
Content-Type: application/json

{
  "email": "john@example.com"
}
```

**Step 2: Verify OTP**
```http
POST /api/auth/verify-login-otp
Content-Type: application/json

{
  "email": "john@example.com",
  "otp": "123456",
  "returnTo": "/"
}
```

### Google OAuth Flow

#### 1. Initiate Google Sign-In
```http
GET /api/auth/google/auth?returnTo=/dashboard
```
*Redirects to Google consent screen*

#### 2. Callback (Automatic)
```http
GET /api/auth/google/callback?code=...&state=...
```

**Behavior:**
- **New email**: Creates account and logs in
- **Existing email without Google**: Redirects to account linking page
- **Already linked**: Logs in directly

### Account Linking

#### Check if Linking Required
If callback redirects to `/link-account?token=...`, the user needs to verify ownership.

#### Link with Password
```http
POST /api/auth/link-account
Content-Type: application/json

{
  "linkToken": "base64_token_from_url",
  "method": "password",
  "password": "SecurePass123!"
}
```

#### Link with OTP

**Step 1: Request OTP**
```http
POST /api/auth/link-account
Content-Type: application/json

{
  "linkToken": "base64_token_from_url",
  "method": "otp"
}
```

**Step 2: Verify OTP**
```http
POST /api/auth/verify-link-otp
Content-Type: application/json

{
  "email": "john@example.com",
  "otp": "123456"
}
```

### Account Management

#### Get Account Status
```http
GET /api/auth/account-status
Cookie: auth-token=...
```

**Response:**
```json
{
  "user": {
    "_id": "...",
    "email": "john@example.com",
    "name": "John Doe",
    "isVerified": true
  },
  "authMethods": {
    "password": true,
    "google": true
  },
  "linkedAccounts": [
    {
      "provider": "google",
      "email": "john@example.com",
      "linkedAt": "2025-01-15T..."
    }
  ]
}
```

#### Unlink Google Account
```http
POST /api/auth/unlink-google
Cookie: auth-token=...
Content-Type: application/json

{
  "password": "SecurePass123!"
}
```

**Note:** Requires password. Cannot unlink if it's the only auth method.

#### Logout
```http
POST /api/auth/logout
Cookie: auth-token=...
```

## Database Schema

### Collections

#### `users`
```javascript
{
  _id: ObjectId,
  email: String (unique, indexed),
  password: String (bcrypt hash, optional for OAuth-only users),
  name: String,
  isVerified: Boolean,
  googleId: String (optional, indexed),
  passwordResetToken: String (optional),
  passwordResetExpires: Date (optional),
  createdAt: Date,
  updatedAt: Date
}
```

#### `auth_otps`
```javascript
{
  _id: ObjectId,
  email: String (indexed),
  otpHash: String (bcrypt hash),
  expiresAt: Date (indexed with TTL),
  used: Boolean,
  attempts: Number,
  purpose: String ("registration" | "login" | "link-account"),
  metadata: Object,
  resendCount: Number,
  createdAt: Date
}
```

#### `oauth_integrations`
```javascript
{
  _id: ObjectId,
  userId: String (indexed),
  provider: String ("google"),
  providerId: String (provider's user ID),
  email: String,
  accessToken: String (encrypted),
  refreshToken: String (encrypted),
  tokenExpiry: Date,
  scopes: Array<String>,
  createdAt: Date,
  updatedAt: Date
}
```

### Recommended Indexes

```javascript
// Users
db.users.createIndex({ email: 1 }, { unique: true })
db.users.createIndex({ googleId: 1 }, { sparse: true })

// OTPs (with TTL for auto-cleanup)
db.auth_otps.createIndex({ email: 1, purpose: 1 })
db.auth_otps.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 })

// OAuth Integrations
db.oauth_integrations.createIndex({ userId: 1, provider: 1 })
db.oauth_integrations.createIndex({ providerId: 1, provider: 1 })
```

## Environment Variables

### Required

```bash
# JWT & Security
JWT_SECRET=your-super-secret-jwt-key-min-32-chars
ENCRYPTION_KEY=your-encryption-key-for-oauth-tokens-32-chars

# Database
MONGODB_URI=mongodb://localhost:27017/time-tracker

# Application URL
APP_URL=http://localhost:3000
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Email (SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
MAIL_FROM_NAME=Time Tracker
MAIL_FROM_EMAIL=noreply@timetracker.com

# Google OAuth
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret
GOOGLE_REDIRECT_URI=http://localhost:3000/api/auth/google/callback
```

### Optional

```bash
# Node Environment
NODE_ENV=production
```

## Email Templates

### OTP Email Features
- **Professional design** with branded header
- **Large, clear OTP code** in monospace font
- **Expiry countdown** prominently displayed
- **Masked email** for privacy
- **Purpose-specific messaging** (registration, login, linking)
- **Unsubscribe footer** (compliance ready)

### Email Providers

Tested with:
- ✅ Gmail (with App Password)
- ✅ SendGrid
- ✅ AWS SES
- ✅ Mailgun
- ✅ Any SMTP server

## User Flows

### 1. New User Registration
```
1. User fills registration form → POST /api/auth/register
2. System sends OTP email (6-digit code)
3. User enters OTP → POST /api/auth/verify-otp
4. Account created, user logged in ✅
```

### 2. Existing User Login (Password)
```
1. User enters email + password → POST /api/auth/login
2. System verifies credentials
3. User logged in ✅
```

### 3. Existing User Login (OTP)
```
1. User enters email only → POST /api/auth/send-login-otp
2. System sends OTP email
3. User enters OTP → POST /api/auth/verify-login-otp
4. User logged in ✅
```

### 4. New User with Google
```
1. User clicks "Sign in with Google"
2. Redirected to Google consent → GET /api/auth/google/auth
3. Google returns to callback → GET /api/auth/google/callback
4. New account created, user logged in ✅
```

### 5. Existing User with Google (Account Linking)
```
1. User clicks "Sign in with Google"
2. Google returns email that exists in system
3. Redirected to /link-account page
4. User chooses verification method:
   a) Password: Enter password → Account linked ✅
   b) OTP: Receive email → Enter OTP → Account linked ✅
```

### 6. Unlink Google Account
```
1. User goes to settings/security
2. Clicks "Unlink Google Account"
3. Enters password for confirmation
4. Google account unlinked (can still login with password) ✅
```

## Error Handling

### Common Error Responses

```json
// Rate Limited
{
  "error": "Too many requests. Please try again later.",
  "retryAfter": 45
}

// Invalid OTP
{
  "error": "Invalid verification code",
  "remainingAttempts": 3
}

// Expired OTP
{
  "error": "Verification code has expired. Please request a new one."
}

// Account Already Exists
{
  "error": "If this email is not already registered, you will receive a verification code."
}

// Invalid Password
{
  "error": "Invalid email or password"
}

// OAuth Error
// Redirects to: /login?error=oauth_failure
```

## Testing

### Manual Testing Checklist

- [ ] Register new account with email/password
- [ ] Verify OTP within 10 minutes
- [ ] Try expired OTP (wait 10+ minutes)
- [ ] Try invalid OTP (check attempt counter)
- [ ] Resend OTP multiple times
- [ ] Login with password
- [ ] Login with OTP (magic link)
- [ ] Sign in with Google (new account)
- [ ] Sign in with Google (existing account - should prompt linking)
- [ ] Link Google account with password
- [ ] Link Google account with OTP
- [ ] Unlink Google account
- [ ] Try unlinking when no password set (should fail)
- [ ] Test rate limiting (make many rapid requests)
- [ ] Check account status endpoint

### Test Users

Create test users for each scenario:
```javascript
// Email-only user
{ email: "test@example.com", password: "Test1234!", hasGoogle: false }

// Google-only user  
{ email: "google@example.com", googleId: "123...", hasPassword: false }

// Linked user
{ email: "linked@example.com", password: "Test1234!", googleId: "456..." }
```

## Security Best Practices

### For Developers

1. **Never log sensitive data** (passwords, tokens, OTPs)
2. **Rotate JWT_SECRET** periodically
3. **Monitor rate limit hits** for attack detection
4. **Use HTTPS in production** (required for secure cookies)
5. **Implement CSRF tokens** for state-changing requests
6. **Sanitize all user inputs**
7. **Use parameterized queries** (MongoDB prevents injection by default)

### For Operations

1. **Set up monitoring** for auth failures
2. **Alert on rate limit spikes**
3. **Regular security audits**
4. **Test disaster recovery** (password reset, account recovery)
5. **Backup database regularly**
6. **Use environment-specific secrets** (dev/staging/prod)

## Compliance

### GDPR Considerations

- ✅ Email verification (opt-in)
- ✅ User can delete account
- ✅ OAuth consent clearly explained
- ✅ Unsubscribe link in emails
- ⚠️ Add privacy policy link
- ⚠️ Implement data export feature
- ⚠️ Add cookie consent banner

### Password Policy

Current requirements:
- Minimum 8 characters
- At least 1 uppercase letter
- At least 1 lowercase letter
- At least 1 number
- At least 1 special character

Can be adjusted in `/lib/validation/auth.ts`

## Troubleshooting

### OTP Not Received

1. Check SMTP credentials
2. Verify email is not in spam
3. Check rate limits (may be blocked)
4. Verify email format is valid

### OAuth Errors

1. Verify Google Client ID/Secret
2. Check redirect URI matches exactly
3. Ensure OAuth consent screen is published
4. Verify scopes are correct

### Cookie Not Set

1. Check SameSite setting (should be "lax" for OAuth)
2. Verify domain in production
3. Ensure HTTPS in production
4. Check browser cookie settings

### Rate Limit Issues

1. Clear rate limits by restarting server (in-memory)
2. For production, use Redis for distributed rate limiting
3. Adjust limits in `/lib/rate-limit.ts`

## Future Enhancements

### Recommended Additions

1. **Two-Factor Authentication (2FA)**
   - TOTP (Google Authenticator)
   - SMS backup codes

2. **Session Management**
   - View active sessions
   - Revoke sessions remotely
   - Device fingerprinting

3. **Refresh Tokens**
   - Short-lived access tokens (15 min)
   - Long-lived refresh tokens (30 days)
   - Token rotation on refresh

4. **Additional OAuth Providers**
   - GitHub
   - Microsoft
   - Apple Sign In

5. **Advanced Security**
   - Suspicious login detection
   - IP-based blocking
   - Device recognition
   - Login notifications

6. **User Preferences**
   - Email verification toggle
   - Login notification settings
   - Trusted devices

## Support

For issues or questions:
1. Check logs in console
2. Verify environment variables
3. Review error messages
4. Test with curl/Postman
5. Check database indexes

---

**Version:** 1.0.0  
**Last Updated:** January 2025  
**License:** MIT
