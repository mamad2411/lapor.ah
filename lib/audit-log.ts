/**
 * Log security events via server-side API route.
 * Never writes directly to Firestore from the browser —
 * that requires open security rules which is a bad practice.
 */
export async function logSecurityEvent(params: {
  event: string;
  email?: string;
  details?: Record<string, any>;
}) {
  try {
    // Fire-and-forget — don't await or block the caller
    fetch("/api/ops/audit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params),
    }).catch(() => {
      // Silently ignore network errors for audit logging
    });
  } catch {
    // Audit log must never throw
  }
}
