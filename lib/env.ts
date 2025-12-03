// lib/env.ts

// Single source of truth for backend URL.
// In the browser, only NEXT_PUBLIC_* is available, so make sure
// NEXT_PUBLIC_BACKEND_URL is set in .env(.local) on the web app.
export const BACKEND =
  process.env.NEXT_PUBLIC_BACKEND_URL ||
  process.env.BACKEND_URL ||
  "";

// Optional: small runtime guard you can use where needed
export function assertBackend() {
  if (!BACKEND) {
    throw new Error(
      "BACKEND URL is not configured. Set NEXT_PUBLIC_BACKEND_URL in your web env."
    );
  }
  return BACKEND;
}
