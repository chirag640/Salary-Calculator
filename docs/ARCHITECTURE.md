# 🏗️ Project Architecture Guide

## 📊 System Overview

```
┌─────────────────────────────────────────────────────────────┐
│                        USER INTERFACE                        │
│  (Browser - Next.js React Application)                      │
└─────────────────────────────────────────────────────────────┘
                            ↕️
┌─────────────────────────────────────────────────────────────┐
│                      COMPONENTS LAYER                        │
│  • Quick Start Timer                                         │
│  • Time Entry Form                                           │
│  • Time Entry List                                           │
│  • Timer Controls                                            │
└─────────────────────────────────────────────────────────────┘
                            ↕️
┌─────────────────────────────────────────────────────────────┐
│                       HOOKS & STATE                          │
│  • useTimer (timer state management)                         │
│  • useCsrfToken (security)                                   │
│  • React State (local UI state)                              │
└─────────────────────────────────────────────────────────────┘
                            ↕️
┌─────────────────────────────────────────────────────────────┐
│                        API ROUTES                            │
│  • /api/time-entries (CRUD operations)                       │
│  • /api/time-entries/[id]/timer (timer actions)              │
│  • /api/profile/hourly-rate (rate fetching)                  │
└─────────────────────────────────────────────────────────────┘
                            ↕️
┌─────────────────────────────────────────────────────────────┐
│                     DATABASE LAYER                           │
│  MongoDB - Collections:                                      │
│  • users (user accounts & rates)                             │
│  • timeEntries (work logs & timers)                          │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔄 Data Flow Diagrams

### Flow 1: Quick Start Timer

```
┌──────────────┐
│   User       │
│   Clicks     │
│  "Quick      │
│   Start"     │
└──────┬───────┘
       │
       ↓
┌──────────────────────────────────────┐
│  QuickStartTimer Component           │
│  1. Fetch hourly rate                │
│  2. Create new time entry via API    │
│  3. Start timer via API              │
│  4. Set activeEntryId state          │
└──────┬───────────────────────────────┘
       │
       ↓
┌──────────────────────────────────────┐
│  useTimer Hook                       │
│  • Fetches timer state               │
│  • Updates every second (tick)       │
│  • Sends heartbeat every 30s         │
│  • Calculates elapsed time           │
└──────┬───────────────────────────────┘
       │
       ↓
┌──────────────────────────────────────┐
│  Running Timer Interface             │
│  Shows:                              │
│  • Timer display (00:00:00)          │
│  • Hourly rate                       │
│  • Work description input            │
│  • Current earnings                  │
│  • Stop button                       │
└──────┬───────────────────────────────┘
       │
       ↓ (User clicks Stop)
┌──────────────────────────────────────┐
│  Stop Timer Action                   │
│  1. Call stopTimer from hook         │
│  2. API sets timer.status="stopped"  │
│  3. Calculate final time             │
│  4. Save to database                 │
│  5. Clear activeEntryId              │
└──────────────────────────────────────┘
```

### Flow 2: Manual Entry

```
┌──────────────┐
│   User       │
│   Fills      │
│   Manual     │
│   Form       │
└──────┬───────┘
       │
       ↓
┌──────────────────────────────────────┐
│  TimeEntryForm Component             │
│  • User selects entry type           │
│  • Enters start/end times            │
│  • Sees live calculation             │
│  • Adds work description             │
└──────┬───────────────────────────────┘
       │
       ↓
┌──────────────────────────────────────┐
│  Form Validation                     │
│  • Check required fields             │
│  • Validate time format              │
│  • Ensure hourly rate exists         │
└──────┬───────────────────────────────┘
       │
       ↓
┌──────────────────────────────────────┐
│  Submit to API                       │
│  POST /api/time-entries              │
│  {                                   │
│    date, timeIn, timeOut,            │
│    hourlyRate, workDescription,      │
│    totalHours, totalEarnings         │
│  }                                   │
└──────┬───────────────────────────────┘
       │
       ↓
┌──────────────────────────────────────┐
│  Database Save                       │
│  • Validate no overlaps              │
│  • Save to timeEntries collection    │
│  • Return created entry              │
└──────┬───────────────────────────────┘
       │
       ↓
