import crypto from "crypto"

/**
 * Encryption utilities for storing sensitive OAuth tokens
 */

const ALGORITHM = "aes-256-gcm"
const IV_LENGTH = 16
const AUTH_TAG_LENGTH = 16
const SALT_LENGTH = 64

/**
 * Get encryption key from environment
 */
function getEncryptionKey(): Buffer {
  const key = process.env.ENCRYPTION_KEY
  
  if (!key) {
    throw new Error("ENCRYPTION_KEY environment variable is required for OAuth token encryption")
  }
  
  // Derive a 32-byte key using PBKDF2
  return crypto.pbkdf2Sync(key, "oauth-token-salt", 100000, 32, "sha256")
}

/**
 * Encrypt data (for storing OAuth tokens)
 */
export function encrypt(text: string): string {
  try {
    const key = getEncryptionKey()
    const iv = crypto.randomBytes(IV_LENGTH)
    
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv)
    
    let encrypted = cipher.update(text, "utf8", "hex")
    encrypted += cipher.final("hex")
    
    const authTag = cipher.getAuthTag()
    
    // Return: iv:authTag:encrypted
    return `${iv.toString("hex")}:${authTag.toString("hex")}:${encrypted}`
  } catch (error) {
    console.error("Encryption error:", error)
    throw new Error("Failed to encrypt data")
  }
}

/**
 * Decrypt data (for retrieving OAuth tokens)
 */
export function decrypt(encryptedData: string): string {
  try {
    const key = getEncryptionKey()
    const parts = encryptedData.split(":")
    
    if (parts.length !== 3) {
      throw new Error("Invalid encrypted data format")
    }
    
    const iv = Buffer.from(parts[0], "hex")
    const authTag = Buffer.from(parts[1], "hex")
    const encrypted = parts[2]
    
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv)
    decipher.setAuthTag(authTag)
    
    let decrypted = decipher.update(encrypted, "hex", "utf8")
    decrypted += decipher.final("utf8")
    
    return decrypted
  } catch (error) {
    console.error("Decryption error:", error)
    throw new Error("Failed to decrypt data")
  }
}

/**
 * Check if encryption is configured
 */
export function isEncryptionConfigured(): boolean {
  return !!process.env.ENCRYPTION_KEY
}
