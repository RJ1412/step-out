// Simple in-memory sliding window rate limiter
// Keyed by client IP, resets after windowMs

interface RateLimitRecord {
  count: number;
  resetAt: number;
}

const rateLimitMap = new Map<string, RateLimitRecord>();

// Clean up stale IP records every 10 minutes to prevent memory leak
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    for (const [key, record] of rateLimitMap.entries()) {
      if (now > record.resetAt) {
        rateLimitMap.delete(key);
      }
    }
  }, 10 * 60 * 1000).unref?.();
}

export function checkRateLimit(
  ip: string,
  limit = 40,
  windowMs = 60 * 1000
): { allowed: boolean; remaining: number } {
  const now = Date.now();
  const existing = rateLimitMap.get(ip);

  if (!existing || now > existing.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: limit - 1 };
  }

  if (existing.count >= limit) {
    return { allowed: false, remaining: 0 };
  }

  existing.count += 1;
  return { allowed: true, remaining: limit - existing.count };
}

export function getClientIp(req: Request): string {
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  const realIp = req.headers.get('x-real-ip');
  if (realIp) return realIp.trim();
  return '127.0.0.1';
}
