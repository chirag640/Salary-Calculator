# 📅 Google Calendar Integration

Import meetings and events from Google Calendar as time entries automatically.

## Features

### ✅ OAuth2 Integration
- Secure Google Sign-In
- Auto-refresh tokens
- Revoke access anytime

### 📊 Smart Import
- Filter by keywords (e.g., "meeting", "call")
- Exclude personal events (e.g., "lunch", "personal")
- Minimum duration filter
- Only accepted events
- Round duration (15/30 min intervals)

### 🤖 Auto-Mapping
- Rule-based project/client assignment
- Template-based descriptions
- Custom hourly rates per event type
- Priority-based matching

### 🔄 Sync Options
- Manual sync on-demand
- Hourly/Daily/Weekly auto-sync
- Preview before import
- Duplicate detection

## Setup

### 1. Google Cloud Console

Create OAuth2 credentials:

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create new project or select existing
3. Enable **Google Calendar API**:
   - APIs & Services → Library
   - Search "Google Calendar API"
   - Click "Enable"
4. Create OAuth Consent Screen:
   - APIs & Services → OAuth consent screen
   - User Type: External
   - App name: "Time Tracker"
   - User support email: your-email@example.com
   - Developer contact: your-email@example.com
   - Scopes: Add `calendar.readonly`, `userinfo.email`, `userinfo.profile`
   - Test users: Add your email (if not verified)
5. Create OAuth Client ID:
   - APIs & Services → Credentials
   - Create Credentials → OAuth client ID
   - Application type: Web application
   - Name: "Time Tracker Web Client"
   - Authorized redirect URIs:
     - `http://localhost:3000/api/integrations/google/callback`
     - `https://yourdomain.com/api/integrations/google/callback` (production)
   - Copy **Client ID** and **Client Secret**

### 2. Environment Variables

Add to `.env.local`:

```env
# Google Calendar Integration
GOOGLE_CLIENT_ID=your-client-id-here.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret-here
GOOGLE_REDIRECT_URI=http://localhost:3000/api/integrations/google/callback

# App URL (required for OAuth)
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 3. Install Dependencies

```bash
npm install googleapis
npm install --save-dev @types/google.analytics
```

### 4. Database Collections

MongoDB will auto-create:
- `integrations` - Connection status, tokens, settings
- `eventMappings` - Calendar events → Time entries
- `mappingRules` - Auto-mapping rules
- `syncResults` - Sync history

## Usage

### Connect Google Calendar

1. Go to **Profile → Integrations**
2. Click **"Connect Google Calendar"**
3. Sign in to Google
4. Grant calendar read permission
5. You'll be redirected back with "Connected" status

### Configure Import Settings

**Default Settings:**
```typescript
{
  keywords: ['meeting', 'call', 'sync', 'standup', 'review'],
  excludeKeywords: ['lunch', 'break', 'personal', 'birthday', 'holiday'],
  minDuration: 15, // minutes
  onlyAcceptedEvents: true,
  roundToNearest: 15, // minutes
  lookbackDays: 7,
  includeDescription: true,
}
```

**Customize:**
- **Keywords**: Only import events with these words in title/description
- **Exclude Keywords**: Skip events with these words
- **Min Duration**: Ignore short events (< X minutes)
- **Only Accepted**: Skip declined/tentative events
- **Round To**: Round duration to nearest 15/30 mins
- **Lookback Days**: How far back to sync

### Create Mapping Rules

Auto-assign projects based on event properties:

**Example Rule: Client Meetings**
```typescript
{
  name: "Client Meetings",
  priority: 1,
  conditions: {
    titleContains: ["client", "customer", "proposal"],
    minDuration: 30,
  },
  actions: {
    project: "Client Work",
    client: "External",
    hourlyRate: 150,
    workDescriptionTemplate: "Client Meeting: {{title}}",
    shouldImport: true,
  }
}
```

**Example Rule: Internal Meetings**
```typescript
{
  name: "Internal Standups",
  priority: 2,
  conditions: {
    titleContains: ["standup", "sync", "team meeting"],
  },
  actions: {
    project: "Internal",
    hourlyRate: 0, // Non-billable
    shouldImport: true,
  }
}
```

**Example Rule: Skip Personal**
```typescript
{
  name: "Skip Personal Events",
  priority: 10,
  conditions: {
    titleContains: ["personal", "doctor", "dentist"],
  },
  actions: {
    shouldImport: false,
  }
}
```

### Manual Import (Recommended First Time)

1. Go to **Profile → Integrations → Google Calendar**
2. Click **"Preview Import"**
3. Review events that will be imported:
   - ✅ Green = Will import
   - ⏭️ Gray = Will skip (reason shown)
   - 🔄 Blue = Duplicate (already imported)
4. Adjust settings/rules if needed
5. Click **"Import Selected"** (X events, Y hours, $Z)
6. Time entries created instantly

### Auto-Sync (Set & Forget)

1. Enable **"Auto-Import"**
2. Choose frequency:
   - Hourly: Check every hour
   - Daily: Check once per day (midnight)
   - Weekly: Check once per week (Monday)
3. System will import matching events automatically
4. View **Sync History** for results

## API Endpoints

### GET /api/integrations/google/auth
Initiate OAuth flow (redirects to Google)

### GET /api/integrations/google/callback
OAuth callback handler (Google redirects here)

### GET /api/integrations
```typescript
// Get all user integrations
Response: Integration[]
```

### GET /api/integrations/:id
```typescript
// Get specific integration
Response: Integration
```

### PUT /api/integrations/:id/settings
```typescript
// Update import settings
Body: {
  importSettings: {
    keywords?: string[]
    excludeKeywords?: string[]
    minDuration?: number
    // ... other settings
  }
}
```

### POST /api/integrations/:id/sync
```typescript
// Trigger manual sync
Response: SyncResult
```

### GET /api/integrations/:id/preview
```typescript
// Preview import without importing
Query: ?from=2025-01-01&to=2025-01-07
Response: ImportPreview
```

### POST /api/integrations/:id/import
```typescript
// Import specific events
Body: {
  eventIds: string[] // External event IDs to import
}
Response: {
  imported: number
  failed: number
}
```

### DELETE /api/integrations/:id
```typescript
// Disconnect integration
Response: { success: true }
```

### GET /api/integrations/:id/mappings
```typescript
// Get event mappings
Query: ?status=PENDING&from=2025-01-01
Response: EventMapping[]
```

### POST /api/integrations/rules
```typescript
// Create mapping rule
Body: MappingRule
Response: { id: string }
```

### PUT /api/integrations/rules/:id
```typescript
// Update mapping rule
Body: Partial<MappingRule>
```

### DELETE /api/integrations/rules/:id
```typescript
// Delete mapping rule
```

## UI Components

### Integration Card
```tsx
<IntegrationCard
  type="GOOGLE_CALENDAR"
  status="CONNECTED"
  lastSync={new Date()}
  onConnect={() => {}}
  onDisconnect={() => {}}
  onSync={() => {}}
