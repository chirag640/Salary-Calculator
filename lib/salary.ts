import type { Db } from "mongodb"
import type { OvertimeConfig, SalaryRecord, SalaryType, WorkingConfig } from "@/lib/types"

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

export async function getEffectiveHourlyRateForDate(
  db: Db,
  userId: string,
  date: string,
): Promise<{ hourlyRate: number; working?: WorkingConfig; overtime?: OvertimeConfig }> {
  const user = await db.collection("users").findOne({ _id: new (require("mongodb").ObjectId)(userId) })
  if (!user) return { hourlyRate: 0 }
  const salaryHistory: SalaryRecord[] = user.salaryHistory || []
  const workingConfig: WorkingConfig | undefined = user.workingConfig
  const overtime: OvertimeConfig | undefined = user.overtime
  const effective = pickEffectiveSalaryRecord(salaryHistory, date)
  if (!effective) {
    return { hourlyRate: 0, working: workingConfig, overtime }
  }
  const rate = hourlyFromSalary(effective.salaryType, effective.amount, effective.working)
  return { hourlyRate: rate, working: effective.working, overtime }
}
