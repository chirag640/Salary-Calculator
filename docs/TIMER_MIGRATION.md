# Timer Feature Database Migration Guide

## Overview

This guide helps you add timer support to existing time entries in your MongoDB database.

## Changes to TimeEntry Schema

### New Fields Added

```typescript
{
  // ... existing fields ...
  
  // New timer field (optional)
  timer?: {
    isRunning: boolean
    startedAt?: Date
    pausedAt?: Date[]
    resumedAt?: Date[]
    lastHeartbeatAt?: Date
    accumulatedSeconds: number
    idleThresholdMinutes?: number
  }
}
```

## Migration Steps

### Option 1: No Migration Needed (Recommended)

The timer field is **optional** and will be added automatically when users start timers. Existing entries continue to work without any changes.

**Action Required**: None - backward compatible

### Option 2: Add Timer Field to All Entries (Optional)

If you want to ensure all entries have a timer field (initialized but not running):

```javascript
// Run in MongoDB shell or Compass

db.timeEntries.updateMany(
  { timer: { $exists: false } },
  {
    $set: {
      timer: {
        isRunning: false,
        accumulatedSeconds: 0,
        pausedAt: [],
        resumedAt: []
      }
    }
  }
)
```

### Option 3: Migrate Existing Entries with Time Data

If you want to create timer history for existing entries (marking them as completed timers):

```javascript
// Run in MongoDB shell or Compass

db.timeEntries.updateMany(
  { 
    timer: { $exists: false },
    timeIn: { $exists: true, $ne: "" },
    timeOut: { $exists: true, $ne: "" }
  },
  [{
    $set: {
      timer: {
        isRunning: false,
        startedAt: {
          $dateFromString: {
            dateString: {
              $concat: ["$date", "T", "$timeIn", ":00Z"]
            }
          }
        },
        accumulatedSeconds: {
          $multiply: ["$totalHours", 3600]
        },
        pausedAt: [],
        resumedAt: []
      }
    }
  }]
)
```

## Rollback (If Needed)

To remove timer fields from all entries:

```javascript
db.timeEntries.updateMany(
  { timer: { $exists: true } },
  { $unset: { timer: "" } }
)
```

## Indexes

### Recommended Indexes

Add these indexes for optimal timer query performance:

```javascript
// Index for finding entries with running timers
db.timeEntries.createIndex(
  { "userId": 1, "timer.isRunning": 1 },
  { 
    name: "user_running_timers",
    partialFilterExpression: { 
      "timer.isRunning": true 
    }
  }
)

// Index for idle detection queries
db.timeEntries.createIndex(
  { "userId": 1, "timer.lastHeartbeatAt": 1 },
  { 
    name: "user_timer_heartbeat",
    partialFilterExpression: { 
      "timer.isRunning": true 
    }
  }
)
```

### Check Existing Indexes

```javascript
db.timeEntries.getIndexes()
```

## Validation

### Verify Migration Success

```javascript
// Count entries with timer field
db.timeEntries.countDocuments({ timer: { $exists: true } })

// Count entries with running timers
db.timeEntries.countDocuments({ "timer.isRunning": true })

// Sample entries to verify structure
db.timeEntries.find({ timer: { $exists: true } }).limit(5)
```

### Find Orphaned Running Timers

Timers that have been running for more than 24 hours (potential issues):

```javascript
const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000)

db.timeEntries.find({
  "timer.isRunning": true,
  "timer.startedAt": { $lt: yesterday }
})
```

**Action**: Manually review and stop/fix these timers if needed.

## Cleanup Operations

### Stop All Running Timers (Emergency)

```javascript
// Backup first!
db.timeEntries.find({ "timer.isRunning": true }).forEach(function(doc) {
  db.timeEntries_backup.insertOne(doc)
})

// Stop all timers
db.timeEntries.updateMany(
  { "timer.isRunning": true },
  { 
    $set: { 
      "timer.isRunning": false,
      updatedAt: new Date()
    } 
  }
)
```

