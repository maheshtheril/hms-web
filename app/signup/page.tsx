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
        setTimeout(() => router.push("/dashboard"), 350);
      } else {
        setErr(res.data?.error || "Signup failed");
      }
    } catch (e: any) {
      const data = e?.response?.data;
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
    "w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-white placeholder-white/60 outline-none " +
    "focus:ring-2 focus:ring-sky-400/30 transition";
  const labelClass = "mb-1.5 block text-sm text-white/80";

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-b from-black via-zinc-950 to-black text-white">
      {/* ambient background lighting */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-40 right-[-10%] h-[40rem] w-[40rem] rounded-full bg-gradient-to-br from-indigo-700/20 via-sky-600/15 to-transparent blur-3xl opacity-20" />
        <div className="absolute left-1/2 top-0 -translate-x-1/2 h-px w-[80%] bg-gradient-to-r from-transparent via-white/5 to-transparent" />
      </div>

      <div className="relative z-10 mx-auto flex min-h-screen max-w-screen-xl items-center justify-center px-6 py-16">
        <div className="w-full max-w-xl">
          {/* glowing logo with pulse */}
          <div className="mb-6 flex justify-center">
            <div className="relative">
              <div className="absolute -inset-2 rounded-full bg-gradient-to-r from-sky-400/40 via-indigo-500/30 to-transparent blur-[90px] opacity-80 glow-pulse" />
              <div className="relative z-10 flex h-20 w-20 items-center justify-center rounded-full bg-white/5 p-2 shadow-2xl backdrop-blur-sm">
                <img src="/logo.png" alt="GeniusGrid" className="h-16 w-16 rounded-full object-contain" />
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-white/8 bg-white/4 p-8 shadow-2xl backdrop-blur-xl">
            {/* header */}
            <div className="mb-6 text-center">
              <div className="flex items-center justify-center gap-2 mb-2">
                <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight bg-gradient-to-r from-sky-300 via-indigo-400 to-sky-300 bg-clip-text text-transparent">
                  Create your workspace
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

              <p className="text-lg font-semibold text-indigo-300">powered by GeniusGrid AI</p>
              <p className="mt-2 text-sm text-white/70 max-w-md mx-auto">
                Spin up a secure tenant with admin access in seconds. Admin access is granted to the creator and can be delegated later.
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
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-md px-2 py-1 text-xs font-medium text-white/80 hover:bg-white/6"
                    >
                      {showPw ? "Hide" : "Show"}
                    </button>
                  </div>

                  {/* Strength meter */}
                  <div className="mt-3">
                    <div className="h-2 w-full rounded-full bg-white/6 overflow-hidden">
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
                    <div className="mt-1.5 flex items-center justify-between text-xs text-white/60">
                      <span>
                        {score <= 1 ? "Weak" : score === 2 ? "Fair" : score === 3 ? "Strong" : "Very strong"}
                      </span>
                      <span className="hidden sm:inline">
                        Tip: Try something like <code className="font-mono text-xs">GeniusGrid#ERP19</code>
                      </span>
                    </div>
                  </div>

                  {/* Inline requirements / backend reasons */}
                  {pwReasons.length > 0 && (
                    <ul className="mt-3 space-y-1.5 text-xs text-red-400">
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

              <button
                className={[
                  "w-full rounded-xl py-2.5 font-medium transition",
                  "bg-gradient-to-r from-sky-400 to-indigo-500 text-black hover:brightness-95",
                  "disabled:opacity-60 disabled:pointer-events-none",
                ].join(" ")}
                disabled={!canSubmit || loading}
                type="submit"
              >
                {loading ? "Creating workspace…" : "Start Free"}
              </button>

              {err && (
                <p className="text-sm mt-2 text-red-400" role="alert">
                  {String(err)}
                </p>
              )}
              {ok && (
                <p className="text-sm mt-2 text-emerald-400" role="status">
                  Workspace created. Redirecting…
                </p>
              )}

              <p className="text-[11px] mt-4 text-white/60">
                By continuing you acknowledge our standard tenant provisioning. Admin access is granted to the creator and can be delegated later.
              </p>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
