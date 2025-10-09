import bcrypt from "bcryptjs"
import crypto from "crypto"

/**
 * OTP utilities for authentication flows
 */

const OTP_LENGTH = 6
const OTP_EXPIRY_MINUTES = 10
const MAX_OTP_ATTEMPTS = 5

/**
 * Generate a random numeric OTP code
 */
export function generateOTP(length: number = OTP_LENGTH): string {
  const digits = "0123456789"
  let otp = ""
  const randomBytes = crypto.randomBytes(length)
  
  for (let i = 0; i < length; i++) {
    otp += digits[randomBytes[i] % digits.length]
  }
  
  return otp
}

/**
 * Hash OTP before storing in database
 */
export async function hashOTP(otp: string): Promise<string> {
  return bcrypt.hash(otp, 10) // Lower rounds for OTP (short-lived)
}

/**
 * Verify OTP against stored hash
 */
export async function verifyOTP(otp: string, hash: string): Promise<boolean> {
  return bcrypt.compare(otp, hash)
}

/**
 * Get OTP expiry date
 */
export function getOTPExpiryDate(minutes: number = OTP_EXPIRY_MINUTES): Date {
  return new Date(Date.now() + minutes * 60 * 1000)
}

/**
 * Check if OTP is expired
 */
export function isOTPExpired(expiresAt: Date): boolean {
  return new Date() > new Date(expiresAt)
}

/**
 * Validate OTP format (6 digits)
 */
export function isValidOTPFormat(otp: string): boolean {
  return /^\d{6}$/.test(otp)
}

/**
 * Constants for OTP configuration
 */
export const OTP_CONFIG = {
  LENGTH: OTP_LENGTH,
  EXPIRY_MINUTES: OTP_EXPIRY_MINUTES,
  MAX_ATTEMPTS: MAX_OTP_ATTEMPTS,
  RESEND_COOLDOWN_SECONDS: 60, // 1 minute between resends
  MAX_RESENDS_PER_DAY: 5,
} as const
