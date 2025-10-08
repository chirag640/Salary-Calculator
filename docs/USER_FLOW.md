# Time Tracker - User Flow Guide

## 🎯 Quick Start for Beginners

This guide explains how the time tracker works in simple terms.

---

## 📱 Main User Flows

### **Flow 1: Quick Start Timer (Real-Time Tracking)**

```
┌─────────────────────────────────────────────────────────┐
│ 1. Click "Quick Start Timer" Button                    │
│    ↓                                                    │
│ 2. Timer starts immediately                            │
│    • Shows running time (00:00:00)                     │
│    • Shows your hourly rate ($XX.XX/hr)                │
│    • Shows current earnings                            │
│    ↓                                                    │
│ 3. While working:                                       │
│    • Add work description (optional)                    │
│    • Watch timer and earnings update in real-time      │
│    ↓                                                    │
│ 4. Click "Stop Timer" when done                        │
│    • Timer saves your work automatically               │
│    • Entry appears in "Today's Entries"                │
│    • Cannot resume after stopping (final)              │
└─────────────────────────────────────────────────────────┘
```

**Best for**: 
- Real-time work tracking
- When you're working right now
- Automatic time calculation

---

### **Flow 2: Manual Entry (After Work)**

```
┌─────────────────────────────────────────────────────────┐
│ 1. Fill in "Manual Log Entry" Form                     │
│    ↓                                                    │
│ 2. Select what type of day:                            │
│    □ Regular work day                                   │
│    □ Leave/off day 🏖️                                  │
│    □ Holiday work 🎉                                    │
│    ↓                                                    │
│ 3. Enter details based on type:                        │
│                                                         │
│    Regular Work:                                        │
│    • Start time (e.g., 09:00)                          │
│    • End time (e.g., 17:00)                            │
│    • Work description                                   │
│    • See automatic calculation                          │
│                                                         │
│    Leave Day:                                           │
│    • Select leave type (sick, vacation, etc.)          │
│    • Add optional reason                                │
│                                                         │
│    Holiday Work:                                        │
│    • Get automatic 9 hours pay                          │
│    • Optionally add extra hours                         │
│    ↓                                                    │
│ 4. Click "Save Entry"                                  │
│    • Entry saved to history                            │
│    • Shows in today's entries                           │
└─────────────────────────────────────────────────────────┘
```

**Best for**:
- Logging past work
- Known start/end times
- Entering yesterday's work

---

## 🎮 Timer States Explained

### **State 1: Not Started** ⚪
```
[Start Timer] Button Available
```
- Click to start tracking time
- Fresh start

### **State 2: Running** 🟢
```
Timer: 01:23:45 (counting up)
[Pause] [Stop] Buttons Available
```
- Time is being tracked
- Can pause or stop
- Earnings updating in real-time

### **State 3: Paused** 🟡
```
Timer: 01:23:45 (stopped)
[Resume] [Stop] Buttons Available
```
- Time stopped temporarily
- **Can resume** to continue
- **Can stop** to end permanently

### **State 4: Stopped** 🔴
```
Timer: 01:23:45 (final)
[Stopped] Badge Shown
```
- Time entry complete
- **Cannot resume** (final)
- Saved permanently

---

## 🔄 When to Use Quick Timer vs Manual Entry

| Situation | Use This | Why |
|-----------|----------|-----|
| Working right now | Quick Start Timer | Automatic, real-time |
| Forgot to track yesterday | Manual Entry | Enter specific times |
| Break during work | Pause timer | Can resume later |
| Done for the day | Stop timer | Final save |
| Weekend/holiday work | Manual Entry + Holiday checkbox | Gets base 9h pay |
| Taking leave | Manual Entry + Leave checkbox | Records time off |

---

## 📊 Understanding Your Dashboard

### **Daily Summary Cards**

```
┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐
│ Hours Today      │  │ Earnings Today   │  │ Leave Today      │
│                  │  │                  │  │                  │
│   8.5h          │  │   $212.50        │  │   0              │
│   2 entries     │  │   Based on rate  │  │   Work day       │
└──────────────────┘  └──────────────────┘  └──────────────────┘
```