┌──────────────────────────────────────┐
│  UI Update                           │
│  • Add to entries list               │
│  • Show success toast                │
│  • Clear form                        │
└──────────────────────────────────────┘
```

---

## 🎯 Component Relationships

```
app/page.tsx (Main Dashboard)
│
├─── Quick Start Section
│    └─── <QuickStartTimer />
│         │
│         ├─── Shows button (when not running)
│         │
│         └─── Shows timer interface (when running)
│              ├─── Timer display
│              ├─── Hourly rate
│              ├─── Work description
│              └─── Stop button
│
├─── Manual Entry Section
│    └─── <TimeEntryForm />
│         │
│         ├─── Entry type selection
│         │    ├─── Regular work
│         │    ├─── Leave day
│         │    └─── Holiday work
│         │
│         ├─── Time fields
│         ├─── Hourly rate display
│         ├─── Work description
│         └─── Submit button
│
└─── Today's Entries Section
     └─── <TimeEntryList />
          └─── For each entry:
               ├─── <TimeEntryCard />
               │    ├─── Entry details
               │    ├─── Edit button
               │    └─── Delete button
               │
               └─── <TimerControls /> (if timer active/paused)
                    ├─── Play button (if paused)
                    ├─── Pause button (if running)
                    └─── Stop button
```

---

## 🔐 State Management

### Local Component State
```typescript
// QuickStartTimer
const [loading, setLoading] = useState(false)
const [activeEntryId, setActiveEntryId] = useState<string | null>(null)
const [hourlyRate, setHourlyRate] = useState<number>(0)
const [workDescription, setWorkDescription] = useState("")

// TimeEntryForm
const [timeIn, setTimeIn] = useState("")
const [timeOut, setTimeOut] = useState("")
const [isLeave, setIsLeave] = useState(false)
const [workDescription, setWorkDescription] = useState("")
// ... more form fields

// page.tsx
const [selectedDate, setSelectedDate] = useState(new Date())
const [entries, setEntries] = useState<TimeEntry[]>([])
const [editingEntry, setEditingEntry] = useState<TimeEntry | null>(null)
```

### Custom Hook State (useTimer)
```typescript
const [timer, setTimer] = useState<TimerState | null>(null)
const [elapsedSeconds, setElapsedSeconds] = useState(0)
const [loading, setLoading] = useState(false)
const [error, setError] = useState<string | null>(null)

// Managed intervals
const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null)
const tickIntervalRef = useRef<NodeJS.Timeout | null>(null)
```

---

## 📦 Data Models

### TimeEntry
```typescript
{
  _id: string                    // Unique identifier
  userId: string                 // Owner
  date: "YYYY-MM-DD"            // Work date
  timeIn: "HH:mm"               // Start time
  timeOut: "HH:mm"              // End time
  hourlyRate: number            // Rate at time of entry
  totalHours: number            // Calculated hours
  totalEarnings: number         // Calculated earnings
  workDescription: string       // What was done
  
  // Optional fields
  leave?: {
    isLeave: boolean
    leaveType: "Sick" | "Vacation" | ...
    leaveReason: string
  }
  
  isHolidayWork?: boolean
  holidayCategory?: "sunday" | "saturday" | "other"
  
  // Timer state
  timer?: {
    isRunning: boolean
    status: "running" | "paused" | "stopped"
    startedAt: Date
    stoppedAt?: Date
    accumulatedSeconds: number
    // ... more timer fields
  }
  
  createdAt: Date
  updatedAt: Date
  deletedAt?: Date
}
```

### User
```typescript
{
  _id: string
  email: string
  name: string
  password: string (hashed)
  
  salaryHistory: [{
    hourlyRate: number
    effectiveDate: Date
    // ... more salary fields
  }]
  
  createdAt: Date
  updatedAt: Date
}
```

---

## 🌐 API Endpoints

### Time Entries
```
GET    /api/time-entries              # List entries
POST   /api/time-entries              # Create entry
GET    /api/time-entries/[id]         # Get one entry
PUT    /api/time-entries/[id]         # Update entry
DELETE /api/time-entries/[id]         # Soft delete entry

POST   /api/time-entries/[id]         # Restore deleted entry
  Body: { restoreToken: string }
```

### Timer Actions
```
GET  /api/time-entries/[id]/timer    # Get timer state
POST /api/time-entries/[id]/timer    # Timer action
  Body: { 
    action: "start" | "pause" | "resume" | "stop" | "heartbeat",
    timestamp: ISO string
  }
