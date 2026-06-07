import { NextRequest } from "next/server";

export function getClientIp(req: NextRequest): string {
  return req.headers.get("cf-connecting-ip") || req.headers.get("x-forwarded-for")?.split(",")[0] || "127.0.0.1";
}

export function getCfRay(req: NextRequest): string | null {
  return req.headers.get("cf-ray");
}

export function isBehindCloudflare(req: NextRequest): boolean {
  return !!req.headers.get("cf-ray");
}

export function isCountryBlocked(req: NextRequest): boolean {
  // Implementasi sederhana, bisa dikembangkan jika ada list block
  return false;
}

export function isHighThreat(req: NextRequest, threshold: number = 10): boolean {
  const score = parseInt(req.headers.get("cf-threat-score") || "0");
  return score > threshold;
}

export function makeRateLimitKey(req: NextRequest, category: string): string {
  const ip = getClientIp(req);
  return `ratelimit:${category}:${ip}`;
}

export function rateLimitHeaders(limit: number, remaining: number, reset: number, retryAfterSec?: number): Record<string, string> {
  const headers: Record<string, string> = {
    "X-RateLimit-Limit": String(limit),
    "X-RateLimit-Remaining": String(remaining),
    "X-RateLimit-Reset": String(reset),
  };
  if (retryAfterSec !== undefined) {
    headers["Retry-After"] = String(retryAfterSec);
  }
  return headers;
}
