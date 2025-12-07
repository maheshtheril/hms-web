// web/app/login/page.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import BrandLogo from "@/components/BrandLogo";
import AuthCard from "@/components/AuthCard";
import PrimaryButton from "@/components/PrimaryButton";
import AIBadge from "@/components/AIBadge";
import NeuralGlow from "@/components/NeuralGlow";

/**
 * Opinionated improvements applied:
 * - Robust API base resolution (NEXT_PUBLIC_API_BASE preferred, falls back to window.origin).
 * - After login success, verify session by calling /api/me so we are certain cookie was set and session works.
 * - Clearer error messages and safe JSON parsing.
 * - Minor UX: trim email, disable submit while in-flight.
 */

function resolveApiBase(): string {
  // prefer public env var (explicit)
  const env = typeof process !== "undefined" ? process.env.NEXT_PUBLIC_API_BASE || process.env.NEXT_PUBLIC_BACKEND_URL || "" : "";
  if (env && env.trim()) return env.trim().replace(/\/$/, "");
  // fallback to same origin in browser
  if (typeof window !== "undefined" && window.location) {
    // If your backend is mounted under a different origin, set NEXT_PUBLIC_API_BASE in env.
    return window.location.origin;
  }
  return ""; // server-side fallback (shouldn't be used in client component)
}

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const API_BASE = resolveApiBase();

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (loading) return;
    setLoading(true);

    try {
      const payload = { email: String(email || "").trim(), password };

      // POST /auth/login (your server mounts auth at /auth)
      const loginRes = await fetch(`${API_BASE}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include", // required for cookies
        body: JSON.stringify(payload),
      });

      // Try to show helpful backend message when status !== 200
      if (!loginRes.ok) {
        let parsed = null;
        try {
          parsed = await loginRes.json();
        } catch {
          /* ignore */
        }
        const msg = parsed?.error || parsed?.message || `${loginRes.status} ${loginRes.statusText}`;
        setError(String(msg));
        setLoading(false);
        return;
      }

      // Opinionated: verify session by calling /api/me to ensure cookie persisted + server accepted it.
      const meRes = await fetch(`${API_BASE}/api/me`, {
        method: "GET",
        credentials: "include",
        headers: { Accept: "application/json" },
      });

      if (!meRes.ok) {
        // If /api/me returns 401 or 500, surface a clear message
        let parsed = null;
        try {
          parsed = await meRes.json();
        } catch {
          /* ignore */
        }
        // If 401 -> cookie wasn't accepted (likely CORS/cookie or SameSite issue)
        if (meRes.status === 401) {
          setError(
            "Login succeeded but session not established. Check backend CORS and cookie settings (SameSite, Secure) or ensure NEXT_PUBLIC_API_BASE matches backend origin."
          );
        } else {
          setError(parsed?.error || parsed?.message || `Verification failed (${meRes.status})`);
        }
        setLoading(false);
        return;
      }

      // Parse user shape (some servers return { ok: true, user: {...} } or full payload)
      let meJson: any = null;
      try {
        meJson = await meRes.json();
      } catch {
        // fallback: succeed even when server returned empty body
      }

      // If backend uses { ok: true, user: null } -> treat as failure
      if (meJson && ("user" in meJson) && meJson.user === null) {
        setError("Session verification failed: unauthenticated.");
        setLoading(false);
        return;
      }

      // Optionally store small non-sensitive user info for client-side use
      try {
        if (meJson?.user) localStorage.setItem("me", JSON.stringify(meJson.user));
      } catch {}

      // Success -> navigate to tenant dashboard (you used this before)
      router.replace("/tenant/dashboard");
    } catch (err: any) {
      const msg =
        err?.message ||
        "Network or unexpected error during login. If using a different backend origin, set NEXT_PUBLIC_API_BASE to your backend (e.g., https://hms-server-njlg.onrender.com).";
      setError(String(msg));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-black text-white overflow-hidden px-6">
      <div className="absolute inset-0 bg-gradient-to-b from-black via-zinc-950 to-black" />

      <div className="absolute -top-40 left-1/2 -translate-x-1/2 pointer-events-none z-0">
        <NeuralGlow size={720} intensity={0.9} colorA="#60a5fa" colorB="#6366f1" colorC="#a78bfa" />
      </div>

      <div className="relative z-10 flex flex-col items-center px-6 w-full max-w-[920px]">
        <div className="mb-6 flex items-center justify-center">
          <div className="relative z-10 flex h-36 w-36 items-center justify-center rounded-full bg-white/6 p-2 shadow-2xl backdrop-blur-sm">
            <BrandLogo size={8} pulse />
          </div>
        </div>

        <AuthCard className="w-full max-w-md">
          <motion.div initial={{ opacity: 0, y: 28 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <div className="text-center mb-6">
              <div className="flex items-center justify-center gap-2">
                <h1 className="text-3xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-sky-300 via-indigo-400 to-sky-300">
                  Welcome back
                </h1>
                <AIBadge />
              </div>
              <p className="mt-2 text-sm text-white/70">Sign in to your GeniusGrid workspace</p>
            </div>

            <form onSubmit={handleLogin} className="space-y-4" aria-label="Login form">
              <div>
                <label htmlFor="email" className="text-xs font-medium text-white/70">
                  Email
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  aria-invalid={!!error}
                  aria-describedby={error ? "form-error" : undefined}
                  className="w-full rounded-xl bg-white/5 border border-white/10 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-sky-400/40"
                  placeholder="you@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoFocus
                />
              </div>

              <div>
                <label htmlFor="password" className="text-xs font-medium text-white/70">
                  Password
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  aria-invalid={!!error}
                  aria-describedby={error ? "form-error" : undefined}
                  className="w-full rounded-xl bg-white/5 border border-white/10 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-sky-400/40"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>

              {error && (
                <p id="form-error" role="alert" className="text-sm text-red-400 mt-1">
                  {error}
                </p>
              )}

              <PrimaryButton type="submit" disabled={loading} aria-busy={loading}>
                {loading ? "Signing in…" : "Sign in"}
              </PrimaryButton>
            </form>

            <div className="mt-6 border-t border-white/10 pt-5 text-center">
              <p className="text-xs text-white/60 mb-2">Don’t have an account?</p>
              <a
                href="/signup"
                className="inline-block w-full rounded-xl border border-white/20 bg-white/5 px-4 py-2.5 text-sm font-medium text-white/90 hover:bg-white/10 transition"
              >
                Create an account
              </a>
            </div>
          </motion.div>
        </AuthCard>
      </div>
    </div>
  );
}
