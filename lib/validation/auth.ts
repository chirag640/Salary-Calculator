/**
 * Authentication validation utilities
 */

/**
 * Validate email format using RFC-compliant regex
 */
export function isValidEmail(email: string): boolean {
  // RFC 5322 simplified pattern
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/
  
  if (!emailRegex.test(email)) {
    return false
  }
  
  // Additional checks
  const [localPart, domain] = email.split("@")
  
  // Local part should not exceed 64 characters
  if (localPart.length > 64) {
    return false
  }
  
  // Domain should not exceed 255 characters
  if (domain.length > 255) {
    return false
  }
  
  return true
}

/**
 * Validate password strength
 */
export function isValidPassword(password: string): { valid: boolean; errors: string[] } {
  const errors: string[] = []
  
  if (password.length < 8) {
    errors.push("Password must be at least 8 characters long")
  }
  
  if (password.length > 128) {
    errors.push("Password must not exceed 128 characters")
  }
  
  if (!/[a-z]/.test(password)) {
    errors.push("Password must contain at least one lowercase letter")
  }
  
  if (!/[A-Z]/.test(password)) {
    errors.push("Password must contain at least one uppercase letter")
  }
  
  if (!/[0-9]/.test(password)) {
    errors.push("Password must contain at least one number")
  }
  
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    errors.push("Password must contain at least one special character")
  }
  
  return {
    valid: errors.length === 0,
    errors,
  }
}

/**
 * Validate name
 */
export function isValidName(name: string): boolean {
  // Name should be 1-100 characters, allowing letters, spaces, hyphens, apostrophes
  return /^[a-zA-Z\s'-]{1,100}$/.test(name.trim())
}

/**
 * Sanitize email (trim and lowercase)
 */
export function sanitizeEmail(email: string): string {
  return email.trim().toLowerCase()
}

/**
 * Sanitize name (trim and normalize spaces)
 */
export function sanitizeName(name: string): string {
  return name.trim().replace(/\s+/g, " ")
}

/**
 * Validate redirect URL (prevent open redirect vulnerabilities)
 */
export function isValidRedirectUrl(url: string, allowedOrigins: string[]): boolean {
  try {
    const parsed = new URL(url, allowedOrigins[0])
    
    // Only allow relative URLs or URLs from allowed origins
    if (parsed.origin === allowedOrigins[0] || url.startsWith("/")) {
      return true
    }
    
    return allowedOrigins.some(origin => parsed.origin === origin)
  } catch {
    // If URL parsing fails, only allow relative paths
    return url.startsWith("/") && !url.startsWith("//")
  }
}

/**
 * Generate secure random state for OAuth
 */
export function generateOAuthState(data: Record<string, any>): string {
  const nonce = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
  const stateObj = {
    ...data,
    nonce,
    timestamp: Date.now(),
  }
  return Buffer.from(JSON.stringify(stateObj)).toString("base64")
}

/**
 * Verify and parse OAuth state
 */
export function verifyOAuthState(state: string, maxAgeMs: number = 10 * 60 * 1000): Record<string, any> | null {
  try {
    const decoded = JSON.parse(Buffer.from(state, "base64").toString("utf-8"))
    
    // Check timestamp to prevent replay attacks
    if (!decoded.timestamp || Date.now() - decoded.timestamp > maxAgeMs) {
      return null
    }
    
    // Verify nonce exists
    if (!decoded.nonce) {
      return null
    }
    
    return decoded
  } catch {
    return null
  }
}
