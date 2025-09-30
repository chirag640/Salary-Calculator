## Project Analysis Summary

Repository: Salary Counter / Time Tracker (Next.js 15, React 19, Tailwind, MongoDB backend via API routes)
Date: 2025-09-29

### 1. High-Level Observations
- Clean component organization with UI primitives in `components/ui`.
- App Router is used; API routes colocated under `app/api/*`.
- Authentication uses custom JWT token stored in cookie `auth-token`; middleware not shown here but implied.
- Salary and time-entry calculation logic fairly modular (`lib/time-utils.ts`, `lib/salary.ts`).
- Dark/light theme and glassmorphic aesthetic implemented with CSS variables & utility classes.
- Some UX polish done (tabs, animated cards), but certain flows (editing, exports) needed adjustments (partially fixed already).

### 2. Security Review
| Area | Current State | Risk | Recommendation |
|------|---------------|------|----------------|
| Auth token storage | Cookie + localStorage fallback | Medium (token duplication increases attack surface) | Remove localStorage write; use HttpOnly secure cookie only. Add `Secure`, `SameSite=Lax` or `Strict`, `HttpOnly`. |
| JWT validation | `verifyToken` server-side; no refresh mechanism | Low/Med | Introduce short-lived access token + rotating refresh token if scaling auth. |
| Password handling | Registration route (not shown hashing logic) | Critical if not hashing | Ensure bcrypt (>=12 rounds) or argon2. Never store plain text (verify in code). |
| Input validation | Minimal server-side validation (dates/time formats) | Medium | Centralize validation using zod/yup and return structured errors. |
| Rate limiting | None on auth, export, invoice | Medium | Add lightweight rate limiting (e.g., upstash ratelimit or in-memory token bucket). |
| CSRF | API uses cookie-based auth but no CSRF defense | Medium | For state-changing routes add CSRF token or make JWT cookie `SameSite=Strict`. |
| Error leakage | Generic errors mostly; stack logged server-side | Low | Keep as-is but ensure no full stack traces in prod logs for auth failures. |
| Dependency updates | Using bleeding edge Next.js 15/React 19 | Low/Med | Set up GitHub Dependabot or Renovate. |
| Data access control | Queries filter by `userId`; rely on token claims | Medium | Ensure ObjectId conversion and no ability to override `userId` in payload (ignore user-sent userId). |
| Mongo query regex | User-provided `clientFilter`, `projectFilter` used directly as RegExp | Low/Med | Escape user input or limit length to prevent ReDoS. |

### 3. Performance & Scalability
| Aspect | Observation | Improvement |
|--------|-------------|------------|
| Time entries fetch | No pagination on history | Add pagination or infinite scroll; limit to 50–100 per request. |
| Repeated full fetch after edits/deletes | Inefficient for large data sets | Apply local optimistic update or revalidate single item. |
| Export route | Pulls all rows into memory | Stream CSV for large ranges, or impose max range. |
| Calculation logic | Done per request; OK scale | Cache hourly rate lookups for a date per user (in-memory/LRU). |
| Bundle size | Likely larger due to all UI components & lucide icons | Analyze bundle (next build + analyze) and tree-shake unused icons/components. |
| Animations | Framer Motion for multiple elements | Lazy-load motion code or reduce motion for low-perf devices (already partially). |

### 4. Accessibility (a11y)
- Need ARIA labels for icon-only buttons (e.g., edit/delete buttons already have icons but no `aria-label`).
- Ensure color contrast for glass surfaces in dark mode (test with tooling). 
- Add skip-to-content link for keyboard users.
- Form errors surfaced via alerts; ensure focus moves to error summary.
- Date picker component: confirm proper keyboard navigation and announce selected date.

### 5. UX / Product Enhancements
1. Add undo (soft delete) for time entry deletion.
2. Inline editing modal/drawer instead of switching to form tab when editing from history.
3. Add success/error toast notifications for create/update/delete.
4. Provide hourly summary mini-chart for selected week.
5. Add quick duplicate entry action (for similar days).
6. Add filter/search on History tab (by date range, project, leave type).
7. Prefill register/login with demo mode or guest trial account.
8. Provide profile completeness checklist.
9. Export: Allow selecting columns + add JSON format.
10. Add local timezone indicator; allow changing timezone per user.

### 6. Code Quality & Maintainability
| Area | Issue | Action |
|------|-------|--------|
| Magic strings | Leave types, route paths scattered | Centralize constants (e.g., `constants.ts`). |
| Types reuse | Duplicate shapes in API and client | Introduce shared DTO schemas with zod for inference. |
| Error handling | Repetition of try/catch with generic alerts | Abstract API helper returning {data,error}. |
| Form state management | Manual useState per field | Evaluate `react-hook-form` with zod resolver for validation + less boilerplate. |
| Env handling | README suggests optional vars; no runtime checks | Add a runtime env validator (e.g., `@t3-oss/env-nextjs`). |
| Logging | console.log debug remnants in login | Remove or guard behind NODE_ENV check. |

