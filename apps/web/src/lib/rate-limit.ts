import { NextRequest, NextResponse } from 'next/server';

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();

const DEFAULT_LIMIT = 100;
const DEFAULT_WINDOW_MS = 60 * 1000; // 1 minute

export function getRateLimitKey(req: NextRequest, identifier?: string): string {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0] 
    ?? req.headers.get('x-real-ip') 
    ?? 'unknown';
  return identifier ? `${identifier}:${ip}` : `default:${ip}`;
}

export function checkRateLimit(
  key: string, 
  limit: number = DEFAULT_LIMIT, 
  windowMs: number = DEFAULT_WINDOW_MS
): boolean {
  const now = Date.now();
  const entry = rateLimitStore.get(key);

  if (!entry || now > entry.resetAt) {
    rateLimitStore.set(key, {
      count: 1,
      resetAt: now + windowMs,
    });
    return true;
  }

  if (entry.count >= limit) {
    return false;
  }

  entry.count++;
  return true;
}

export function createRateLimiter(
  limit: number = DEFAULT_LIMIT,
  windowMs: number = DEFAULT_WINDOW_MS
) {
  return (req: NextRequest) => {
    const key = getRateLimitKey(req);
    if (!checkRateLimit(key, limit, windowMs)) {
      return new NextResponse(
        JSON.stringify({ error: 'Too many requests' }),
        { status: 429, headers: { 'Content-Type': 'application/json' } }
      );
    }
    return null;
  };
}
