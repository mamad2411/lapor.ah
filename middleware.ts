/**
 * Next.js Edge Middleware — Security Layer
 *
 * Urutan pemrosesan per request:
 *   1. Trust Cloudflare headers (CF-Connecting-IP, CF-Ray, CF-Threat-Score)
 *   2. Block scanner bot user-agents
 *   3. Block suspicious path patterns (injection / traversal)
 *   4. Blokir country (opsional, konfigurasi di lib/security/cloudflare.ts)
 *   5. Blokir CF Threat Score tinggi
 *   6. Rate limiting per IP per endpoint category
 *   7. Validasi sesi cookie untuk /api/ops/v1/* dan /ctl/ops/*
 *   8. HTTPS enforcement (non-CF fallback)
 *   9. Inject security headers + CSP nonce pada setiap response
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { generateNonce, buildCsp } from "@/lib/security/csp";
import {
  getClientIp,
  getCfRay,
  isBehindCloudflare,
  isCountryBlocked,
  isHighThreat,
  makeRateLimitKey,
  rateLimitHeaders,
} from "@/lib/security/cloudflare";
import {
  checkRateLimit,
  LIMIT_OTP_SEND,
  LIMIT_OTP_VERIFY,
  LIMIT_LOGIN,
  LIMIT_REGISTER,
  LIMIT_LAPORAN,
  LIMIT_UPLOAD,
  LIMIT_PUBLIC,
  LIMIT_ADMIN,
} from "@/lib/security/rate-limit";

// ── Cookie name untuk sesi ops ──────────────────────────────────────────────
const OPS_COOKIE = "__lapor_ops_v1";

// ── Pola path yang mencurigakan: traversal, injection, scanner ───────────────
const SUSPICIOUS_PATH =
  /(\.\.|\/etc\/|\/proc\/|\/windows\/|cmd=|exec\(|eval\(|<script|%3Cscript|union\s+select|drop\s+table|javascript:|data:text\/html|vbscript:|onload=|onerror=)/i;

// ── Bot / scanner user-agent yang eksploitatif ──────────────────────────────
const BAD_UA =
  /sqlmap|nikto|masscan|zgrab|nuclei|havij|acunetix|nessus|openvas|dirbuster|gobuster|wfuzz|ffuf|hydra|medusa|ncrack|python-requests\/2\.2[0-9]|go-http-client\/1\.1\s*$|curl\/7\.[0-4][^.]/i;

// ── Security headers yang selalu diterapkan ──────────────────────────────────
const BASE_SECURITY_HEADERS: Record<string, string> = {
  // Proteksi MIME sniffing
  "X-Content-Type-Options": "nosniff",
  // Cegah clickjacking — CSP frame-ancestors juga sudah diset
  "X-Frame-Options": "DENY",
  // Legacy XSS filter (masih berguna untuk browser lama)
  "X-XSS-Protection": "1; mode=block",
  // Referrer info
  "Referrer-Policy": "strict-origin-when-cross-origin",
  // Batasi akses hardware sensitif
  "Permissions-Policy": "camera=(), microphone=(), geolocation=(self), payment=(), usb=(), bluetooth=()",
  // HSTS — 2 tahun, termasuk subdomain, bisa masuk preload list Chromium
  "Strict-Transport-Security": "max-age=63072000; includeSubDomains; preload",
  // Isolasi origin
  "Cross-Origin-Opener-Policy": "same-origin",
  "Cross-Origin-Embedder-Policy": "require-corp",
  "Cross-Origin-Resource-Policy": "same-origin",
  // Cegah DNS prefetch untuk resource eksternal yang tidak dikenal
  "X-DNS-Prefetch-Control": "off",
};

// ── Helper: tambahkan semua security headers ke response ────────────────────
function applySecurityHeaders(
  res: NextResponse,
  extraHeaders?: Record<string, string>
): NextResponse {
  for (const [k, v] of Object.entries(BASE_SECURITY_HEADERS)) {
    res.headers.set(k, v);
  }
  if (extraHeaders) {
    for (const [k, v] of Object.entries(extraHeaders)) {
      res.headers.set(k, v);
    }
  }
  return res;
}

// ── Helper: kembalikan 403 Forbidden dengan security headers ─────────────────
function forbidden(reason: string, retryAfter?: number): NextResponse {
  const res = NextResponse.json(
    { error: "Forbidden", reason },
    { status: 403 }
  );
  if (retryAfter) res.headers.set("Retry-After", String(retryAfter));
  return applySecurityHeaders(res);
}

// ── Helper: kembalikan 429 Too Many Requests ──────────────────────────────────
function tooManyRequests(retryAfterSec: number, remaining: number, resetAt: number): NextResponse {
  const res = NextResponse.json(
    { error: "Terlalu banyak permintaan. Coba lagi nanti.", retryAfter: retryAfterSec },
    { status: 429 }
  );
  return applySecurityHeaders(res, rateLimitHeaders(remaining, resetAt, retryAfterSec));
}

// ── Helper: ambil rate limit config untuk pathname ───────────────────────────
function getRateLimitConfig(pathname: string) {
  if (
    pathname.startsWith("/api/auth/otp/send") ||
    pathname.startsWith("/api/auth/login-otp/send")
  )
    return LIMIT_OTP_SEND;

  if (pathname.startsWith("/api/auth/otp/verify")) return LIMIT_OTP_VERIFY;

  if (
    pathname.startsWith("/api/auth/resolve-login") ||
    pathname.startsWith("/api/auth/verify-2fa")
  )
    return LIMIT_LOGIN;

  if (
    pathname.startsWith("/api/auth/register") ||
    pathname.startsWith("/api/auth/request-access")
  )
    return LIMIT_REGISTER;

  if (pathname.startsWith("/api/laporan/submit")) return LIMIT_LAPORAN;

  if (pathname.startsWith("/api/storage/upload")) return LIMIT_UPLOAD;

  if (
    pathname.startsWith("/api/ops/v1/") ||
    pathname.startsWith("/api/admin/")
  )
    return LIMIT_ADMIN;

  // Semua /api/* lainnya
  if (pathname.startsWith("/api/")) return LIMIT_PUBLIC;

  return null; // non-API path tidak di-rate-limit di sini
}

// ── Middleware utama ───────────────────────────────────────────────────────────
export function middleware(req: NextRequest): NextResponse {
  const { pathname } = req.nextUrl;
  const ua = req.headers.get("user-agent") || "";
  const clientIp = getClientIp(req);
  const cfRay = getCfRay(req);

  // ── 1. Block scanner bot user-agents ───────────────────────────────────────
  if (BAD_UA.test(ua)) {
    return forbidden("bot-detected");
  }

  // ── 2. Block suspicious path patterns ─────────────────────────────────────
  try {
    if (SUSPICIOUS_PATH.test(decodeURIComponent(pathname))) {
      return applySecurityHeaders(
        NextResponse.json({ error: "Bad Request" }, { status: 400 })
      );
    }
  } catch {
    // decodeURIComponent dapat throw pada string malformed
    return applySecurityHeaders(
      NextResponse.json({ error: "Bad Request" }, { status: 400 })
    );
  }

  // ── 3. Country block (aktifkan di cloudflare.ts jika diperlukan) ──────────
  if (isCountryBlocked(req)) {
    return forbidden("country-blocked");
  }

  // ── 4. Cloudflare Threat Score — blokir traffic berisiko tinggi ──────────
  if (isBehindCloudflare(req) && isHighThreat(req, 25)) {
    return forbidden("high-threat-score");
  }

  // ── 5. Rate limiting per endpoint ─────────────────────────────────────────
  const rlConfig = getRateLimitConfig(pathname);
  if (rlConfig) {
    const rlKey = makeRateLimitKey(pathname.split("/").slice(0, 4).join("/"), req);
    const rl = checkRateLimit(rlKey, rlConfig);
    if (!rl.allowed) {
      return tooManyRequests(rl.retryAfterSec, rl.remaining, rl.resetAt);
    }
  }

  // ── 6. Ops API: validasi sesi cookie ──────────────────────────────────────
  if (pathname.startsWith("/api/ops/v1/")) {
    const isPublicOps =
      pathname === "/api/ops/v1/auth/session" ||
      pathname === "/api/ops/v1/auth/provision";

    if (!isPublicOps) {
      const raw = req.cookies.get(OPS_COOKIE)?.value;

      // Format: sid.nonce.exp.sig (4 segmen dipisah titik)
      if (!raw || raw.split(".").length !== 4) {
        return applySecurityHeaders(
          NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        );
      }

      const parts = raw.split(".");
      const exp = parseInt(parts[2], 10);
      if (!Number.isFinite(exp) || Date.now() > exp) {
        const res = NextResponse.json({ error: "Session expired" }, { status: 401 });
        res.cookies.delete(OPS_COOKIE);
        return applySecurityHeaders(res);
      }
    }
  }

  // ── 7. Ops UI: redirect ke home jika sesi tidak valid ────────────────────
  if (pathname.startsWith("/ctl/ops/")) {
    const segments = pathname.split("/").filter(Boolean);
    if (segments.length >= 3) {
      const raw = req.cookies.get(OPS_COOKIE)?.value;
      const parts = raw?.split(".");
      const exp = parts ? parseInt(parts[2], 10) : NaN;

      if (!raw || parts?.length !== 4 || !Number.isFinite(exp) || Date.now() > exp) {
        const res = NextResponse.redirect(new URL("/", req.url));
        if (raw) res.cookies.delete(OPS_COOKIE);
        return applySecurityHeaders(res);
      }
    }
  }

  // ── 8. Enforce HTTPS di non-Cloudflare environment ────────────────────────
  if (
    process.env.NODE_ENV === "production" &&
    !isBehindCloudflare(req) &&
    req.nextUrl.protocol === "http:"
  ) {
    const httpsUrl = req.nextUrl.clone();
    httpsUrl.protocol = "https:";
    return NextResponse.redirect(httpsUrl, { status: 301 });
  }

  // ── 9. Pass-through: tambahkan security headers + CSP nonce ───────────────
  const nonce = generateNonce();
  const csp = buildCsp(nonce);

  const res = NextResponse.next();

  // Teruskan nonce ke page components via header (dibaca di layout.tsx)
  res.headers.set("x-nonce", nonce);
  res.headers.set("x-client-ip", clientIp);
  res.headers.set("x-cf-ray", cfRay);

  // CSP header
  res.headers.set("Content-Security-Policy", csp);

  return applySecurityHeaders(res);
}

// ── Route matcher ──────────────────────────────────────────────────────────────
export const config = {
  matcher: [
    /*
     * Match semua path KECUALI:
     *   - _next/static  (asset statis — sudah aman)
     *   - _next/image   (Next.js image optimizer)
     *   - favicon.ico   (icon browser)
     *   - /api/health   (health-check Netlify / uptime monitor)
     */
    "/((?!_next/static|_next/image|favicon\\.ico|api/health).*)",
  ],
};
