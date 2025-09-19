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

- Log time entries (time-in / time-out) and manual hours
- Automatic hourly-rate handling via profile settings and salary increments
- Leave tracking with leave types and optional reasons
- Summary dashboard with charts and project breakdowns (uses Recharts)
- Export and invoice generation endpoints
- Glassmorphic design theme with accessible focus states and reduced-motion support

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

3. Create .env.local (if needed)

This project contains APIs for profile, time-entries, and auth that may require environment variables for external services. For local dev, none are strictly required unless you wire in SMTP, OpenAI, or cloud DB credentials. Example variables (if you plan to connect a DB or provider):

```
MONGODB_URI=your_mongo_connection_string
JWT_SECRET=supersecret
```

4. Start dev server

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

## Roadmap / Ideas

- Add a theme intensity toggle (Minimal / Standard / Vibrant)
- Add visual regression tests (Playwright/Chromatic)
- Add multi-tenant export and CSV templates
- Add authentication providers (OAuth)

<p align="right">(<a href="#readme-top">back to top</a>)</p>

## License

This project is distributed under the Unlicense License — see `LICENSE` or include a LICENSE file if you want a different license.

<p align="right">(<a href="#readme-top">back to top</a>)</p>

## Contact

If you'd like help maintaining or extending this project, open an issue or contact the project owner.

Project link: https://github.com/chirag640/Salary-Calculator

<p align="right">(<a href="#readme-top">back to top</a>)</p>
