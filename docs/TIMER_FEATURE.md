# Persistent Timers with Idle Detection

## Overview

The time tracker now includes robust persistent timers that survive browser refreshes, tab closures, and even computer restarts. The system automatically detects idle periods and prompts users to confirm or discard inactive time.

## Features

### 🕐 Persistent Timers
- **Server-side state**: Timer state stored in MongoDB, not browser memory
- **Session survival**: Close your browser and reopen - timer still running
- **Multi-device**: Start on desktop, check on mobile
- **Accurate tracking**: Uses server timestamps to prevent clock drift

### 🎯 Idle Detection
- **Automatic monitoring**: Detects when user has been inactive
- **Configurable threshold**: Default 10 minutes, adjustable per timer
- **User confirmation**: Prompt to keep or discard idle time
- **Heartbeat mechanism**: Regular pings prevent false positives

### ⚡ Quick Start
- One-click timer start from main dashboard
- Automatically creates entry and begins tracking
- No manual time entry needed

## How It Works

### Architecture

```
Client (React)          Server (Next.js API)      Database (MongoDB)
    |                           |                          |
    |-- Start Timer ----------->|                          |
    |                           |-- Create TimerState ---->|
    |<------- Timer ID ---------|                          |
    |                           |                          |
    |-- Heartbeat (every 30s)-->|                          |
    |                           |-- Update lastHeartbeat ->|
    |                           |                          |
    |-- Pause/Stop ------------>|                          |
    |                           |-- Calculate elapsed ---->|
    |                           |-- Check idle time ------->|
    |<------- Response ---------|                          |
```

### Timer State Schema

```typescript
interface TimerState {
  isRunning: boolean              // Current status
  startedAt?: Date                // Initial start timestamp
  pausedAt?: Date[]               // Array of pause timestamps
  resumedAt?: Date[]              // Array of resume timestamps
  lastHeartbeatAt?: Date          // Last client activity
  accumulatedSeconds: number      // Total time accumulated
  idleThresholdMinutes?: number   // Idle detection threshold
}
```

### API Endpoints

#### `POST /api/time-entries/[id]/timer`
Control timer actions: start, pause, resume, stop, heartbeat

**Request:**
```json
{
  "action": "start|pause|resume|stop|heartbeat",
  "timestamp": "2025-01-15T10:30:00.000Z",
  "idleThresholdMinutes": 10
}
```

**Response (Success):**
```json
{
  "success": true,
  "timer": { /* TimerState */ },
  "elapsedSeconds": 3600
}
```

**Response (Idle Detected):**
```json
{
  "error": "Idle time detected",
  "idleWarning": {
    "idleSeconds": 900,
    "lastHeartbeat": "2025-01-15T10:00:00.000Z",
    "message": "No activity detected for 15 minutes..."
  }
}
```

#### `GET /api/time-entries/[id]/timer`
Get current timer state and elapsed time

**Response:**
```json
{
  "success": true,
  "timer": { /* TimerState */ },
  "elapsedSeconds": 7200,
  "idleDetection": {
    "isIdle": false,
    "idleSeconds": 0
  }
}
```

## User Guide

### Starting a Timer

**Method 1: Quick Start**
1. Select date from calendar
2. Click "Quick Start Timer" button
3. Timer begins immediately

**Method 2: With Entry**
1. Fill out time entry form
2. Save entry
3. Click "Start Timer" on the entry

### Managing a Running Timer

**Pause**: Temporarily stop without ending the session
- Click "Pause" button
- Timer freezes at current time
- Can resume later

**Resume**: Continue from where you paused
- Click "Resume" button
- Timer continues counting from paused time

**Stop**: End timer and save final time
- Click "Stop" button
- Time entry updated with calculated hours
- Timer cannot be restarted

### Idle Time Detection

When idle time is detected, you'll see a dialog:

```
⚠️ Idle Time Detected

No activity detected for approximately 15 minutes.

Would you like to keep this time or discard the idle period?

[Discard Idle Time]  [Keep All Time]
```

**Discard Idle Time**: Subtracts the idle duration from total
**Keep All Time**: Keeps full elapsed time (useful if you were working offline)

## Developer Guide

### Custom Hook: `useTimer`

