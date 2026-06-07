"use client";

/**
 * DualCaptcha — komponen UI untuk Cloudflare Turnstile + Google reCAPTCHA
 *
 * Perilaku render:
 *   - Kedua key ada  → tampilkan Turnstile (invisible) + reCAPTCHA (normal)
 *   - Hanya Turnstile → tampilkan Turnstile saja
 *   - Hanya reCAPTCHA → tampilkan reCAPTCHA saja
 *   - Tidak ada key  → tidak render apapun (mode dev/staging tanpa konfigurasi)
 *
 * Komponen ini "graceful" — tidak crash jika key belum diisi.
 */

import { useEffect, useRef, useState, useCallback } from "react";
import ReCAPTCHA from "react-google-recaptcha";
import { ShieldCheck, AlertTriangle } from "lucide-react";

// ── Types ───────────────────────────────────────────────────────────────────

export interface DualCaptchaTokens {
  turnstileToken: string | null;
  recaptchaToken: string | null;
}

interface DualCaptchaProps {
  /** Dipanggil saat salah satu atau kedua token berubah */
  onChange: (tokens: DualCaptchaTokens) => void;
  /** Dipanggil saat semua provider yang aktif sudah terverifikasi */
  onVerified?: () => void;
  /** Dipanggil jika ada error dari provider */
  onError?: (error: string) => void;
  /** Dark mode */
  theme?: "light" | "dark";
  className?: string;
}

// ── Turnstile widget (load script on demand) ─────────────────────────────────

declare global {
  interface Window {
    turnstile?: {
      render: (container: HTMLElement, options: object) => string;
      reset: (widgetId: string) => void;
      remove: (widgetId: string) => void;
      getResponse: (widgetId: string) => string | undefined;
    };
    onTurnstileLoad?: () => void;
  }
}

function loadTurnstileScript(onLoad: () => void) {
  if (typeof window === "undefined") return;
  if (window.turnstile) { onLoad(); return; }
  if (document.getElementById("cf-turnstile-script")) return;

  window.onTurnstileLoad = onLoad;

  const script = document.createElement("script");
  script.id = "cf-turnstile-script";
  script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?onload=onTurnstileLoad&render=explicit";
  script.async = true;
  script.defer = true;
  document.head.appendChild(script);
}

// ── Main component ────────────────────────────────────────────────────────────

