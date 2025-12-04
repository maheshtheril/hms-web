export const BACKEND =
  process.env.NEXT_PUBLIC_BACKEND_URL ||
  process.env.BACKEND_URL ||
  "";

// debug: show resolved BACKEND at runtime (will appear in browser console when bundle loads)
if (typeof window !== "undefined") {
  console.info("[env] BACKEND (client):", BACKEND);
}

export function assertBackend() {
  if (!BACKEND) {
    throw new Error(
      "BACKEND URL is not configured. Set NEXT_PUBLIC_BACKEND_URL in your web env."
    );
  }
  return BACKEND;
}