```typescript
import { useTimer, formatTimerDisplay } from '@/hooks/use-timer'

function MyComponent({ entryId }) {
  const {
    timer,              // Current timer state
    elapsedSeconds,     // Total seconds elapsed
    isRunning,          // Boolean status
    startTimer,         // Start function
    pauseTimer,         // Pause function
    resumeTimer,        // Resume function
    stopTimer,          // Stop function
    sendHeartbeat,      // Manual heartbeat
    loading,            // Loading state
    error               // Error message
  } = useTimer({
    entryId,
    onTimerUpdate: (timer, elapsed) => {
      // Called when timer state changes
    },
    onIdleDetected: (idleSeconds) => {
      // Called when idle time detected
    },
    heartbeatIntervalMs: 30000,  // 30 seconds
    autoFetch: true
  })

  return (
    <div>
      <p>{formatTimerDisplay(elapsedSeconds)}</p>
      <button onClick={startTimer}>Start</button>
      <button onClick={pauseTimer}>Pause</button>
    </div>
  )
}
```

### Components

#### `<TimerControls />`
Full-featured timer UI with all controls and idle detection dialog.

```tsx
import { TimerControls } from '@/components/timer-controls'

<TimerControls 
  entryId="abc123"
  onTimerStop={() => {
    // Called when timer stops
  }}
/>
```

#### `<QuickStartTimer />`
One-click timer creation and start.

```tsx
import { QuickStartTimer } from '@/components/quick-start-timer'

<QuickStartTimer 
  selectedDate="2025-01-15"
  onEntryCreated={(entryId) => {
    // Called when entry created and timer started
  }}
/>
```

## Configuration

### Idle Threshold
Default: 10 minutes

Change per timer:
```typescript
await fetch(`/api/time-entries/${id}/timer`, {
  method: 'POST',
  body: JSON.stringify({
    action: 'start',
    idleThresholdMinutes: 15  // 15 minutes
  })
})
```

### Heartbeat Interval
Default: 30 seconds

Change in hook:
```typescript
useTimer({
  entryId,
  heartbeatIntervalMs: 60000  // 1 minute
})
```

## Edge Cases Handled

### ✅ Browser Refresh
Timer state fetched from server, continues correctly.

### ✅ Tab/Window Close and Reopen
Timer persists server-side, recalculates on reconnect.

### ✅ Multiple Tabs
Each tab syncs with server, heartbeats update shared state.

### ✅ Offline Mode
Client continues local counting, syncs when online.

### ✅ Clock Drift
Server timestamps used as source of truth.

### ✅ Daylight Saving Time
UTC timestamps prevent hour loss/duplication.

### ✅ Very Long Timers
Supports timers running for days (48+ hours).

### ✅ Rapid Actions
Rate limiting prevents abuse, handles quick clicks gracefully.

### ✅ Concurrent Modifications
Database operations prevent race conditions.

## Security

- **CSRF Protection**: All timer actions require valid CSRF token
- **Authentication**: Only authenticated users can control timers
- **Authorization**: Users can only access their own timer entries
- **Rate Limiting**: 30 requests per 10 seconds per IP
- **Input Validation**: Zod schemas validate all requests

## Performance

- **Efficient Polling**: Heartbeat only when timer running
- **Minimal Data Transfer**: Small JSON payloads (~200 bytes)
- **Indexed Queries**: MongoDB indexes on userId and _id
- **Client-side Caching**: Timer state cached until invalidated
- **Interval Cleanup**: All intervals cleared on unmount

## Troubleshooting

### Timer Shows Incorrect Time
**Solution**: Refresh page to sync with server state

### Idle Detection Too Sensitive
**Solution**: Increase `idleThresholdMinutes` value

### Heartbeat Failures
**Cause**: Network issues
**Solution**: Timer continues locally, syncs when connection restored

### Timer Not Starting
**Causes**:
- No CSRF token (check browser console)
- Authentication expired (redirect to login)
- Entry deleted or is leave entry

**Solution**: Ensure valid session and active entry

### Multiple Timers Running
**Not Supported**: Each entry can only have one timer
**Solution**: Stop existing timer before starting new one

## Future Enhancements

- [ ] Timer templates (common work patterns)
- [ ] Break time auto-detection
- [ ] Weekly timer reports
- [ ] Timer goals and achievements
- [ ] Team timer synchronization
- [ ] Timer export to calendar apps
- [ ] Voice commands for timer control
- [ ] Smart idle time suggestions based on patterns

## Support

For issues or feature requests, please contact the development team or file an issue in the repository.

---

**Version**: 1.0.0
**Last Updated**: January 2025
