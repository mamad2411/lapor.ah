/**
 * Request guard: sanitize input + detect injection/XSS patterns.
 * Use in API routes before processing body data.
 */

// Detects common SQL injection, NoSQL injection, and XSS patterns
const INJECTION_PATTERNS = [
  // SQL
  /(\b(select|insert|update|delete|drop|truncate|alter|create|exec|union)\b.{0,30}\b(from|into|table|where|database)\b)/i,
  /(--|;|\/\*|\*\/|xp_|sp_)/,
  // NoSQL injection (MongoDB operators)
  /\$where|\$gt|\$lt|\$ne|\$in|\$nin|\$exists|\$regex/,
  // XSS
  /<script[\s>]/i,
  /javascript\s*:/i,
  /on\w+\s*=/i,          // onerror=, onclick=, etc.
  /<iframe|<object|<embed|<svg.*on/i,
  // Path traversal (in body values)
  /\.\.[/\\]/,
  // Template injection
  /\{\{.*\}\}|\$\{.*\}/,
];

/** Returns true if the string contains injection patterns */
export function hasInjection(value: string): boolean {
  return INJECTION_PATTERNS.some((p) => p.test(value));
}

/** Recursively scan an object's string values for injection */
export function scanObject(obj: unknown, depth = 0): string | null {
  if (depth > 5) return null; // prevent deep traversal abuse
  if (typeof obj === "string") {
    return hasInjection(obj) ? `Suspicious value detected: "${obj.slice(0, 40)}"` : null;
  }
  if (Array.isArray(obj)) {
    for (const item of obj) {
      const r = scanObject(item, depth + 1);
      if (r) return r;
    }
    return null;
  }
  if (obj !== null && typeof obj === "object") {
    for (const [key, val] of Object.entries(obj as Record<string, unknown>)) {
      // Block NoSQL operator keys like $where, $gt
      if (key.startsWith("$")) return `Disallowed key: "${key}"`;
      const r = scanObject(val, depth + 1);
      if (r) return r;
    }
  }
  return null;
}

/** Strip HTML tags and null bytes from a string */
export function sanitizeString(value: string): string {
  return value
    .replace(/\0/g, "")                    // null bytes
    .replace(/<[^>]*>/g, "")               // HTML tags
    .replace(/[\u200B-\u200D\uFEFF]/g, "") // zero-width chars
    .trim();
}

/** Recursively sanitize all string values in an object */
export function sanitizeObject<T>(obj: T): T {
  if (typeof obj === "string") return sanitizeString(obj) as unknown as T;
  if (Array.isArray(obj)) return obj.map(sanitizeObject) as unknown as T;
  if (obj !== null && typeof obj === "object") {
    return Object.fromEntries(
      Object.entries(obj as Record<string, unknown>).map(([k, v]) => [k, sanitizeObject(v)])
    ) as T;
  }
  return obj;
}

/**
 * Parse and guard a JSON request body.
 * Returns { data } on success or { error, status } on failure.
 */
export async function guardBody<T>(
  req: Request
): Promise<{ data: T; error?: never } | { data?: never; error: string; status: number }> {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return { error: "Body tidak valid (bukan JSON)", status: 400 };
  }

  const injection = scanObject(raw);
  if (injection) {
    return { error: "Request ditolak: konten tidak diizinkan", status: 400 };
  }

  return { data: sanitizeObject(raw) as T };
}