### **Today's Entries Section**

Shows all entries for selected date:
- Timer entries (if running)
- Manual entries
- Pause/resume options (if paused)
- Edit/delete buttons

---

## 🎨 Visual Indicators Guide

### Emojis & Their Meaning:

- 🏖️ **Leave/Off Day** - Not working
- 🎉 **Holiday Work** - Working on weekend/holiday (bonus pay)
- ⏰ **Work Hours** - Regular time entry
- 💰 **Hourly Rate** - Your pay rate
- 📝 **Work Description** - What you did
- ✏️ **Edit** - Modify entry
- 🗑️ **Delete** - Remove entry

### Colors:

- 🟢 **Green** - Running timer, earnings, success
- 🔵 **Blue** - Information, calculations
- 🟡 **Yellow/Amber** - Holiday work, warnings
- 🔴 **Red** - Stop, delete, errors
- ⚪ **Gray** - Inactive, secondary info

---

## 💡 Pro Tips

### 1. **Starting Your Day**
```
Morning:
1. Click "Quick Start Timer"
2. Start working
3. Add description as you go
```

### 2. **During Breaks**
```
Lunch Break:
1. Click "Pause" (not Stop!)
2. Come back and click "Resume"
3. Keeps tracking same entry
```

### 3. **End of Day**
```
Finishing Work:
1. Click "Stop Timer"
2. Review the saved entry
3. Done! Entry is final
```

### 4. **Forgot to Track?**
```
Next Day:
1. Use "Manual Log Entry"
2. Enter yesterday's times
3. Add description
4. Save
```

### 5. **Weekend Work**
```
Working on Sunday:
1. Use Manual Entry
2. Check "Holiday/weekend work"
3. Select "Sunday"
4. Get automatic 9h pay + any extra
```

---

## ❓ Common Questions

### Q: Can I edit a stopped timer entry?
**A:** Yes! Use the edit button (✏️) in Today's Entries to modify any details except the timer state.

### Q: What if I forget to stop the timer?
**A:** The system has idle detection. If inactive for 10+ minutes, you'll get a warning when you return.

### Q: Can I have multiple timers running?
**A:** No, only one active timer per day to prevent confusion.

### Q: How do I track work across midnight?
**A:** Stop timer before midnight, start a new one after. Or use manual entry with times.

### Q: Where is my hourly rate set?
**A:** Go to Profile page to set/update your hourly rate. It applies to all future entries.

---

## 🚀 Quick Actions Cheat Sheet

| Action | Keyboard | Mouse |
|--------|----------|-------|
| Start Timer | `Space` (future) | Click "Quick Start" |
| Stop Timer | - | Click "Stop Timer" |
| Save Entry | `Ctrl+S` (future) | Click "Save Entry" |
| Today View | `Ctrl+T` (future) | Click "Today" button |
| Edit Last Entry | `Ctrl+E` (future) | Click edit icon ✏️ |

---

## 🎓 For Developers

### Component Hierarchy:

```
page.tsx (Main Dashboard)
├── QuickStartTimer
│   ├── Timer Display
│   ├── Hourly Rate
│   ├── Work Description
│   └── Stop Button
│
├── TimeEntryForm (Manual)
│   ├── Entry Type Selection
│   ├── Time Fields
│   ├── Hourly Rate Display
│   └── Submit Button
│
└── TimeEntryList
    └── TimeEntryCard
        ├── Entry Details
        ├── TimerControls (if active/paused)
        └── Edit/Delete Buttons
```

### State Management:

```typescript
// Timer states flow
NOT_STARTED → RUNNING → PAUSED → RUNNING (resume)
                     ↓         ↓
                  STOPPED   STOPPED (final, no resume)
```

---

## 🎯 Success Criteria

You're using the app correctly when:

✅ You understand the difference between Quick Timer and Manual Entry  
✅ You know when to pause vs stop  
✅ You can see your real-time earnings  
✅ You've successfully logged a full work day  
✅ You can find and edit past entries  
✅ You understand your daily/weekly summary  

---

**Need more help?** Check the main README or IMPROVEMENTS.md for detailed features and suggestions!
