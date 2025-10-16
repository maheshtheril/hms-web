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
  const [aiDemoOpen, setAiDemoOpen] = useState(false);

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
      {/* ambient background lighting */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute top-[-15%] left-1/2 -translate-x-1/2 h-[32rem] w-[32rem] rounded-full bg-gradient-to-br from-sky-500/25 via-indigo-600/20 to-transparent blur-[180px]" />
        <div className="absolute bottom-[-20%] right-[-10%] h-[30rem] w-[30rem] rounded-full bg-gradient-to-tr from-indigo-500/10 via-cyan-400/10 to-transparent blur-[150px]" />
        <div className="absolute left-1/2 top-0 -translate-x-1/2 h-px w-[80%] bg-gradient-to-r from-transparent via-white/10 to-transparent" />
      </div>

      <div className="relative z-10 mx-auto flex min-h-screen max-w-screen-xl items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          {/* glowing logo with pulse */}
          <div className="mb-6 flex justify-center">
            <div className="relative">
              {/* animated aura */}
              <div className="absolute -inset-2 rounded-full bg-gradient-to-r from-sky-400/40 via-indigo-500/30 to-transparent blur-[90px] opacity-80 glow-pulse" />

              <div className="relative z-10 flex h-24 w-24 items-center justify-center rounded-full bg-white/5 p-2 shadow-2xl backdrop-blur-sm">
                <img
                  src="/logo.png"
                  alt="GeniusGrid"
                  className="h-20 w-20 rounded-full object-contain"
                />
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-white/8 bg-white/[0.04] p-8 shadow-2xl backdrop-blur-xl">
            {/* refined header: title + small AI badge + powered by line */}
            <div className="mb-6 text-center">
              <div className="flex items-center justify-center gap-2 mb-2">
                <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight bg-gradient-to-r from-sky-300 via-indigo-400 to-sky-300 bg-clip-text text-transparent">
                  Welcome back
                </h1>

                <span className="inline-flex items-center rounded-full bg-white/10 px-2.5 py-0.5 text-xs font-medium text-sky-300">
                  <svg width="12" height="12" viewBox="0 0 24 24" className="mr-1" aria-hidden>
                    <path
                      fill="currentColor"
                      d="M12 2C7 2 3 6 3 11s4 9 9 9 9-4 9-9-4-9-9-9Zm0 2a7 7 0 0 1 7 7c0 1.7-.6 3.3-1.7 4.5L7.5 7.7A6.9 6.9 0 0 1 12 4Zm0 14a7 7 0 0 1-7-7c0-1.7.6-3.3 1.7-4.5L16.5 16.3c-1.2 1.2-2.8 1.7-4.5 1.7Z"
                    />
                  </svg>
                  AI
                </span>
              </div>

              <p className="text-lg font-semibold text-indigo-300">powered by GeniusGrid&nbsp;AI</p>

              <p className="mt-2 text-sm text-white/70 max-w-sm mx-auto">
                Sign in to your GeniusGrid workspace — experience AI-driven insights and automation.
              </p>
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
                  type="email"
                  autoComplete="email"
                  inputMode="email"
                  className="w-full rounded-2xl bg-white/5 border border-white/10 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-sky-400/40"
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
                    className="text-xs text-white/80 hover:text-white underline underline-offset-2"
                  >
                    Forgot password?
                  </a>
                </div>
                <div className="relative">
                  <input
                    id={pwId}
                    type={showPw ? "text" : "password"}
                    autoComplete="current-password"
                    className="w-full rounded-2xl bg-white/5 border border-white/10 px-3 py-2 pr-10 text-sm outline-none focus:ring-2 focus:ring-sky-400/40"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.currentTarget.value)}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw((v) => !v)}
                    className="absolute inset-y-0 right-2 my-auto h-7 w-7 rounded-md bg-white/8 text-white/90 hover:bg-white/12"
                    aria-label="Toggle password visibility"
                  >
                    {showPw ? "🙈" : "👁️"}
                  </button>
                </div>
              </div>

              {/* Remember + AI Demo */}
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

                <button
                  type="button"
                  onClick={() => setAiDemoOpen(true)}
                  className="text-xs underline underline-offset-2 hover:text-white/95"
                >
                  Try AI demo
                </button>
              </div>

              {/* submit */}
              <button
                type="submit"
                disabled={loading}
                className="mt-2 w-full rounded-xl bg-gradient-to-r from-sky-400 to-indigo-500 px-4 py-2.5 text-sm font-semibold text-black shadow-lg shadow-sky-600/25 transition-transform active:scale-[.98] disabled:opacity-60"
              >
                {loading ? "Signing in…" : "Sign in"}
              </button>

              {/* signup */}
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

      {/* AI demo modal (optional) */}
      {aiDemoOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setAiDemoOpen(false)} />
          <div className="relative z-10 max-w-xl rounded-2xl bg-white/5 p-6 shadow-xl">
            <div className="flex items-start justify-between">
              <h3 className="text-lg font-semibold">AI Assistant — Quick demo</h3>
              <button
                onClick={() => setAiDemoOpen(false)}
                className="text-white/70 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="mt-3 space-y-3 text-sm text-white/90">
              <div className="rounded-xl bg-white/6 p-3">
                <strong>Suggested setup:</strong>
                <p className="mt-2 text-xs text-white/80">
                  • Create default roles (Admin, Accountant, Sales).<br />
                  • Map GST & Chart of Accounts automatically.<br />
                  • Enable smart approval workflows.
                </p>
              </div>

              <div className="rounded-xl bg-white/6 p-3">
                <strong>Tip:</strong>
                <p className="mt-2 text-xs text-white/80">
                  Ask GeniusGrid AI for step-by-step migration and automation suggestions.
                </p>
              </div>
            </div>

            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={() => {
                  setAiDemoOpen(false);
                  router.push("/onboarding");
                }}
                className="rounded-md bg-sky-500 px-3 py-1.5 text-sm font-medium text-black"
              >
                Explore onboarding
              </button>
              <button
                onClick={() => setAiDemoOpen(false)}
                className="rounded-md px-3 py-1.5 text-sm text-white/80"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
