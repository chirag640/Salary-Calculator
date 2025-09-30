// Simple in-memory token bucket rate limiter (per IP + route key).
// NOTE: Suitable only for single-instance deployments. For multi-instance, use Redis (e.g., Upstash) instead.

interface Bucket {
  tokens: number
  lastRefill: number
}

const buckets = new Map<string, Bucket>()

interface RateLimitOptions {
  windowMs: number // refill window
  max: number // tokens per window
}

export function rateLimit(key: string, { windowMs, max }: RateLimitOptions): { ok: boolean; retryAfter?: number } {
  const now = Date.now()
  let bucket = buckets.get(key)
  if (!bucket) {
    bucket = { tokens: max, lastRefill: now }
    buckets.set(key, bucket)
  }
  // Refill tokens
  const elapsed = now - bucket.lastRefill
  if (elapsed > windowMs) {
    const refillCount = Math.floor(elapsed / windowMs)
    bucket.tokens = Math.min(max, bucket.tokens + refillCount * max)
    bucket.lastRefill = now
  }
  if (bucket.tokens <= 0) {
    const retryAfter = Math.ceil((bucket.lastRefill + windowMs - now) / 1000)
    return { ok: false, retryAfter }
  }
  bucket.tokens -= 1
  return { ok: true }
}

export function buildRateLimitKey(ip: string | null | undefined, route: string) {
  return `${route}:${ip || 'unknown'}`
}