### Remove Stale Heartbeats

Clear heartbeat data from timers not running:

```javascript
db.timeEntries.updateMany(
  { 
    "timer.isRunning": false,
    "timer.lastHeartbeatAt": { $exists: true }
  },
  { 
    $unset: { "timer.lastHeartbeatAt": "" }
  }
)
```

## Testing After Migration

### 1. Test Timer Creation
- Create new entry
- Start timer
- Verify timer state in database

### 2. Test Persistence
- Start timer
- Refresh browser
- Verify timer still running

### 3. Test Idle Detection
- Start timer
- Wait past idle threshold (default 10 min)
- Attempt to pause/stop
- Verify idle dialog appears

### 4. Test Multiple Sessions
- Start timer in one browser
- Open in another browser/device
- Verify both show same timer state

## Performance Monitoring

### Query Performance

Check slow queries related to timers:

```javascript
// Enable profiling
db.setProfilingLevel(1, { slowms: 100 })

// After running app for a while, check slow queries
db.system.profile.find({
  ns: "yourdb.timeEntries",
  millis: { $gt: 100 }
}).sort({ ts: -1 }).limit(10)
```

### Index Usage

Verify indexes are being used:

```javascript
db.timeEntries.find({
  userId: "someUserId",
  "timer.isRunning": true
}).explain("executionStats")
```

Look for `"stage": "IXSCAN"` (index scan) not `"stage": "COLLSCAN"` (collection scan).

## Data Integrity Checks

### Check for Invalid Timer States

```javascript
// Find entries where timer is running but has no startedAt
db.timeEntries.find({
  "timer.isRunning": true,
  "timer.startedAt": { $exists: false }
})

// Find entries with negative accumulated seconds
db.timeEntries.find({
  "timer.accumulatedSeconds": { $lt: 0 }
})

// Find entries with future timestamps
db.timeEntries.find({
  "timer.startedAt": { $gt: new Date() }
})
```

### Fix Invalid States

```javascript
// Fix entries with running timer but no startedAt
db.timeEntries.updateMany(
  {
    "timer.isRunning": true,
    "timer.startedAt": { $exists: false }
  },
  {
    $set: { 
      "timer.isRunning": false,
      "timer.accumulatedSeconds": 0
    }
  }
)
```

## Backup Before Migration

**IMPORTANT**: Always backup before modifying production data.

```bash
# Full database backup
mongodump --uri="mongodb://localhost:27017/your-db" --out=/backup/before-timer-migration

# Collection backup only
mongodump --uri="mongodb://localhost:27017/your-db" --collection=timeEntries --out=/backup/timeEntries-backup

# Restore if needed
mongorestore --uri="mongodb://localhost:27017/your-db" /backup/before-timer-migration
```

## Environment-Specific Notes

### Development
- Migration can be tested with sample data
- Safe to experiment with cleanup scripts

### Staging
- Test full migration with production-like data
- Verify all timer operations work correctly
- Load test with multiple concurrent users

### Production
- Schedule migration during low-traffic period
- Have rollback plan ready
- Monitor error logs closely after deployment
- Keep backup for at least 7 days

## Support

If you encounter issues during migration:

1. **Check Logs**: Review Next.js server logs for errors
2. **Verify Schema**: Ensure timer field structure matches TypeScript types
3. **Test Endpoints**: Use Postman/curl to test timer API directly
4. **Database State**: Query database to verify timer states are correct

## Migration Checklist

- [ ] Backup database
- [ ] Test migration on development environment
- [ ] Test migration on staging environment
- [ ] Verify timer operations work correctly
- [ ] Add recommended indexes
- [ ] Run validation queries
- [ ] Deploy to production during low-traffic period
- [ ] Monitor error logs for 24 hours
- [ ] Run data integrity checks
- [ ] Document any issues encountered
- [ ] Schedule next backup

---

**Migration Version**: 1.0.0  
**Compatible With**: Timer Feature v1.0.0  
**Last Updated**: January 2025
