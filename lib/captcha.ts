/**
 * Dual CAPTCHA verification — Cloudflare Turnstile + Google reCAPTCHA
 *
 * Strategi verifikasi:
 *   1. Jika kedua key tersedia → verifikasi keduanya (AND logic)
 *   2. Jika hanya Turnstile key ada → verifikasi Turnstile saja
 *   3. Jika hanya reCAPTCHA key ada → verifikasi reCAPTCHA saja
 *   4. Jika tidak ada key sama sekali → skip (warning di log, tetap jalan)
 *   5. Di development → selalu pass tanpa token
 *
 * Dengan cara ini tidak perlu key untuk bisa run dev/staging, tapi
 * di produksi keduanya aktif sekaligus jika key diisi.
 */

const DEV = process.env.NODE_ENV === "development";

// ── Cloudflare Turnstile ────────────────────────────────────────────────────

export interface TurnstileVerifyResult {
  success: boolean;
  score?: number;        // 0.0–1.0 (Enterprise only)
  errorCodes?: string[];
  hostname?: string;
  action?: string;
}

/**
 * Verifikasi Cloudflare Turnstile token di server.
 * Endpoint: https://challenges.cloudflare.com/turnstile/v0/siteverify
 */
export async function verifyTurnstile(
  token: string | null | undefined,
  remoteIp?: string
): Promise<{ ok: boolean; score?: number; error?: string }> {
  const secret = process.env.TURNSTILE_SECRET_KEY;

  // Dev mode: pass tanpa verifikasi
  if (DEV && !token) return { ok: true };

  // Secret belum dikonfigurasi → skip dengan warning
  if (!secret) {
    console.warn("[captcha] TURNSTILE_SECRET_KEY tidak diset — Turnstile dilewati.");
    return { ok: true };
  }

  // Token wajib jika secret ada
  if (!token) {
    return { ok: false, error: "Turnstile token tidak ada" };
  }

  try {
    const body = new URLSearchParams({
      secret,
      response: token,
      ...(remoteIp ? { remoteip: remoteIp } : {}),
    });

    const res = await fetch(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: body.toString(),
      }
    );

    if (!res.ok) {
      return { ok: false, error: `Turnstile HTTP ${res.status}` };
    }

    const data: TurnstileVerifyResult = await res.json();

    if (!data.success) {
      return {
        ok: false,
        error: `Turnstile gagal: ${(data.errorCodes ?? []).join(", ")}`,
      };
    }

    return { ok: true, score: data.score };
  } catch (err) {
    // Network error — jangan blokir user, log saja
    console.error("[captcha] Turnstile network error:", err);
    return { ok: true }; // fail-open agar tidak blokir user saat CF down
  }
}

// ── Google reCAPTCHA ────────────────────────────────────────────────────────

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

// ── Dual verification ───────────────────────────────────────────────────────

export interface DualCaptchaInput {
  /** Token dari Cloudflare Turnstile (boleh null/undefined jika key belum dikonfigurasi) */
  turnstileToken?: string | null;
  /** Token dari Google reCAPTCHA (boleh null/undefined jika key belum dikonfigurasi) */
  recaptchaToken?: string | null;
  /** IP client untuk mengirim ke kedua provider (dari CF-Connecting-IP atau x-forwarded-for) */
  remoteIp?: string;
}

export interface DualCaptchaResult {
  ok: boolean;
  /** Pesan error yang bisa ditampilkan ke user */
  error?: string;
  /** Detail verifikasi per provider */
  details: {
    turnstile: { checked: boolean; ok: boolean; score?: number };
    recaptcha: { checked: boolean; ok: boolean; score?: number };
  };
}

/**
 * Verifikasi dual CAPTCHA secara paralel.
 *
 * Logika:
 * - Jika kedua provider dikonfigurasi (ada secret key) → keduanya harus lulus
 * - Jika hanya satu dikonfigurasi → hanya yang itu yang diperiksa
 * - Jika tidak ada yang dikonfigurasi → pass dengan warning
 */
export async function verifyDualCaptcha(input: DualCaptchaInput): Promise<DualCaptchaResult> {
  const hasTurnstileKey = !!process.env.TURNSTILE_SECRET_KEY;
  const hasRecaptchaKey = !!process.env.RECAPTCHA_SECRET_KEY;

  // Kedua key tidak ada → warn dan izinkan (untuk staging/dev tanpa konfigurasi)
  if (!hasTurnstileKey && !hasRecaptchaKey) {
    console.warn("[captcha] Tidak ada CAPTCHA key yang dikonfigurasi — semua request diizinkan.");
    return {
      ok: true,
      details: {
        turnstile: { checked: false, ok: true },
        recaptcha: { checked: false, ok: true },
      },
    };
  }

  // Jalankan verifikasi secara paralel
  const [tsResult, rcResult] = await Promise.all([
    hasTurnstileKey
      ? verifyTurnstile(input.turnstileToken, input.remoteIp)
      : Promise.resolve({ ok: true }),
    hasRecaptchaKey
      ? verifyRecaptchaToken(input.recaptchaToken, input.remoteIp)
      : Promise.resolve({ ok: true }),
  ]);

  const allOk = tsResult.ok && rcResult.ok;

  // Bangun pesan error yang informatif
  let error: string | undefined;
  if (!allOk) {
    const failures: string[] = [];
    if (hasTurnstileKey && !tsResult.ok) failures.push(`Turnstile: ${tsResult.error}`);
    if (hasRecaptchaKey && !rcResult.ok) failures.push(`reCAPTCHA: ${rcResult.error}`);
    error = `Verifikasi keamanan gagal. ${failures.join(" | ")}`;
  }

  return {
    ok: allOk,
    error,
    details: {
      turnstile: { checked: hasTurnstileKey, ok: tsResult.ok, score: tsResult.score },
      recaptcha: { checked: hasRecaptchaKey, ok: rcResult.ok, score: rcResult.score },
    },
  };
}

// ── Backward compat: verifyRecaptcha lama masih bisa dipakai ────────────────
/** @deprecated Gunakan verifyDualCaptcha untuk dual protection */
export async function verifyRecaptcha(token: string | null | undefined): Promise<boolean> {
  const result = await verifyRecaptchaToken(token);
  return result.ok;
}
