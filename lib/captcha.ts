/**
 * reCAPTCHA verification — Google reCAPTCHA v2
 */

const DEV = process.env.NODE_ENV === "development";

export interface RecaptchaVerifyResult {
  success: boolean;
  score?: number;      // reCAPTCHA v3: 0.0–1.0
  action?: string;
  "error-codes"?: string[];
}

/**
 * Verifikasi Google reCAPTCHA token di server.
 * Endpoint: https://www.google.com/recaptcha/api/siteverify
 */
export async function verifyRecaptchaToken(
  token: string | null | undefined,
  remoteIp?: string
): Promise<{ ok: boolean; score?: number; error?: string }> {
  const secret = process.env.RECAPTCHA_SECRET_KEY;

  // Dev mode: pass tanpa verifikasi
  if (DEV && !token) return { ok: true };

  // Secret belum dikonfigurasi → skip dengan warning
  if (!secret) {
    console.warn("[captcha] RECAPTCHA_SECRET_KEY tidak diset — reCAPTCHA dilewati.");
    return { ok: true };
  }

  // Token wajib jika secret ada
  if (!token) {
    return { ok: false, error: "reCAPTCHA token tidak ada" };
  }

  try {
    const body = new URLSearchParams({
      secret,
      response: token,
      ...(remoteIp ? { remoteip: remoteIp } : {}),
    });

    const res = await fetch("https://www.google.com/recaptcha/api/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
    });

    if (!res.ok) {
      return { ok: false, error: `reCAPTCHA HTTP ${res.status}` };
    }

    const data: RecaptchaVerifyResult = await res.json();

    if (!data.success) {
      return {
        ok: false,
        error: `reCAPTCHA gagal: ${(data["error-codes"] ?? []).join(", ")}`,
      };
    }

    return { ok: true, score: data.score };
  } catch (err) {
    console.error("[captcha] reCAPTCHA network error:", err);
    return { ok: true }; // fail-open
  }
}
