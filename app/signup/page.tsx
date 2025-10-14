// web/app/signup/page.tsx
"use client";

import { useMemo, useState } from "react";
import axios from "axios";
import { useRouter } from "next/navigation";

/** Use relative /api so Next.js rewrites proxy to backend (no CORS envs). */
const api = axios.create({
  baseURL: "", // ← keep empty; calls go to same-origin /api/*
  withCredentials: true,
});

/* ───────────────── Password Policy (mirror of backend) ───────────────── */
const PASSWORD_POLICY = {
  minLength: 12,
  maxLength: 128,
  requireUpper: true,
  requireLower: true,
  requireDigit: true,
  requireSymbol: true,
  symbolRegex: /[^A-Za-z0-9]/,
};

/** Client-side check used to guide UX; server remains the source of truth. */
function checkPasswordClient(pw: string) {
  const reasons: string[] = [];
  if (!pw || pw.length < PASSWORD_POLICY.minLength) {
    reasons.push(`Minimum ${PASSWORD_POLICY.minLength} characters.`);
  }
  if (pw.length > PASSWORD_POLICY.maxLength) {
    reasons.push(`Maximum ${PASSWORD_POLICY.maxLength} characters.`);
  }
  if (PASSWORD_POLICY.requireUpper && !/[A-Z]/.test(pw)) {
    reasons.push("Include at least one uppercase letter (A–Z).");
  }
  if (PASSWORD_POLICY.requireLower && !/[a-z]/.test(pw)) {
    reasons.push("Include at least one lowercase letter (a–z).");
  }
  if (PASSWORD_POLICY.requireDigit && !/[0-9]/.test(pw)) {
    reasons.push("Include at least one number (0–9).");
  }
  if (PASSWORD_POLICY.requireSymbol && !PASSWORD_POLICY.symbolRegex.test(pw)) {
    reasons.push("Include at least one symbol (e.g., !@#$%^&*).");
  }
  if (/(.)\1\1/.test(pw)) {
    reasons.push("Avoid 3 or more repeated characters in a row.");
  }
  if (/(0123|1234|2345|3456|4567|5678|6789|abcd|bcde|cdef|qwerty)/i.test(pw)) {
    reasons.push("Avoid simple sequences like '1234' or 'abcd'.");
  }
  return { ok: reasons.length === 0, reasons };
}

/** Lightweight strength score for the meter (0–4) */
function strengthScore(pw: string) {
  if (!pw) return 0;
  let score = 0;
  if (pw.length >= 12) score++;
  if (pw.length >= 16) score++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score++;
  if (/[0-9]/.test(pw) && /[^A-Za-z0-9]/.test(pw)) score++;
  return Math.min(score, 4);
}

