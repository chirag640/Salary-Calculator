<!-- Improved compatibility of back to top link -->

<a id="readme-top"></a>

<!-- PROJECT SHIELDS -->

[![License: Unlicense](https://img.shields.io/badge/license-Unlicense-lightgrey.svg)](#license)
[![Next.js](https://img.shields.io/badge/Next.js-15.2.4-000000?style=for-the-badge&logo=nextdotjs&logoColor=white)](#built-with)
[![React](https://img.shields.io/badge/React-19-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](#built-with)

<br />
<div align="center">
  <h1>Salary Calculator — Time Tracker</h1>
  <p align="center">A lightweight, modern time tracker & salary calculator built with Next.js and Tailwind — now with a glassmorphic UI.</p>
  <p align="center">
    <a href="#getting-started">Get Started</a>
    ·
    <a href="#features">Features</a>
    ·
    <a href="#contributing">Contributing</a>
  </p>
</div>

---

## Table of Contents

- [About the Project](#about-the-project)
- [Features](#features)
- [Built With](#built-with)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Install](#install)
- [Development](#development)
- [Scripts](#scripts)
- [Folder Structure](#folder-structure)
- [Design & Theme Notes](#design--theme-notes)
- [Contributing](#contributing)
- [License](#license)
- [Contact](#contact)

---

## About the Project

Salary Calculator is a personal time-tracking and salary calculator web app. Log work sessions, manage leave, compute earnings by day/week/month, and generate simple invoices or exports. The project emphasizes clarity, a lightweight codebase, and a modern glassmorphic UI.

This repository is a Next.js application with Tailwind CSS for styling, Radix UI primitives for accessible components, and a small set of utilities for time and salary calculations.

<p align="right">(<a href="#readme-top">back to top</a>)</p>

## Features

### ⏱️ Time Tracking

- **Quick Start Timer** — Start tracking with one click
- Log time entries (time-in / time-out) and manual hours
- Timer states: Running → Paused (resumable) → Stopped (final)
- Smart timer logic prevents resuming stopped timers

### 💰 Salary & Invoicing

- Automatic hourly-rate handling via profile settings
- Salary increment tracking with effective dates
- Overtime calculations
- Invoice generation with PDF export
- Custom salary periods and rates

### 📊 Analytics & Reports

- Summary dashboard with interactive charts (Recharts)
- Project breakdowns and time distribution
- Weekly/monthly reports
- AI-powered report generation
- Export to CSV/JSON

### 📅 Integrations

- GitHub (Coming Soon)
- Jira (Coming Soon)

### 🔔 Notifications

- In-app notification center
- Email notifications for important events
- Scheduled weekly summary reports
- Daily/weekly reminders
- Customizable notification preferences

### 📱 Mobile & PWA

- Mobile-first responsive design
- Progressive Web App (installable)
- Bottom navigation for mobile
- Touch-optimized quick actions menu
- Offline support with service worker

### 🎨 Design & Accessibility

- Glassmorphic design theme
- Dark mode with system preference detection
- High contrast mode support
- Accessible focus states
- Reduced-motion support
- WCAG 2.1 compliant

### 🔒 Security & PIN System

- JWT-based authentication with httpOnly cookies
- CSRF protection on all mutations
- bcrypt password hashing (12 rounds)
- OAuth2 token encryption (AES-256-GCM)
- **Mandatory PIN setup** during onboarding
- PIN-protected salary viewing and exports
- Rate limiting on authentication endpoints
- Audit logging for sensitive operations
- Security headers (CSP, HSTS)

#### PIN System Features

- **Required Setup**: All users must set a 4-8 digit PIN during onboarding
- **Middleware Protection**: Redirects to profile if PIN not configured
- **Salary Protection**: PIN required to view salary information
- **Export Protection**: PIN authentication required before CSV export
- **Secure Verification**: PIN stored as bcrypt hash, never in plaintext
- **Reveal Tokens**: Temporary JWT tokens for salary display (5-minute expiry)

<p align="right">(<a href="#readme-top">back to top</a>)</p>

## Built With

- Next.js 15
- React 19
- Tailwind CSS (v4)
- Radix UI primitives for headless accessible components
- Recharts for charts
- Framer Motion for small motion interactions

<p align="right">(<a href="#readme-top">back to top</a>)</p>

## Getting Started

These instructions will get you a copy running on your local machine for development and testing.

### Prerequisites

- Node.js (v18+ recommended)
- pnpm (preferred for this repo) — install with:

```powershell
npm install -g pnpm
```

> Note: For Windows users, the default shell is `cmd.exe` in this repo. Use a modern terminal (Windows Terminal) or PowerShell for better results.

### Install

1. Clone the repo

```powershell
git clone https://github.com/chirag640/Salary-Calculator.git
cd Salary-Calculator
```

2. Install dependencies

```powershell
pnpm install
```

3. Install additional dependencies

```powershell
pnpm install nodemailer date-fns googleapis
pnpm install --save-dev @types/nodemailer @types/jsonwebtoken
```

4. Create .env.local

Copy the example file and fill in your values:

```powershell
copy .env.example .env.local
```

Generate secure secrets:

```powershell
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Run this command 3 times and use the outputs for `JWT_SECRET`, `CSRF_SECRET`, and `ENCRYPTION_KEY`.

#### Minimum Required Variables

```env
# Database
MONGODB_URI=mongodb://localhost:27017/timetracker
MONGODB_DB=timetracker

# Security (generate 3 different 64-char hex strings)
JWT_SECRET=your-64-char-hex-string
CSRF_SECRET=your-64-char-hex-string
ENCRYPTION_KEY=your-64-char-hex-string

# Application
NEXT_PUBLIC_APP_URL=http://localhost:3000
NODE_ENV=development
```

#### Google OAuth Setup (Required for Google Sign-In)

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable "Google+ API" or "Google Identity"
4. Go to "Credentials" → "Create Credentials" → "OAuth 2.0 Client ID"
5. Configure OAuth consent screen (External, add test users)
6. Application type: Web application
7. Add authorized redirect URI:
   - Local: `http://localhost:3000/api/auth/google/callback`
   - Production: `https://your-app.vercel.app/api/auth/google/callback`
8. Copy Client ID and Client Secret to `.env.local`:

```env
# Google OAuth
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret
GOOGLE_AUTH_REDIRECT_URI=http://localhost:3000/api/auth/google/callback
```

#### Email Notifications (Optional)

For Gmail, generate an App Password (Google Account → Security → 2-Step Verification → App passwords):

```env
# SMTP Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-gmail-app-password
SMTP_FROM=Time Tracker <noreply@timetracker.app>
```

**📚 For detailed setup instructions, see [INSTALLATION.md](INSTALLATION.md)**  
**🚀 For deployment to Vercel, see [DEPLOYMENT.md](DEPLOYMENT.md)**

5. Start MongoDB

```powershell
net start MongoDB
```

Or use MongoDB Atlas (cloud) — see [INSTALLATION.md](INSTALLATION.md) for details.

6. Start dev server

```powershell
pnpm dev
```

Open http://localhost:3000 in your browser.

<p align="right">(<a href="#readme-top">back to top</a>)</p>

## Development notes

- The app uses Tailwind CSS (v4) with PostCSS. Styles live in `app/globals.css` and component-level classes are in `components/ui/`.
- The theme system uses `next-themes` and CSS variables to support light/dark modes. There is also a glassmorphic design utility added under `.glass-card`, `.glass-input`, `.glass-button` in `app/globals.css`.
- Server API routes are under `app/api/*`.
- The UI is componentized under `components/` with a `ui/` folder for design system primitives.

Key files to review when contributing:

- `app/layout.tsx` — root layout + theme provider
- `app/globals.css` — Tailwind + glass-theme tokens
- `components/app-shell.tsx` — header + nav
- `components/time-entry-form.tsx` — primary data entry form

<p align="right">(<a href="#readme-top">back to top</a>)</p>

## Scripts

Available npm scripts (via `pnpm`):

- `pnpm dev` — run Next dev server
- `pnpm build` — build for production
- `pnpm start` — start production server (after build)
- `pnpm lint` — run Next.js linting

<p align="right">(<a href="#readme-top">back to top</a>)</p>

## Folder Structure

```
app/                  # Next.js app router (pages & api routes)
components/           # React components and UI primitives
lib/                  # utilities: time-utils, mongodb helper, types
public/               # static assets
styles/               # additional styles
```

<p align="right">(<a href="#readme-top">back to top</a>)</p>

## Design & Theme Notes

- The project ships with a glassmorphic design inspired by iOS: look for `.glass-card`, `.glass-input`, and `.bg-aurora` in `app/globals.css`.
- Accessibility: focus-visible styles are applied globally; the CSS also respects `prefers-reduced-motion` and reduces heavy visual effects for users who request reduced motion.
- To change the intensity of the glass effect, adjust blur values in `app/globals.css` or add a theme toggle (suggested improvement).

<p align="right">(<a href="#readme-top">back to top</a>)</p>

## Contributing

Contributions are welcome. Suggested workflow:

1. Fork the project
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a pull request

Please keep changes focused and include screenshots for style/UI changes.

<p align="right">(<a href="#readme-top">back to top</a>)</p>

## 📖 Documentation

- **[INSTALLATION.md](INSTALLATION.md)** — Complete local setup guide
- **[DEPLOYMENT.md](DEPLOYMENT.md)** — Vercel deployment guide with Google OAuth setup
- **[SECURITY_AUDIT.md](SECURITY_AUDIT.md)** — Security best practices and audit
- **[PROJECT_IMPROVEMENTS.md](PROJECT_IMPROVEMENTS.md)** — Feature suggestions and enhancements
- **[TIMER_FEATURE.md](docs/TIMER_FEATURE.md)** — Timer feature documentation
- **[TIMER_MIGRATION.md](docs/TIMER_MIGRATION.md)** — Timer migration guide

## 🚀 Roadmap

### ✅ Completed

- ✅ Quick Start Timer with pause/resume
- ✅ PWA support with offline mode
- ✅ Mobile-first responsive design
- ✅ Dark mode with system detection
- ✅ Notifications system (email + in-app)
<!-- Google Calendar integration removed -->
- ✅ OAuth2 authentication
- ✅ Invoice generator
- ✅ AI report generation

### 🔄 In Progress

- ⚡ Complete integration management UI
- ⚡ API endpoints for event preview/import
- ⚡ Mapping rules builder interface
- ⚡ Background job worker for automated sync

### 📋 Planned

- 🔜 GitHub integration (import commits/PRs as entries)
- 🔜 Jira integration (import issues/worklogs)
- 🔜 Team collaboration features
- 🔜 Two-factor authentication (2FA)
- 🔜 Advanced analytics dashboard
- 🔜 Keyboard shortcuts
- 🔜 Drag & drop time entries
- 🔜 Bulk actions (edit/delete multiple)
- 🔜 Entry templates
- 🔜 Pomodoro timer
- 🔜 Budget tracking per project
- 🔜 Voice input for logging
- 🔜 Browser extension
- 🔜 Native mobile app (Capacitor)

**See [PROJECT_IMPROVEMENTS.md](PROJECT_IMPROVEMENTS.md) for detailed roadmap and suggestions.**

<p align="right">(<a href="#readme-top">back to top</a>)</p>

## 🐛 Troubleshooting

### Common Issues

#### Issue: Google OAuth Not Working

**Symptoms**: "Invalid redirect URI" or "Access blocked"

**Solutions**:

1. Verify redirect URI in Google Cloud Console matches exactly:
   - Local: `http://localhost:3000/api/auth/google/callback`
   - Production: `https://your-app.vercel.app/api/auth/google/callback`
2. Check `GOOGLE_AUTH_REDIRECT_URI` in `.env.local` matches
3. Ensure OAuth consent screen is configured with test users
4. Wait 5 minutes after adding redirect URI (propagation delay)

#### Issue: "Application error: a client-side exception has occurred"

**Symptoms**: Blank page with error message on production

**Solutions**:

1. Check Vercel Runtime Logs for specific errors
2. Verify all environment variables are set in Vercel
3. Ensure `NEXT_PUBLIC_APP_URL` matches your Vercel domain
4. Redeploy after setting/changing environment variables

#### Issue: PIN Not Working or Salary Not Visible

**Symptoms**: Can't set PIN, salary shows as hidden

**Solutions**:

1. Complete profile setup at `/profile?onboarding=true`
2. Log out and log back in to refresh JWT token
3. Verify PIN is saved (check MongoDB `users` collection for `pinHash`)
4. Clear browser cookies and try again

#### Issue: MongoDB Connection Failed

**Symptoms**: "Failed to connect to database" errors

**Solutions**:

1. **Local**: Ensure MongoDB service is running:
   ```powershell
   net start MongoDB
   ```
2. **Atlas**:
   - Verify IP address `0.0.0.0/0` is whitelisted
   - Check connection string format
   - Ensure password doesn't contain special characters

#### Issue: Email Verification Not Received

**Symptoms**: No verification code email

**Solutions**:

1. Check spam/junk folder
2. Verify SMTP credentials are correct
3. For Gmail: Use App Password, not regular password
4. Check Vercel logs for email sending errors
5. Resend verification code after 60 seconds

#### Issue: Build Fails with "useSearchParams should be wrapped in suspense"

**Symptoms**: Next.js build error about Suspense

**Solutions**:

1. Ensure you have the latest code with Suspense fixes
2. All pages using `useSearchParams()` are wrapped in `<Suspense>`
3. Run local build first: `pnpm build`

#### Issue: CSRF Token Mismatch

**Symptoms**: "Invalid CSRF token" errors on form submissions

**Solutions**:

1. Verify `CSRF_SECRET` is set and 64 characters
2. Clear browser cookies
3. Check if using correct HTTP method (POST, not GET)
4. Ensure `credentials: "include"` in fetch calls

### Development Tips

- **Hot Reload Issues**: Restart dev server with `pnpm dev`
- **Port Already in Use**: Kill process on port 3000 or use different port
- **TypeScript Errors**: Run `pnpm tsc --noEmit` to check types
- **Styling Issues**: Clear Next.js cache: `rm -rf .next`

### Getting Help

If issues persist:

1. Check [DEPLOYMENT.md](DEPLOYMENT.md) for detailed troubleshooting
2. Review [SECURITY_AUDIT.md](SECURITY_AUDIT.md) for security best practices
3. Open an issue on GitHub with:
   - Error message and stack trace
   - Environment (local/production)
   - Steps to reproduce
   - Screenshots if applicable

<p align="right">(<a href="#readme-top">back to top</a>)</p>

---

## License

This project is distributed under the Unlicense License — see `LICENSE` or include a LICENSE file if you want a different license.

<p align="right">(<a href="#readme-top">back to top</a>)</p>

## Contact

If you'd like help maintaining or extending this project, open an issue or contact the project owner.

Project link: https://github.com/chirag640/Salary-Calculator

<p align="right">(<a href="#readme-top">back to top</a>)</p>