```

### Profile
```
GET /api/profile/hourly-rate?date=YYYY-MM-DD  # Get rate for date
```

---

## 🔄 Timer State Machine

```
┌─────────────┐
│ NOT_STARTED │ (initial state)
└──────┬──────┘
       │ action: "start"
       ↓
┌─────────────┐
│   RUNNING   │ (isRunning: true, status: "running")
└──────┬──────┘
       │
       ├─→ action: "pause" ──┐
       │                     ↓
       │              ┌─────────────┐
       │              │   PAUSED    │ (isRunning: false, status: "paused")
       │              └──────┬──────┘
       │                     │
       │ ←─ action: "resume" ┘
       │
       ↓ action: "stop"
┌─────────────┐
│   STOPPED   │ (isRunning: false, status: "stopped")
└─────────────┘ (FINAL - cannot resume)
```

---

## 🎨 Styling Architecture

### Utility-First with Tailwind
```typescript
// Component styles use Tailwind utilities
className="p-6 rounded-lg bg-gradient-to-r from-green-50 to-emerald-50"

// Custom variants in tailwind.config
variants: {
  glass: "backdrop-blur-sm bg-white/80",
  // ... more variants
}

// Theme variables in globals.css
:root {
  --primary: 222.2 47.4% 11.2%;
  --secondary: 210 40% 96.1%;
  // ... more variables
}
```

---

## 🔧 Key Technologies

| Technology | Purpose | Version |
|------------|---------|---------|
| Next.js | Framework | 15.x |
| React | UI Library | 19.x |
| TypeScript | Type Safety | 5.x |
| MongoDB | Database | 6.x |
| Tailwind CSS | Styling | 3.x |
| Shadcn/ui | Components | Latest |

---

## 📈 Performance Optimizations

### Client-Side
- React.memo for expensive components
- useMemo for calculations
- useCallback for callbacks
- Lazy loading for heavy components

### Server-Side
- Database indexing on userId + date
- Cursor-based pagination
- Efficient queries (projection)
- Connection pooling

### Network
- CSRF token caching
- Optimistic updates
- Request debouncing
- Heartbeat batching

---

## 🧪 Testing Strategy

### Unit Tests (Future)
```typescript
// Test individual functions
describe('calculateTimeWorked', () => {
  it('should calculate hours correctly', () => {
    expect(calculateTimeWorked('09:00', '17:00', 0, 20))
      .toEqual({ totalHours: 8, totalEarnings: 160 })
  })
})
```

### Component Tests (Future)
```typescript
// Test component behavior
describe('<QuickStartTimer />', () => {
  it('should start timer on click', async () => {
    render(<QuickStartTimer ... />)
    fireEvent.click(screen.getByText('Quick Start Timer'))
    await waitFor(() => {
      expect(screen.getByText(/running/i)).toBeInTheDocument()
    })
  })
})
```

### E2E Tests (Future)
```typescript
// Test full workflows
test('complete work day flow', async ({ page }) => {
  await page.goto('/')
  await page.click('[data-testid="quick-start"]')
  // ... more steps
  await expect(page.locator('[data-testid="timer"]')).toBeVisible()
})
```

---

## 🔍 Debugging Guide

### Enable Debug Mode
```typescript
// In your .env.local
DEBUG=true
```

### Common Issues

**Timer not updating:**
- Check heartbeat interval (30s default)
- Verify WebSocket/polling active
- Check browser tab visibility

**Entries not saving:**
- Check CSRF token
- Verify authentication
- Check network tab for errors

**Wrong calculations:**
- Verify hourly rate loaded
- Check time format (HH:mm)
- Test calculation functions

---

## 🚀 Deployment Checklist

- [ ] Environment variables set
- [ ] Database connection tested
- [ ] CSRF protection enabled
- [ ] Rate limiting configured
- [ ] Error monitoring setup (Sentry)
- [ ] Analytics configured
- [ ] Performance monitoring
- [ ] Backup strategy
- [ ] SSL certificate
- [ ] Domain configured

---

**For more details:**
- Architecture patterns: See component files
- API documentation: See `/api` route files
- Type definitions: See `lib/types.ts`
- Utils functions: See `lib/` folder