export default function SignupPage() {
  const [form, setForm] = useState({ org: "", name: "", email: "", password: "" });
  const [showPw, setShowPw] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [pwReasons, setPwReasons] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [ok, setOk] = useState(false);
  const router = useRouter();

  const onChange =
    (k: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const v = e.target.value;
      setForm((f) => ({ ...f, [k]: v }));
      if (k === "password") {
        const c = checkPasswordClient(v);
        setPwReasons(c.ok ? [] : c.reasons);
      }
    };

  const score = useMemo(() => strengthScore(form.password), [form.password]);
  const canSubmit =
    !!form.org.trim() &&
    !!form.name.trim() &&
    /\S+@\S+\.\S+/.test(form.email) &&
    form.password.length > 0 &&
    pwReasons.length === 0;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;

    setErr(null);
    setOk(false);
    setLoading(true);

    try {
      const res = await api.post("/api/tenant-signup", form);
      if (res.data?.ok) {
        setOk(true);
        // Small pause for UX, then route
        setTimeout(() => router.push("/dashboard"), 350);
      } else {
        setErr(res.data?.error || "Signup failed");
      }
    } catch (e: any) {
      const data = e?.response?.data;
      // Backend may return: { error: "weak_password", reasons: [...] }
      if (data?.error === "weak_password" && Array.isArray(data?.reasons)) {
        setPwReasons(data.reasons);
        setErr("Please meet the password requirements.");
      } else {
        setErr(data?.error || "Signup failed");
      }
    } finally {
      setLoading(false);
    }
  }

  /* ──────────────── Styles ──────────────── */
  const inputClass =
    "w-full rounded-xl border border-zinc-300 dark:border-zinc-700 " +
    "bg-white dark:bg-zinc-900 px-3 py-2.5 text-zinc-900 dark:text-zinc-100 " +
    "placeholder-zinc-400 dark:placeholder-zinc-500 outline-none " +
    "focus:ring-2 focus:ring-black/10 dark:focus:ring-white/20 transition";

  const labelClass = "mb-1.5 block text-sm text-zinc-700 dark:text-zinc-300";

  return (
    <div className="min-h-[100dvh] grid place-items-center bg-gradient-to-b from-zinc-50 to-white dark:from-black dark:to-zinc-950 px-6">
      <div className="w-full max-w-xl rounded-2xl border border-zinc-200/70 dark:border-zinc-800/70 bg-white/70 dark:bg-zinc-900/70 backdrop-blur p-8 shadow-lg">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 h-12 w-12 rounded-2xl grid place-items-center bg-zinc-900 text-white dark:bg-white dark:text-black shadow">
            {/* Minimal brand glyph */}
            <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden>
              <path
                fill="currentColor"
                d="M12 2l3.5 6.9L23 10l-5.5 4.8L19 22l-7-3.8L5 22l1.5-7.2L1 10l7.5-1.1L12 2z"
              />
            </svg>
          </div>
          <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
            Create your workspace
          </h1>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            Spin up a secure tenant with admin access in seconds.
          </p>
        </div>

        <form onSubmit={onSubmit} className="space-y-5">
          <div className="grid gap-5 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className={labelClass}>Organization / Company</label>
              <input
                className={inputClass}
                placeholder="e.g., Genius Infravision LLP"
                value={form.org}
                onChange={onChange("org")}
                autoComplete="organization"
                required
              />
            </div>

            <div>
              <label className={labelClass}>Your name</label>
              <input
                className={inputClass}
                placeholder="e.g., Dr. Sahid Cholayil"
                value={form.name}
                onChange={onChange("name")}
                autoComplete="name"
                required
              />
            </div>

            <div>
              <label className={labelClass}>Work email</label>
              <input
                className={inputClass}
                type="email"
                placeholder="you@company.com"
                value={form.email}
                onChange={onChange("email")}
                autoComplete="email"
                inputMode="email"
                required
              />
            </div>

            <div className="sm:col-span-2">
              <label className={labelClass}>Password</label>
              <div className="relative">
                <input
                  className={`${inputClass} pr-12`}
                  type={showPw ? "text" : "password"}
                  placeholder="At least 12 characters, A-Z, a-z, 0-9, symbol"
                  value={form.password}
                  onChange={onChange("password")}
                  autoComplete="new-password"
                  required
                />
                <button
                  type="button"
                  aria-label={showPw ? "Hide password" : "Show password"}
                  onClick={() => setShowPw((s) => !s)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-md px-2 py-1 text-xs font-medium text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                >
                  {showPw ? "Hide" : "Show"}
                </button>
              </div>

              {/* Strength meter */}
              <div className="mt-3">
                <div className="h-2 w-full rounded-full bg-zinc-200 dark:bg-zinc-800 overflow-hidden">
                  <div
                    className={[
                      "h-full transition-all",
                      score === 0 && "w-0",
                      score === 1 && "w-1/4",
                      score === 2 && "w-2/4",
                      score === 3 && "w-3/4",
                      score === 4 && "w-full",
                      score <= 1
                        ? "bg-red-500/80"
                        : score === 2
                        ? "bg-yellow-500/80"
                        : score === 3
                        ? "bg-lime-500/80"
                        : "bg-emerald-500/90",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                  />
                </div>
                <div className="mt-1.5 flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400">
                  <span>
                    {score <= 1
                      ? "Weak"
                      : score === 2
                      ? "Fair"
                      : score === 3
                      ? "Strong"
                      : "Very strong"}
                  </span>
                  <span className="hidden sm:inline">
                    Tip: Try something like <code className="font-mono">GeniusGrid#ERP19</code>
                  </span>
                </div>
              </div>

              {/* Inline requirements / backend reasons */}
              {pwReasons.length > 0 && (
                <ul className="mt-3 space-y-1.5 text-xs text-red-600 dark:text-red-400">
                  {pwReasons.map((r, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="mt-[3px] inline-block h-1.5 w-1.5 rounded-full bg-red-500/80" />
                      <span>{r}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {/* Submit */}
          <button
            className={[
              "w-full rounded-xl py-2.5 font-medium transition",
              "bg-black text-white hover:bg-black/90",
              "dark:bg-white dark:text-black dark:hover:bg-white/90",
              "disabled:opacity-60 disabled:pointer-events-none",
              "shadow-sm",
            ].join(" ")}
            disabled={!canSubmit || loading}
            type="submit"
          >
            {loading ? "Creating your workspace…" : "Start Free"}
          </button>

          {/* Alerts */}
          {err && (
            <p className="text-sm mt-2 text-red-600 dark:text-red-400" role="alert">
              {String(err)}
            </p>
          )}
          {ok && (
            <p className="text-sm mt-2 text-emerald-600 dark:text-emerald-400" role="status">
              Workspace created. Redirecting…
            </p>
          )}

          {/* Small legal / reassurance */}
          <p className="text-[11px] mt-4 text-zinc-500 dark:text-zinc-400">
            By continuing you acknowledge our standard tenant provisioning. Admin access is granted
            to the creator and can be delegated later.
          </p>
        </form>
      </div>
    </div>
  );
}