/>
```

### Import Preview
```tsx
<ImportPreview
  integration={integration}
  preview={preview}
  onImport={(eventIds) => {}}
  onUpdateSettings={(settings) => {}}
/>
```

### Mapping Rule Builder
```tsx
<MappingRuleBuilder
  onSave={(rule) => {}}
  existingRule={rule} // for editing
/>
```

## How It Works

### OAuth Flow
```
1. User clicks "Connect"
2. Redirect to Google
3. User grants permission
4. Google redirects back with code
5. Exchange code for tokens
6. Store access_token + refresh_token
7. Fetch user profile
8. Create Integration record
9. Ready to sync!
```

### Sync Process
```
1. Check token expiry → refresh if needed
2. Fetch events from selected calendars
3. For each event:
   a. Check if already imported (duplicate detection)
   b. Apply import filters (keywords, duration, etc.)
   c. Apply mapping rules (project/client/rate)
   d. If auto-import ON → Create time entry
   e. If auto-import OFF → Create pending mapping
4. Update lastSync timestamp
5. Schedule next sync
6. Save sync result
```

### Mapping Rule Priority
```
Rules are applied in priority order (lower = higher):

Priority 1: "VIP Client Meetings" → Project: "VIP"
Priority 2: "All Client Meetings" → Project: "Client Work"
Priority 3: "Internal Meetings" → Project: "Internal"

