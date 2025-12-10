/**
 * Database encryption middleware
 * Handles encryption/decryption of sensitive financial data
 */

import { encryptNumber, decryptNumber, safeDecrypt } from './encryption'
import type { TimeEntry, SalaryRecord } from './types'

/**
 * Encrypt TimeEntry before saving to database
 */
export function encryptTimeEntry(entry: TimeEntry): any {
  return {
    ...entry,
    hourlyRate: encryptNumber(entry.hourlyRate),
    totalEarnings: encryptNumber(entry.totalEarnings),
  }
}

/**
 * Decrypt TimeEntry after loading from database
 * Handles backward compatibility with unencrypted data
 */
export function decryptTimeEntry(encrypted: any): TimeEntry {
  return {
    ...encrypted,
    hourlyRate: safeDecrypt(encrypted.hourlyRate),
    totalEarnings: safeDecrypt(encrypted.totalEarnings),
  }
}

/**
 * Batch decrypt multiple time entries
 */
export function decryptTimeEntries(encrypted: any[]): TimeEntry[] {
  return encrypted.map(decryptTimeEntry)
}

/**
 * Encrypt SalaryRecord before saving
 */
export function encryptSalaryRecord(record: SalaryRecord): any {
  return {
    ...record,
    amount: encryptNumber(record.amount),
  }
}

/**
 * Decrypt SalaryRecord after loading
 */
export function decryptSalaryRecord(encrypted: any): SalaryRecord {
  return {
    ...encrypted,
    amount: safeDecrypt(encrypted.amount),
  }
}

/**
 * Batch decrypt salary records
 */
export function decryptSalaryRecords(encrypted: any[]): SalaryRecord[] {
  return encrypted.map(decryptSalaryRecord)
}

/**
 * Encrypt partial time entry update
 * Only encrypts fields that need encryption if present
 */
export function encryptTimeEntryUpdate(update: Partial<TimeEntry>): any {
  const encrypted: any = { ...update }
  
  if (update.hourlyRate !== undefined) {
    encrypted.hourlyRate = encryptNumber(update.hourlyRate)
  }
  
  if (update.totalEarnings !== undefined) {
    encrypted.totalEarnings = encryptNumber(update.totalEarnings)
  }
  
  return encrypted
}

/**
 * Encrypt user profile data (salary history)
 */
export function encryptUserProfile(user: any): any {
  const encrypted = { ...user }
  
  if (user.salaryHistory && Array.isArray(user.salaryHistory)) {
    encrypted.salaryHistory = user.salaryHistory.map(encryptSalaryRecord)
  }
  
  if (user.defaultHourlyRate !== undefined) {
    encrypted.defaultHourlyRate = encryptNumber(user.defaultHourlyRate)
  }
  
  return encrypted
}

/**
 * Decrypt user profile data
 */
export function decryptUserProfile(encrypted: any): any {
  const decrypted = { ...encrypted }
  
  if (encrypted.salaryHistory && Array.isArray(encrypted.salaryHistory)) {
    decrypted.salaryHistory = decryptSalaryRecords(encrypted.salaryHistory)
  }
  
  if (encrypted.defaultHourlyRate !== undefined) {
    decrypted.defaultHourlyRate = safeDecrypt(encrypted.defaultHourlyRate)
  }
  
  return decrypted
}
