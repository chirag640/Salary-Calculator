import type { Db } from "mongodb"
import type { OvertimeConfig, SalaryRecord, SalaryType, WorkingConfig } from "@/lib/types"

// Very small in-memory LRU-style cache for (userId|date) -> {hourlyRate, working, overtime}
// NOTE: Single-process only; acceptable as micro-optimization. Size kept tiny to avoid unbounded memory.
interface CacheEntry { value: { hourlyRate: number; working?: WorkingConfig; overtime?: OvertimeConfig }; ts: number }
const RATE_CACHE = new Map<string, CacheEntry>()
const RATE_CACHE_MAX = 200
const RATE_CACHE_TTL_MS = 5 * 60 * 1000 // 5 minutes

function makeKey(userId: string, date: string) { return `${userId}|${date}` }
function getFromCache(userId: string, date: string) {
  const key = makeKey(userId, date)
  const entry = RATE_CACHE.get(key)
  if (!entry) return null
  if (Date.now() - entry.ts > RATE_CACHE_TTL_MS) { RATE_CACHE.delete(key); return null }
  return entry.value
}
function setCache(userId: string, date: string, value: CacheEntry["value"]) {
  const key = makeKey(userId, date)
  RATE_CACHE.set(key, { value, ts: Date.now() })
  if (RATE_CACHE.size > RATE_CACHE_MAX) {
    // naïve prune: delete oldest 10
    const entries = [...RATE_CACHE.entries()].sort((a,b)=>a[1].ts-b[1].ts).slice(0,10)
    for (const [k] of entries) RATE_CACHE.delete(k)
  }
}

export function hourlyFromSalary(
  salaryType: SalaryType,
  amount: number,
  working: WorkingConfig,
): number {
  const hoursPerMonth = working.hoursPerDay * working.daysPerMonth
  const monthlyAmount = salaryType === "annual" ? amount / 12 : amount
  if (hoursPerMonth <= 0) return 0
  const rate = monthlyAmount / hoursPerMonth
  return Math.round(rate * 100) / 100
}

export function computeEarningsWithOvertime(
  totalHours: number,
  hourlyRate: number,
  overtime?: OvertimeConfig,
): number {
  if (!overtime?.enabled) {
    return Math.round(totalHours * hourlyRate * 100) / 100
  }
  const threshold = overtime.thresholdHoursPerDay
  const multiplier = overtime.multiplier > 0 ? overtime.multiplier : 1.5
  const baseHours = Math.min(totalHours, threshold)
  const overtimeHours = Math.max(0, totalHours - threshold)
  const earnings = baseHours * hourlyRate + overtimeHours * hourlyRate * multiplier
  return Math.round(earnings * 100) / 100
}

export function pickEffectiveSalaryRecord(records: SalaryRecord[], date: string): SalaryRecord | undefined {
  // records may be unsorted; sort by effectiveFrom ascending
  const sorted = [...(records || [])].sort((a, b) => a.effectiveFrom.localeCompare(b.effectiveFrom))
  // pick the latest record whose effectiveFrom <= date
  let effective: SalaryRecord | undefined
  for (const rec of sorted) {
    if (rec.effectiveFrom <= date) {
      effective = rec
    } else {
      break
    }
  }
  return effective
}

export function pickNearestSalaryRecord(records: SalaryRecord[], date: string): SalaryRecord | undefined {
  if (!records || records.length === 0) return undefined
  try {
    const target = new Date(date + 'T00:00:00').getTime()
    let best: SalaryRecord | undefined = undefined
    let bestDiff = Number.POSITIVE_INFINITY
    for (const rec of records) {
      const t = new Date(rec.effectiveFrom + 'T00:00:00').getTime()
      const diff = Math.abs(t - target)
      if (diff < bestDiff) {
        bestDiff = diff
        best = rec
      }
    }
    return best
  } catch {
    return records[records.length - 1]
  }
}

export async function getEffectiveHourlyRateForDate(
  db: Db,
  userId: string,
  date: string,
): Promise<{ hourlyRate: number; working?: WorkingConfig; overtime?: OvertimeConfig }> {
  const cached = getFromCache(userId, date)
  if (cached) return cached
  const user = await db.collection("users").findOne({ _id: new (require("mongodb").ObjectId)(userId) })
  if (!user) return { hourlyRate: 0 }
  const salaryHistory: SalaryRecord[] = user.salaryHistory || []
  const workingConfig: WorkingConfig | undefined = user.workingConfig
  const overtime: OvertimeConfig | undefined = user.overtime
  const effective = pickEffectiveSalaryRecord(salaryHistory, date)
  if (!effective) {
    // If no salary record exactly covers the requested date, try to pick the
    // nearest salary record (closest effectiveFrom) and use its rate. This is
    // a pragmatic fallback to avoid saving $0 earnings when a nearby salary
    // applies. If no records exist, then fall back to user's defaultHourlyRate.
    const nearest = pickNearestSalaryRecord(salaryHistory, date)
    if (nearest) {
      const rate = hourlyFromSalary(nearest.salaryType, nearest.amount, nearest.working)
      const val = { hourlyRate: rate, working: nearest.working, overtime }
      setCache(userId, date, val)
      return val
    }

    const fallbackRate = (user && typeof (user.defaultHourlyRate) === 'number' && user.defaultHourlyRate > 0)
      ? user.defaultHourlyRate
      : 0
    const val = { hourlyRate: fallbackRate, working: workingConfig, overtime }
    setCache(userId, date, val)
    return val
  }
  const rate = hourlyFromSalary(effective.salaryType, effective.amount, effective.working)
  const val = { hourlyRate: rate, working: effective.working, overtime }
  setCache(userId, date, val)
  return val
}
