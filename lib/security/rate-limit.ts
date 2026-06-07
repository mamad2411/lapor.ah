/**
 * In-memory rate limiter dengan sliding window algorithm.
 *
 * Cocok untuk Netlify/Vercel serverless (per-instance). Untuk produksi skala besar
 * ganti store dengan Upstash Redis atau Cloudflare KV.
 *
 * Cloudflare WAF sudah menangani DDoS layer-3/4; limiter ini melindungi
 * layer-7 per-endpoint dari abuse OTP, brute-force, dan spam submit.
 */

interface WindowEntry {
  count: number;
  resetAt: number;
}

const store = new Map<string, WindowEntry>();

// Bersihkan entri kadaluarsa setiap 5 menit (mencegah memory leak di long-lived instances)
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of store.entries()) {
      if (now > entry.resetAt + 60_000) store.delete(key);
    }
  }, 5 * 60 * 1000);
}

export interface RateLimitConfig {
  /** Jumlah request maksimum dalam window */
  limit: number;
  /** Durasi window dalam detik */
  windowSec: number;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
  retryAfterSec: number;
}

/**
 * Cek & catat satu hit pada key tertentu.
 *
 * @param key  — identifier unik, biasanya `"endpoint:ip"` atau `"otp:email"`
 * @param cfg  — batas dan durasi window
 */
export function checkRateLimit(key: string, cfg: RateLimitConfig): RateLimitResult {
  const now = Date.now();
  const windowMs = cfg.windowSec * 1000;

  let entry = store.get(key);

  if (!entry || now > entry.resetAt) {
    entry = { count: 0, resetAt: now + windowMs };
    store.set(key, entry);
  }

  entry.count += 1;

  const allowed = entry.count <= cfg.limit;
  const remaining = Math.max(0, cfg.limit - entry.count);
  const retryAfterSec = allowed ? 0 : Math.ceil((entry.resetAt - now) / 1000);

  return { allowed, remaining, resetAt: entry.resetAt, retryAfterSec };
}

// ── Preset limits per kategori endpoint ────────────────────────────────────────

/** OTP send (email/WA) — sangat ketat untuk cegah bom OTP */
export const LIMIT_OTP_SEND: RateLimitConfig = { limit: 5, windowSec: 300 };

/** OTP verify — mencegah brute-force kode 6 digit */
export const LIMIT_OTP_VERIFY: RateLimitConfig = { limit: 10, windowSec: 300 };

/** Login attempt */
export const LIMIT_LOGIN: RateLimitConfig = { limit: 10, windowSec: 300 };

/** Pendaftaran akun baru */
export const LIMIT_REGISTER: RateLimitConfig = { limit: 3, windowSec: 3600 };

/** Submit laporan anonim — anti spam */
export const LIMIT_LAPORAN: RateLimitConfig = { limit: 5, windowSec: 3600 };

/** Upload file */
export const LIMIT_UPLOAD: RateLimitConfig = { limit: 20, windowSec: 3600 };

/** Endpoint publik umum (search, list) */
export const LIMIT_PUBLIC: RateLimitConfig = { limit: 60, windowSec: 60 };

/** Endpoint admin/ops */
export const LIMIT_ADMIN: RateLimitConfig = { limit: 120, windowSec: 60 };
