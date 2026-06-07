/**
 * Cloudflare utility helpers untuk Next.js middleware & API routes.
 *
 * Ketika traffic melewati Cloudflare:
 *   - CF-Connecting-IP  → IP asli client (lebih dipercaya dari x-forwarded-for)
 *   - CF-Ray            → tracing ID unik per request
 *   - CF-IPCountry      → kode negara 2 huruf (ISO 3166-1 alpha-2)
 *   - CF-Visitor        → {"scheme":"https"} untuk mendeteksi protokol asli
 *   - CF-Worker         → nama Cloudflare Worker jika dipakai
 */

import type { NextRequest } from "next/server";

// IP range Cloudflare yang valid (update berkala dari https://www.cloudflare.com/ips/)
// Dipakai untuk opsional trust-validation bahwa request benar melewati CF.
// Catatan: validasi CIDR penuh berat di Edge runtime — cukup check prefix kelas major.
const CF_IPV4_PREFIXES = [
  "103.21.244.", "103.22.200.", "103.31.4.",
  "104.16.", "104.17.", "104.18.", "104.19.", "104.20.", "104.21.",
  "108.162.192.", "131.0.72.", "141.101.64.", "141.101.65.",
  "162.158.", "172.64.", "172.65.", "172.66.", "172.67.", "172.68.", "172.69.",
  "172.70.", "172.71.", "188.114.96.", "188.114.97.", "188.114.98.", "188.114.99.",
  "190.93.240.", "190.93.241.", "190.93.242.", "190.93.243.",
  "197.234.240.", "197.234.241.", "197.234.242.", "197.234.243.",
  "198.41.128.", "198.41.192.", "198.41.208.", "198.41.212.",
];

/** Ambil IP client yang paling tepat dari request headers. */
export function getClientIp(req: NextRequest): string {
  // CF-Connecting-IP paling akurat saat traffic melalui Cloudflare
  const cfIp = req.headers.get("cf-connecting-ip");
  if (cfIp) return cfIp.trim();

  // Fallback untuk dev/non-CF environment
  const xForwardedFor = req.headers.get("x-forwarded-for");
  if (xForwardedFor) return xForwardedFor.split(",")[0].trim();

  return req.headers.get("x-real-ip") || "unknown";
}

/** Ambil CF-Ray ID untuk tracing dan logging. */
export function getCfRay(req: NextRequest): string {
  return req.headers.get("cf-ray") || "no-ray";
}

/** Ambil kode negara dari CF-IPCountry header. */
export function getCfCountry(req: NextRequest): string {
  return req.headers.get("cf-ipcountry") || "XX";
}

/** Cek apakah request datang melalui Cloudflare (ada CF-Ray header). */
export function isBehindCloudflare(req: NextRequest): boolean {
  return req.headers.get("cf-ray") !== null;
}

/** Cek apakah koneksi aslinya HTTPS (melalui CF-Visitor). */
export function isHttps(req: NextRequest): boolean {
  const visitor = req.headers.get("cf-visitor");
  if (visitor) {
    try {
      return JSON.parse(visitor)?.scheme === "https";
    } catch {
      return false;
    }
  }
  return req.nextUrl.protocol === "https:";
}

/** 
 * Daftar negara yang diblokir (opsional, aktifkan sesuai kebutuhan).
 * Kosongkan array untuk menonaktifkan country blocking.
 */
export const BLOCKED_COUNTRIES: string[] = [];
// Contoh: ["CN", "RU", "KP"] — hanya aktifkan jika benar-benar diperlukan

/** Cek apakah negara asal request diblokir. */
export function isCountryBlocked(req: NextRequest): boolean {
  if (BLOCKED_COUNTRIES.length === 0) return false;
  const country = getCfCountry(req);
  return BLOCKED_COUNTRIES.includes(country.toUpperCase());
}

/**
 * Cloudflare Threat Score — CF-Threat-Score header (0–100).
 * Tersedia dengan Cloudflare Pro+ plan.
 * Score ≥ 25 dianggap berbahaya.
 */
export function getCfThreatScore(req: NextRequest): number {
  const score = req.headers.get("cf-threat-score");
  return score ? parseInt(score, 10) : 0;
}

/** Cek apakah CF Threat Score di atas ambang batas. */
export function isHighThreat(req: NextRequest, threshold = 25): boolean {
  return getCfThreatScore(req) >= threshold;
}

/**
 * Buat rate-limit key yang mencakup IP + endpoint.
 * Normalkan IPv6 untuk konsistensi.
 */
export function makeRateLimitKey(prefix: string, req: NextRequest): string {
  const ip = getClientIp(req).replace(/:/g, "_"); // normalize IPv6
  return `${prefix}:${ip}`;
}

/** Header standar untuk menginformasikan rate limit ke client. */
export function rateLimitHeaders(remaining: number, resetAt: number, retryAfterSec: number): Record<string, string> {
  return {
    "X-RateLimit-Remaining": String(remaining),
    "X-RateLimit-Reset": String(Math.floor(resetAt / 1000)),
    ...(retryAfterSec > 0 ? { "Retry-After": String(retryAfterSec) } : {}),
  };
}
