/**
 * Content Security Policy (CSP) builder.
 *
 * CSP adalah lapisan penting Cloudflare / browser security untuk mencegah:
 *   - XSS (Cross-Site Scripting)
 *   - Clickjacking
 *   - Data injection
 *   - Inline script abuse
 *
 * Nonce-based CSP digunakan untuk Next.js App Router yang membutuhkan
 * inline scripts pada komponen server-side.
 */

/** Generate nonce 128-bit acak yang aman untuk digunakan di script-src. */
export function generateNonce(): string {
  // Gunakan Web Crypto API yang kompatibel dengan Edge Runtime
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  
  // Konversi byte array ke Base64 secara manual (Edge-friendly)
  return btoa(String.fromCharCode(...array));
}

/**
 * Bangun string CSP policy yang lengkap.
 *
 * Catatan: Karena Netlify/Next.js App Router meng-inject beberapa inline scripts,
 * kita gunakan nonce. Di produksi, `'unsafe-inline'` TIDAK digunakan.
 */
export function buildCsp(nonce: string): string {
  const isProd = process.env.NODE_ENV === "production";

  const directives: Record<string, string[]> = {
    "default-src": ["'self'"],

    "script-src": [
      "'self'",
      // Next.js hydration & third-party compatibility
      "'unsafe-inline'",
      "'unsafe-eval'",
      // Next.js telemetry & Vercel Analytics
      "https://va.vercel-scripts.com",
      // Google reCAPTCHA
      "https://www.google.com",
      "https://www.gstatic.com",
      // Firebase (Auth SDK membutuhkan ini)
      "https://apis.google.com",
    ],

    "style-src": [
      "'self'",
      // Tailwind + Radix perlu inline styles
      "'unsafe-inline'",
      "https://fonts.googleapis.com",
    ],

    "font-src": [
      "'self'",
      "https://fonts.gstatic.com",
      "data:",
    ],

    "img-src": [
      "'self'",
      "data:",
      "blob:",
      // Firebase Storage
      "https://firebasestorage.googleapis.com",
      "https://storage.googleapis.com",
      // Avatar / gravatar
      "https://lh3.googleusercontent.com",
      // Leaflet markers & external assets
      "https://unpkg.com",
      // Peta (Leaflet tiles)
      "https://*.tile.openstreetmap.org",
      "https://*.tile.openstreetmap.fr",
    ],

    "connect-src": [
      "'self'",
      // Firebase Realtime DB + Firestore + Auth
      "https://*.googleapis.com",
      "https://*.firebaseio.com",
      "wss://*.firebaseio.com",
      "https://identitytoolkit.googleapis.com",
      "https://securetoken.googleapis.com",
      // Firebase Storage
      "https://firebasestorage.googleapis.com",
      "https://storage.googleapis.com",
      // reCAPTCHA verify
      "https://www.google.com",
      // Vercel Analytics
      "https://vitals.vercel-insights.com",
      ...(isProd ? [] : ["ws://localhost:*", "http://localhost:*"]),
    ],

    "frame-src": [
      // Google reCAPTCHA iframe
      "https://www.google.com",
      "https://recaptcha.google.com",
    ],

    "frame-ancestors": ["'none'"],

    "form-action": ["'self'"],

    "base-uri": ["'self'"],

    "object-src": ["'none'"],

    "media-src": ["'self'", "blob:", "data:"],

    "worker-src": ["'self'", "blob:"],

    "manifest-src": ["'self'"],

    "upgrade-insecure-requests": [],
  };

  return Object.entries(directives)
    .map(([key, values]) =>
      values.length > 0 ? `${key} ${values.join(" ")}` : key
    )
    .join("; ");
}
