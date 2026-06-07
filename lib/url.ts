/**
 * Returns the base URL of the application.
 * Uses NEXT_PUBLIC_APP_URL env var, falling back to localhost:3000.
 */
export function getAppBaseUrl(): string {
  return (
    process.env.NEXT_PUBLIC_APP_URL ||
    (process.env.URL ? process.env.URL : 
     process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 
     "http://localhost:3000")
  );
}