export function DualCaptcha({
  onChange,
  onVerified,
  onError,
  theme = "light",
  className = "",
}: DualCaptchaProps) {
  const siteKeyTurnstile = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
  const siteKeyRecaptcha = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY;

  const hasTurnstile = !!siteKeyTurnstile;
  const hasRecaptcha = !!siteKeyRecaptcha;

  const [tsToken, setTsToken] = useState<string | null>(null);
  const [rcToken, setRcToken] = useState<string | null>(null);
  const [tsReady, setTsReady] = useState(false);
  const [tsError, setTsError] = useState<string | null>(null);

  const recaptchaRef = useRef<ReCAPTCHA>(null);
  const turnstileContainerRef = useRef<HTMLDivElement>(null);
  const turnstileWidgetId = useRef<string | null>(null);

  // Emit tokens ke parent setiap ada perubahan
  useEffect(() => {
    onChange({ turnstileToken: tsToken, recaptchaToken: rcToken });
  }, [tsToken, rcToken, onChange]);

  // Cek apakah semua provider yang aktif sudah terverifikasi
  useEffect(() => {
    const tsOk = !hasTurnstile || !!tsToken;
    const rcOk = !hasRecaptcha || !!rcToken;
    if (tsOk && rcOk && (hasTurnstile || hasRecaptcha)) {
      onVerified?.();
    }
  }, [tsToken, rcToken, hasTurnstile, hasRecaptcha, onVerified]);

  // Render Turnstile widget setelah script load
  const renderTurnstile = useCallback(() => {
    if (!window.turnstile || !turnstileContainerRef.current || !siteKeyTurnstile) return;
    if (turnstileWidgetId.current) return; // sudah dirender

    turnstileWidgetId.current = window.turnstile.render(turnstileContainerRef.current, {
      sitekey: siteKeyTurnstile,
      theme,
      size: "normal",
      callback: (token: string) => {
        setTsToken(token);
        setTsError(null);
      },
      "error-callback": () => {
        const msg = "Turnstile: verifikasi gagal. Refresh halaman.";
        setTsError(msg);
        onError?.(msg);
      },
      "expired-callback": () => {
        setTsToken(null);
      },
    });
  }, [siteKeyTurnstile, theme, onError]);

  useEffect(() => {
    if (!hasTurnstile) return;

    loadTurnstileScript(() => {
      setTsReady(true);
      renderTurnstile();
    });

    // Jika script sudah ada sebelumnya
    if (window.turnstile) {
      setTsReady(true);
      renderTurnstile();
    }

    return () => {
      if (window.turnstile && turnstileWidgetId.current) {
        try { window.turnstile.remove(turnstileWidgetId.current); } catch { /* ignore */ }
        turnstileWidgetId.current = null;
      }
    };
  }, [hasTurnstile, renderTurnstile]);

  // Tidak ada key sama sekali → render badge info saja (dev/staging mode)
  if (!hasTurnstile && !hasRecaptcha) {
    if (process.env.NODE_ENV === "development") {
      return (
        <div className={`flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 rounded-lg px-3 py-2 ${className}`}>
          <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
          <span>CAPTCHA dinonaktifkan (mode dev — key belum dikonfigurasi)</span>
        </div>
      );
    }
    return null;
  }

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Label keamanan */}
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <ShieldCheck className="w-3.5 h-3.5 text-green-500" />
        <span>
          Dilindungi{" "}
          {hasTurnstile && hasRecaptcha
            ? "Cloudflare Turnstile & Google reCAPTCHA"
            : hasTurnstile
            ? "Cloudflare Turnstile"
            : "Google reCAPTCHA"}
        </span>
      </div>

      {/* Cloudflare Turnstile */}
      {hasTurnstile && (
        <div className="space-y-1">
          {!tsReady && (
            <div className="h-16 bg-muted/40 animate-pulse rounded-lg flex items-center justify-center">
              <span className="text-xs text-muted-foreground">Memuat Cloudflare Turnstile...</span>
            </div>
          )}
          <div
            ref={turnstileContainerRef}
            style={{ display: tsReady ? "block" : "none" }}
          />
          {tsError && (
            <div className="flex items-center gap-1.5 text-xs text-destructive">
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>{tsError}</span>
            </div>
          )}
          {tsToken && (
            <div className="flex items-center gap-1.5 text-xs text-green-600">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Turnstile terverifikasi ✓</span>
            </div>
          )}
        </div>
      )}

      {/* Google reCAPTCHA */}
      {hasRecaptcha && (
        <div className="space-y-1">
          <ReCAPTCHA
            ref={recaptchaRef}
            sitekey={siteKeyRecaptcha!}
            theme={theme}
            size="normal"
            onChange={(token) => setRcToken(token)}
            onExpired={() => setRcToken(null)}
            onErrored={() => {
              const msg = "reCAPTCHA gagal dimuat. Refresh halaman.";
              onError?.(msg);
            }}
            className="flex justify-center"
          />
          {rcToken && (
            <div className="flex items-center gap-1.5 text-xs text-green-600">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>reCAPTCHA terverifikasi ✓</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Hook untuk mengelola state dual captcha tokens di form.
 *
 * Penggunaan:
 * ```tsx
 * const { tokens, handleChange, isVerified, reset } = useDualCaptcha();
 * // Teruskan tokens ke API: { turnstileToken: tokens.turnstileToken, captchaToken: tokens.recaptchaToken }
 * ```
 */
export function useDualCaptcha() {
  const [tokens, setTokens] = useState<DualCaptchaTokens>({
    turnstileToken: null,
    recaptchaToken: null,
  });
  const [verified, setVerified] = useState(false);

  const hasTurnstileKey = !!process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
  const hasRecaptchaKey = !!process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY;

  // Jika tidak ada key → selalu dianggap verified (graceful)
  const isVerified =
    !hasTurnstileKey && !hasRecaptchaKey
      ? true
      : verified ||
        ((!hasTurnstileKey || !!tokens.turnstileToken) &&
          (!hasRecaptchaKey || !!tokens.recaptchaToken));

  const handleChange = useCallback((t: DualCaptchaTokens) => {
    setTokens(t);
  }, []);

  const handleVerified = useCallback(() => {
    setVerified(true);
  }, []);

  const reset = useCallback(() => {
    setTokens({ turnstileToken: null, recaptchaToken: null });
    setVerified(false);
  }, []);

  return { tokens, isVerified, handleChange, handleVerified, reset };
}
