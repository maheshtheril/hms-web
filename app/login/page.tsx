"use client";

import { useEffect, useId, useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // restore remembered email
  useEffect(() => {
    try {
      const saved = localStorage.getItem("login_email");
      if (saved) setEmail(saved);
    } catch {}
  }, []);

  const emailId = useId();
  const pwId = useId();

  async function handleLogin(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (loading) return;

    setError("");
    setLoading(true);

    if (!email || !password) {
      setError("Email and password are required.");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email: email.trim(), password }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data?.error || "Login failed");
        setLoading(false);
        return;
      }

      try {
        if (remember) localStorage.setItem("login_email", email.trim());
        else localStorage.removeItem("login_email");
        sessionStorage.setItem("celebrateLoginOnce", "1");
      } catch {}

      router.replace("/dashboard");
    } catch {
      setError("Unexpected error. Please try again.");
      setLoading(false);
    }
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-b from-black via-zinc-950 to-black text-white">
      {/* subtle global background decorations */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-40 right-[-10%] h-[40rem] w-[40rem] rounded-full bg-gradient-to-br from-indigo-700/20 via-sky-600/15 to-transparent blur-3xl opacity-20" />
        <div className="absolute left-1/2 top-0 -translate-x-1/2 h-px w-[80%] bg-gradient-to-r from-transparent via-white/10 to-transparent" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.03),transparent_60%)]" />
      </div>

      <div className="relative z-10 mx-auto flex min-h-screen max-w-screen-xl items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          {/* logo — centered above card, circular with halo */}
          <div className="mb-6 flex justify-center">
            <div className="relative">
              <div className="absolute -inset-1 rounded-full bg-gradient-to-r from-indigo-400/30 via-sky-400/20 to-transparent blur-xl opacity-60" />
              <div className="relative z-10 flex h-24 w-24 items-center justify-center rounded-full bg-white/5 p-2 shadow-lg backdrop-blur-sm">
                <img
                  src="/logo.png"
                  alt="GeniusGrid"
                  className="h-20 w-20 rounded-full object-contain"
                />
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-white/8 bg-white/3 p-6 sm:p-8 shadow-2xl backdrop-blur-xl">
            {/* header */}
            <div className="mb-4 text-center">
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">Welcome back</h1>
              <p className="mt-1 text-sm text-white/70">Sign in to your GeniusGrid workspace</p>
            </div>

            {/* error */}
            {error && (
              <div
                role="alert"
                className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200"
              >
                {error}
              </div>
            )}

            {/* form */}
            <form onSubmit={handleLogin} className="space-y-4">
              {/* Email */}
              <div className="space-y-1.5">
                <label htmlFor={emailId} className="block text-xs font-medium text-white/80">
                  Email
                </label>
                <input
                  id={emailId}
                  name="email"
                  type="email"
                  autoComplete="email"
                  inputMode="email"
                  className="w-full rounded-2xl bg-white/5 border border-white/8 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-400/30"
                  placeholder="you@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.currentTarget.value)}
                  required
                />
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label htmlFor={pwId} className="block text-xs font-medium text-white/80">
                    Password
                  </label>
                  <a
                    href="/forgot-password"
                    className="text-xs text-white/80 hover:text-white/95 underline underline-offset-2"
                  >
                    Forgot password?
                  </a>
                </div>
                <div className="relative">
                  <input
                    id={pwId}
                    name="password"
                    type={showPw ? "text" : "password"}
                    autoComplete="current-password"
                    className="w-full rounded-2xl bg-white/5 border border-white/8 px-3 py-2 pr-10 text-sm outline-none focus:ring-2 focus:ring-indigo-400/30"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.currentTarget.value)}
                    required
                  />
                  <button
                    type="button"
                    aria-label={showPw ? "Hide password" : "Show password"}
                    onClick={() => setShowPw((v) => !v)}
                    className="absolute inset-y-0 right-2 my-auto inline-flex h-7 w-7 items-center justify-center rounded-md bg-white/8 text-white/90 hover:bg-white/12"
                    tabIndex={0}
                  >
                    {showPw ? (
                      <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden>
                        <path
                          fill="currentColor"
                          d="M2 5.27L3.28 4l16.97 16.97L19.97 22l-2.58-2.58A10.86 10.86 0 0 1 12 21C6 21 2 12 2 12a21.2 21.2 0 0 1 4.05-5.94L2 5.27Zm9.99 3.02A3 3 0 0 0 9 12a3 3 0 0 0 4.99 2.71l-1-1A2 2 0 1 1 11 12c0-.26.05-.51.14-.73l.85-.98Zm8.01 3.71s-.75 1.74-2.26 3.48l-1.46-1.46A8.25 8.25 0 0 0 20 12s-1.93-4.5-8-4.5c-.68 0-1.32.07-1.92.2l-1.6-1.6A10.7 10.7 0 0 1 12 6c6 0 10 6 10 6Z"
                        />
                      </svg>
                    ) : (
                      <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden>
                        <path
                          fill="currentColor"
                          d="M12 6c6 0 10 6 10 6s-4 6-10 6S2 12 2 12s4-6 10-6Zm0 2C8.69 8 6.03 9.7 4.44 12C6.03 14.3 8.69 16 12 16s5.97-1.7 7.56-4c-1.59-2.3-4.25-4-7.56-4Zm0 2a2 2 0 1 1 0 4a2 2 0 0 1 0-4Z"
                        />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              {/* Remember me */}
              <div className="flex items-center justify-between pt-1">
                <label className="flex items-center gap-2 text-xs text-white/80 select-none">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-white/20 bg-white/10"
                    checked={remember}
                    onChange={(e) => setRemember(e.currentTarget.checked)}
                  />
                  Remember me
                </label>
              </div>

              {/* submit */}
              <button
                type="submit"
                disabled={loading}
                className="mt-1 w-full rounded-xl bg-gradient-to-r from-indigo-400 to-sky-400 px-4 py-2.5 text-sm font-semibold text-black shadow-lg shadow-sky-600/20 transition-transform active:scale-[.98] disabled:opacity-60"
              >
                {loading ? "Signing in…" : "Sign in"}
              </button>

              {/* signup divider + button */}
              <div className="mt-6 border-t border-white/10 pt-5 text-center">
                <p className="text-xs text-white/60 mb-3">Don’t have an account?</p>
                <a
                  href="/signup"
                  className="inline-block w-full rounded-xl border border-white/20 bg-white/5 px-4 py-2.5 text-sm font-medium text-white/90 hover:bg-white/10 hover:text-white transition"
                >
                  Create an account
                </a>
              </div>
            </form>

            {/* footer */}
            <div className="mt-6 text-center text-xs text-white/60">
              By continuing you agree to our{" "}
              <a href="/legal/terms" className="underline underline-offset-2 hover:text-white/80">
                Terms
              </a>{" "}
              &{" "}
              <a href="/legal/privacy" className="underline underline-offset-2 hover:text-white/80">
                Privacy Policy
              </a>
              .
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