Event: "Client Meeting with Acme"
Matches: Rule #2 (first match wins)
Result: Project = "Client Work"
```

## Edge Cases

### Duplicate Imports
- System checks `externalEventId` before importing
- If already imported → Skip with status "DUPLICATE"
- If pending → Allow re-import (status changes to IMPORTED)

### Token Expiry
- Access tokens expire after 1 hour
- System auto-refreshes using refresh_token
- If refresh fails → Status = "EXPIRED", show reconnect button

### Revoked Access
- User revokes access in Google Account
- Next sync fails with 401
- Status = "ERROR", error = "Invalid token"
- Show reconnect button

### API Rate Limits
- Google Calendar API: 10,000 requests/day, 50/sec
- System uses exponential backoff
- Max 3 retries with 2^n second delays
- If rate limited → Status = "ERROR", retry later

### Overlapping Events
- Multiple events same time (e.g., team calendar + personal calendar)
- System imports all by default
- User can exclude calendars in settings
- Mapping rules can skip duplicates by organizer email

### Recurring Events
- Google returns individual instances (if `singleEvents=true`)
- Each instance treated as separate event
- Can filter by `recurringEventId` in mapping rules
- Example: Skip recurring standup, only import one-off meetings

### All-Day Events
- Events without specific time (e.g., "Team Offsite")
- System skips by default (no `dateTime`, only `date`)
- Can't calculate duration accurately
- Option to import as 8-hour entry (future feature)

### Timezone Handling
- Events have `timeZone` field
- System converts to user's local time for time entries
- Duration calculated in event's timezone
- Display in user's timezone

### Deleted Events
- Google marks as `status: 'cancelled'`
- System skips cancelled events
- Previously imported → Keep time entry (don't auto-delete)
- User can manually delete if needed

## Security

### OAuth Tokens
- `access_token`: Encrypted at rest (use MongoDB field-level encryption)
- `refresh_token`: Encrypted at rest
- Never sent to client
- Scope: Read-only calendar access

### User Data
- Only imports events user can see
- Respects calendar sharing permissions
- No write access to calendar
- User can revoke anytime

### Rate Limiting
- Limit sync frequency per user
- Max 1 manual sync per minute
- Max 100 auto-syncs per day per user
- Prevent abuse

## Troubleshooting

### "Failed to connect Google Calendar"
- Check `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` in `.env.local`
- Verify redirect URI in Google Cloud Console matches exactly
- Check OAuth consent screen is configured
- Try clearing browser cookies/cache

### "Token expired" or "Invalid token"
- Click "Reconnect" button
- Will trigger new OAuth flow
- Replaces old tokens

### Events not importing
- Check import settings (keywords, filters)
- Review mapping rules (might be marking `shouldImport: false`)
- Check event status (declined events skip by default)
- Look at sync history for errors

### Duplicates importing
- Duplicate detection uses `externalEventId`
- If seeing duplicates → Database issue, check `eventMappings` collection
- Can manually delete duplicate time entries

### Slow sync
- Too many calendars selected
- Too many events in date range
- Reduce `lookbackDays` or deselect unused calendars
- Google API rate limiting (wait and retry)

## Best Practices

### First Time Setup
1. Start with manual import (preview first)
2. Fine-tune keywords and filters
3. Create mapping rules for common event types
4. Test with small date range (1 week)
5. Once happy → Enable auto-sync

### Ongoing Use
1. Review sync history weekly
2. Adjust rules as needed
3. Check for errors (expired tokens, rate limits)
4. Clean up old mappings (> 90 days) periodically

### Performance
1. Don't sync too many calendars (limit to 3-5)
2. Use `onlyAcceptedEvents: true` to reduce volume
3. Set `lookbackDays` to 7-14 (not 365)
4. Use mapping rules to auto-skip (faster than checking every event)

### Privacy
1. Exclude personal calendars from sync
2. Use exclude keywords for sensitive events
3. Don't set `includeAttendees: true` for client meetings (privacy)
4. Review imported data before sharing reports

## Future Enhancements

- [ ] Bi-directional sync (create calendar events from time entries)
- [ ] Import all-day events as custom duration
- [ ] Smart duration rounding (learn from user edits)
- [ ] Bulk edit imported events
- [ ] Calendar-based color coding
- [ ] Meeting notes integration
- [ ] Conflict resolution (overlapping events)
- [ ] Multi-calendar merge strategies
- [ ] Event series handling (edit one vs all)
- [ ] Automatic project detection (AI-based)

## Cost Considerations

### Google Calendar API
- **Free tier**: 1 million requests/day
- **Pricing**: $0 (free for read-only)
- **Quota**: Per project (all users combined)
- **Monitoring**: Check quota usage in Google Cloud Console

### MongoDB Storage
- **Integrations**: ~1-2 KB per integration
- **Event Mappings**: ~2-5 KB per event
- **Sync Results**: ~1 KB per sync
- **Estimate**: 1000 events = ~5 MB

For 100 users importing 50 events/week:
- 5,000 events/week = ~25 MB/week
- ~1 GB/year
- MongoDB Atlas Free Tier: 512 MB (should upgrade to paid)

---

**Need Help?** Check the [API Documentation](../docs/API.md) or [Common Issues](./TROUBLESHOOTING.md).