### 7. Testing Strategy Gaps
| Layer | Current | Recommendation |
|-------|---------|----------------|
| Unit | None committed | Add tests for `calculateTimeWorked`, `computeEarningsWithOvertime` edge cases. |
| Integration | None | Test API routes (login, create entry, update, export) using supertest or Next test utilities. |
| E2E | None | Add Playwright for critical flows (login, log time, edit, export, generate invoice). |
| Visual regression | Planned (roadmap) | Integrate Playwright screenshots or Chromatic if using Storybook. |
| Accessibility tests | None | Add axe-core scan in CI for key pages. |

### 8. Data Integrity & Business Logic
- Ensure overtime calculation matches user working config (threshold per day vs aggregated) — verify test coverage.
- Guard against overlapping time entries (currently not enforced — potential double counting).
- Consider adding a derived weekly/monthly materialized summary to speed dashboards.

### 9. Observability & Monitoring
| Aspect | Current | Improvement |
|--------|---------|------------|
| Metrics | None | Add simple logging + optional analytics (server timing headers). |
| Error tracking | Not integrated | Add Sentry or Logtail for API route errors. |
| Audit trail | None | Log entry create/update/delete with user + timestamp for compliance. |

### 10. Privacy & Compliance
- Personal data stored: name, email, possible contact fields. Add a privacy statement.
- Provide account deletion endpoint (GDPR-style) & data export (JSON). 
- Avoid storing raw tokens anywhere else; secure cookie only.

### 11. Internationalization (i18n)
- All strings hardcoded in English. Extract to dictionary and support formatting (dates/numbers) based on locale.

### 12. Roadmap (Prioritized Backlog)
Priority legend: P0 = critical, P1 = high, P2 = medium, P3 = nice-to-have

| ID | Priority | Item | Summary of Action |
|----|----------|------|------------------|
| 1 | P0 | Secure auth cookie | Set HttpOnly, Secure, SameSite=Strict, remove localStorage token. |
| 2 | P0 | Hash passwords check | Verify hashing; add migration if plaintext (bcrypt/argon2). |
| 3 | P1 | Input/schema validation | Introduce zod schemas for all API payloads & central error formatting. |
| 4 | P1 | Overlapping entry prevention | Server-side uniqueness check per user/date/time range. |
| 5 | P1 | Add pagination to history | Limit query & add `?cursor=` or `?page=` support. |
| 6 | P1 | CSV/XLSX large export guard | Enforce max range or streaming for > N rows. |
| 7 | P1 | Toast notifications | Provide consistent feedback for CRUD actions. |
| 8 | P1 | Add tests (unit + integration) | Start with time calculations & auth. |
| 9 | P2 | Accessibility pass | aria-labels, focus management, contrast audit. |
| 10 | P2 | Optimistic updates | Reduce perceived latency for edits/deletes. |
| 11 | P2 | Rate limiting | Add basic IP/user rate limits to auth/export/invoice. |
| 12 | P2 | Export column selector | Let users customize output set & JSON format. |
| 13 | P2 | Refactor form handling | Adopt react-hook-form + zod for TimeEntryForm & auth forms. |
| 14 | P2 | Storybook or component docs | Increase clarity for design system components. |
| 15 | P2 | Add undo delete | Soft delete flag + 30s restore window. |
| 16 | P3 | i18n scaffolding | Add next-intl or similar; externalize strings. |
| 17 | P3 | Weekly summary caching | Persist computed aggregates server-side. |
| 18 | P3 | Audit trail table | Log changes for admin insight. |
| 19 | P3 | Theme intensity toggle | Already roadmap; implement design token scaling. |

### 13. Concrete First Steps (Implementation Sequence)
1. Implement secure cookie flags & remove localStorage token usage.
2. Add zod schemas (`lib/validation`) for auth, time entries, profile, export.
3. Add server middleware to parse & validate body -> typed object.
4. Add pagination to `/api/time-entries` (return `{ items, nextCursor }`).
5. Write unit tests for `time-utils` & `salary` modules.
6. Introduce `useToast` notifications on CRUD success/failure.
7. Add overlapping time entry guard (query for existing overlapping intervals before insert/update).
8. Add `aria-label` to icon-only buttons (edit/delete/export icons, theme toggle if needed).
9. Rate limit auth + export endpoints.
10. Introduce optimistic updates in `app/page.tsx` via local state adjustments before refetch.

### 14. Potential Libraries
- Validation: zod + @hookform/resolvers
- Rate limiting: upstash/ratelimit (if Redis available) or simple in-memory LRU.
- Auth hardening: iron-session or next-auth (if you want provider logins later).
- Monitoring: Sentry SDK for Next.js.
- i18n: next-intl.

### 15. Risks / Watchouts
- Moving to zod + form libs introduces initial overhead—stage changes gradually.
- Streaming export needs careful memory management and early flush (Node stream / web stream).
- Pagination changes can break existing consumers if any (communicate versioning if API is public).

### 16. Success Metrics to Track
- Time to log an entry (interaction to confirmation) < 2s perceived.
- Error rate on API routes < 1%.
- Lighthouse accessibility score ≥ 95.
- Bundle size main chunk < 250KB gzipped (after tree shaking icons/components).
- Test coverage for core logic (time + salary) ≥ 85% lines.

---
This document can be iterated—let me know which priority cluster you’d like implemented next and I can start applying changes.
