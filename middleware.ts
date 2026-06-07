import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const COOKIE = "__lapor_ops_v1";

// Pola path yang mencurigakan — path traversal, shell inject, common scanner
const SUSPICIOUS = /(\.\.|\/etc\/|\/proc\/|cmd=|exec\(|eval\(|<script|%3Cscript|union\s+select|drop\s+table|javascript:|data:text\/html)/i;

// Bot user-agent yang dikenal eksploitatif
const BAD_UA = /sqlmap|nikto|masscan|zgrab|python-requests\/2\.2[0-9]|go-http-client\/1\.1\s*$|curl\/7\.[0-4]/i;

const SECURITY_HEADERS: Record<string, string> = {
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "X-XSS-Protection": "1; mode=block",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=(self)",
  "Strict-Transport-Security": "max-age=63072000; includeSubDomains; preload",
};

function addSecurityHeaders(res: NextResponse): NextResponse {
  for (const [k, v] of Object.entries(SECURITY_HEADERS)) res.headers.set(k, v);
  return res;
}

function getIP(req: NextRequest): string {
  return (
    req.headers.get("x-real-ip") ||
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "unknown"
  );
}

export function middleware(req: NextRequest): NextResponse {
  const { pathname } = req.nextUrl;
  const ua = req.headers.get("user-agent") || "";

  // 1. Block bad user-agents (scanner/exploiter bots)
  if (BAD_UA.test(ua)) {
    return addSecurityHeaders(
      NextResponse.json({ error: "Forbidden" }, { status: 403 })
    );
  }

  // 2. Block suspicious path patterns (injection/traversal)
  if (SUSPICIOUS.test(decodeURIComponent(pathname))) {
    return addSecurityHeaders(
      NextResponse.json({ error: "Bad Request" }, { status: 400 })
    );
  }

  // 3. Ops API — require session cookie, validate token structure
  if (pathname.startsWith("/api/ops/v1/")) {
    const isPublic =
      pathname === "/api/ops/v1/auth/session" ||
      pathname === "/api/ops/v1/auth/provision";

    if (!isPublic) {
      const raw = req.cookies.get(COOKIE)?.value;

      // Cookie must exist and match expected token format: sid.nonce.exp.sig (4 dot-separated parts)
      if (!raw || raw.split(".").length !== 4) {
        return addSecurityHeaders(
          NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        );
      }

      // Quick expiry check (deep HMAC validation happens in requireOpsSession)
      const parts = raw.split(".");
      const exp = parseInt(parts[2], 10);
      if (!Number.isFinite(exp) || Date.now() > exp) {
        const res = NextResponse.json({ error: "Session expired" }, { status: 401 });
        res.cookies.delete(COOKIE);
        return addSecurityHeaders(res);
      }
    }
  }

  // 4. Ops UI — redirect to home if no valid session cookie
  if (pathname.startsWith("/ctl/ops/")) {
    const segments = pathname.split("/").filter(Boolean);
    if (segments.length >= 3) {
      const raw = req.cookies.get(COOKIE)?.value;
      const parts = raw?.split(".");
      const exp = parts ? parseInt(parts[2], 10) : NaN;

      if (!raw || parts?.length !== 4 || !Number.isFinite(exp) || Date.now() > exp) {
        const res = NextResponse.redirect(new URL("/", req.url));
        if (raw) res.cookies.delete(COOKIE); // clear stale cookie
        return addSecurityHeaders(res);
      }
    }
  }

  // 5. Attach IP to request header for downstream rate-limiting in API routes
  const res = NextResponse.next();
  res.headers.set("x-client-ip", getIP(req));
  return addSecurityHeaders(res);
}

export const config = {
  matcher: [
    "/ctl/ops/:path*",
    "/api/ops/v1/:path*",
    "/api/:path*",
  ],
};
