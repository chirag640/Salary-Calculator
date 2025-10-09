import jwt from "jsonwebtoken"
import bcrypt from "bcryptjs"
import type { AuthUser } from "./types"

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key"

export function generateToken(user: AuthUser): string {
  return jwt.sign({ userId: user._id, email: user.email, name: user.name }, JWT_SECRET, { expiresIn: "7d" })
}

export function verifyToken(token: string): AuthUser | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any
    return {
      _id: decoded.userId,
      email: decoded.email,
      name: decoded.name,
    }
  } catch (error) {
    return null
  }
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12)
}

export async function comparePassword(password: string, hashedPassword: string): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword)
}

export function getTokenFromRequest(request: Request): string | null {
  // 1) Check Authorization header (Bearer token)
  const authHeader = request.headers.get("authorization")
  if (authHeader && authHeader.startsWith("Bearer ")) {
    return authHeader.substring(7)
  }

  // 2) If Next.js NextRequest is passed, it may expose cookies via request.cookies
  try {
    const anyReq: any = request
    if (anyReq?.cookies && typeof anyReq.cookies.get === 'function') {
      const cookie = anyReq.cookies.get('auth-token')
      if (cookie && typeof cookie === 'object') return cookie.value || null
      if (typeof cookie === 'string') return cookie || null
    }
  } catch (e) {
    // ignore and fallback to header parsing
  }

  // 3) Fallback: parse raw Cookie header
  const cookieHeader = request.headers.get('cookie')
  if (cookieHeader) {
    const match = cookieHeader.match(/(?:^|; )auth-token=([^;]+)/)
    if (match) return decodeURIComponent(match[1])
  }

  return null
}

export function getUserFromSession(request: Request): AuthUser | null {
  const token = getTokenFromRequest(request)
  if (!token) return null
  return verifyToken(token)
}
