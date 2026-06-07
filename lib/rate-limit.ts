/**
 * Sliding-window rate limiter.
 * - Default: in-memory (single instance / dev)
 * - Production multi-instance: set UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN
 */

// ── in-memory store ─────────────────────────────────────────────────────────
const store = new Map<string, { count: number; resetAt: number }>();

function inMemoryCheck(key: string, limit: number, windowMs: number): { allowed: boolean; remaining: number; resetAt: number } {
  const now = Date.now();
  const entry = store.get(key);

  if (!entry || now >= entry.resetAt) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: limit - 1, resetAt: now + windowMs };
  }

  entry.count += 1;
  const allowed = entry.count <= limit;
  return { allowed, remaining: Math.max(0, limit - entry.count), resetAt: entry.resetAt };
}

// Clean up expired keys every 5 minutes to prevent memory leak
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    for (const [k, v] of store) if (now >= v.resetAt) store.delete(k);
  }, 5 * 60 * 1000);
}

// ── Upstash Redis store (optional) ──────────────────────────────────────────
async function redisCheck(key: string, limit: number, windowMs: number): Promise<{ allowed: boolean; remaining: number; resetAt: number }> {
  const url = process.env.UPSTASH_REDIS_REST_URL!;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN!;
  const windowSec = Math.ceil(windowMs / 1000);

  const res = await fetch(`${url}/pipeline`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify([
      ["INCR", key],
      ["EXPIRE", key, windowSec, "NX"],
      ["TTL", key],
    ]),
  });

  const [[, count], , [, ttl]] = await res.json() as [[string, number], unknown, [string, number]];
  const resetAt = Date.now() + ttl * 1000;
  return { allowed: count <= limit, remaining: Math.max(0, limit - count), resetAt };
}

// ── Public API ───────────────────────────────────────────────────────────────
export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number; // epoch ms
}

export async function rateLimit(
  key: string,
  limit: number,
  windowMs: number
): Promise<RateLimitResult> {
  if (process.env.NODE_ENV === "development") {
    return { allowed: true, remaining: limit, resetAt: Date.now() + windowMs };
  }

  const useRedis =
    typeof process !== "undefined" &&
    !!process.env.UPSTASH_REDIS_REST_URL &&
    !!process.env.UPSTASH_REDIS_REST_TOKEN;

  return useRedis ? redisCheck(key, limit, windowMs) : inMemoryCheck(key, limit, windowMs);
}

/** Preset helpers */
export const limits = {
  /** Login attempts: 5 per 15 min per IP */
  login: (ip: string) => rateLimit(`rl:login:${ip}`, 5, 15 * 60 * 1000),
  /** 2FA verify: 5 per 15 min per UID */
  twofa: (uid: string) => rateLimit(`rl:2fa:${uid}`, 5, 15 * 60 * 1000),
  /** Generic API: 60 per min per IP */
  api: (ip: string) => rateLimit(`rl:api:${ip}`, 60, 60 * 1000),
  /** OTP send: 3 per 10 min per identifier */
  otp: (id: string) => rateLimit(`rl:otp:${id}`, 3, 10 * 60 * 1000),
};
