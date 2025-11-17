// app/signup/page.tsx
"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import { motion } from "framer-motion";
import BrandLogo from "@/components/BrandLogo";
import AuthCard from "@/components/AuthCard";
import PrimaryButton from "@/components/PrimaryButton";
import AIBadge from "@/components/AIBadge";
import NeuralGlow from "@/components/NeuralGlow";

const api = axios.create({ baseURL: "", withCredentials: true });

/* -----------------------
   Password strength helper (matches backend policy)
   ----------------------- */
const PASSWORD_POLICY = {
  minLength: 12,
  requireUpper: true,
  requireLower: true,
  requireDigit: true,
  requireSymbol: true,
  symbolRegex: /[^A-Za-z0-9]/,
};

const passwordRules = [
  { test: (p: string) => p.length >= PASSWORD_POLICY.minLength, label: `At least ${PASSWORD_POLICY.minLength} characters` },
  { test: (p: string) => /[A-Z]/.test(p), label: "One uppercase letter" },
  { test: (p: string) => /[a-z]/.test(p), label: "One lowercase letter" },
  { test: (p: string) => /\d/.test(p), label: "One number" },
  { test: (p: string) => PASSWORD_POLICY.symbolRegex.test(p), label: "One special symbol" },
];

function usePasswordStrength(password: string) {
  const passedRules = passwordRules.map((r) => r.test(password));
  const passed = passedRules.reduce((acc, v) => acc + (v ? 1 : 0), 0);
  const strengthLabel = ["Very weak", "Weak", "Fair", "Good", "Strong", "Very strong"][passed] || "Very weak";
  return { passed, strengthLabel, passedRules };
}

function PasswordStrength({ value }: { value: string }) {
  const { passed, strengthLabel, passedRules } = usePasswordStrength(value);
  return (
    <div className="mt-2" aria-live="polite">
      <div className="flex items-center justify-between text-xs text-white/70 mb-2">
        <span>
          Password strength: <strong>{strengthLabel}</strong>
        </span>
        <span className="text-xs text-white/50">{passed}/{passwordRules.length}</span>
      </div>

      <div className="flex gap-1 h-2 mb-2">
        {Array.from({ length: passwordRules.length }).map((_, i) => (
          <div
            key={i}
            className={`flex-1 rounded ${passedRules[i] ? "bg-emerald-400" : "bg-white/10"}`}
            aria-hidden
          />
        ))}
      </div>

      <ul className="mt-1 text-xs text-white/60 list-disc list-inside space-y-1">
        {passwordRules.map((r, i) => (
          <li key={i} className={passedRules[i] ? "text-emerald-300" : "text-white/50"}>
            {r.label}
          </li>
        ))}
      </ul>
    </div>
  );
}

/* -----------------------
   Debounce helper
   ----------------------- */
function useDebouncedValue<T>(value: T, ms = 400) {
  const [deb, setDeb] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDeb(value), ms);
    return () => clearTimeout(id);
  }, [value, ms]);
  return deb;
}

/* -----------------------
   small helper: ISO2 -> emoji flag
   returns empty string if iso2 missing / invalid
   ----------------------- */
function iso2ToFlag(iso2?: string) {
  if (!iso2) return "";
  const s = iso2.toUpperCase();
  if (s.length !== 2) return "";
  return s
    .split("")
    .map((c) => String.fromCodePoint(127397 + c.charCodeAt(0)))
    .join("");
}

/* -----------------------
   Signup page
   ----------------------- */
interface Country {
  id: string;
  name: string;
  iso2?: string;
}

export default function SignupPage() {
  const router = useRouter();
  const [form, setForm] = useState({ org: "", name: "", email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [ok, setOk] = useState(false);

  // server-provided password reasons (if weak_password)
  const [pwServerReasons, setPwServerReasons] = useState<string[] | null>(null);

  // email availability states
  const [emailAvailable, setEmailAvailable] = useState<boolean | null>(null);
  const [checkingEmail, setCheckingEmail] = useState(false);

  const debouncedEmail = useDebouncedValue(form.email, 450);

  // local password strength check
  const { passed: passwordPassed } = usePasswordStrength(form.password);

  // countries state for signup country selector
  const [countries, setCountries] = useState<Country[]>([]);
  const [countryId, setCountryId] = useState<string | "">("");
  const [applyCountryDefaults, setApplyCountryDefaults] = useState<boolean>(true);
  const [loadingCountries, setLoadingCountries] = useState(false);

  // check email availability (debounced)
  useEffect(() => {
    let cancelled = false;
    async function check() {
      setErr("");
      setPwServerReasons(null);
      if (!debouncedEmail || !/^\S+@\S+\.\S+$/.test(debouncedEmail)) {
        setEmailAvailable(null);
        return;
      }
      setCheckingEmail(true);
      try {
        const res = await api.get("/api/check-email", { params: { email: debouncedEmail } });
        if (cancelled) return;
        // expected { exists: boolean }
        setEmailAvailable(!res.data?.exists);
      } catch (e) {
        // network or server issue — don't block signup, but reset availability to unknown
        setEmailAvailable(null);
      } finally {
        setCheckingEmail(false);
      }
    }
    check();
    return () => {
      cancelled = true;
    };
  }, [debouncedEmail]);

  // fetch countries for selector on mount
  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoadingCountries(true);
      try {
        const res = await api.get("/api/global/countries", { params: { active: "true" } });
        if (cancelled) return;
        const list = Array.isArray(res.data?.data) ? res.data.data : [];
        setCountries(list);
        // default to India if present, otherwise first
        const india = list.find((c: any) => (c.iso2 || "").toUpperCase() === "IN");
        setCountryId(india ? india.id : (list[0]?.id ?? ""));
      } catch (e) {
        console.warn("failed to load countries", e);
      } finally {
        if (!cancelled) setLoadingCountries(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const onChange =
    (k: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm((f) => ({ ...f, [k]: e.target.value }));

  const onCountryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setCountryId(e.target.value || "");
  };

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;
    setErr("");
    setPwServerReasons(null);

    // Client-side pre-checks to give immediate feedback
    if (!/^\S+@\S+\.\S+$/.test(form.email)) {
      setErr("Please enter a valid email address.");
      return;
    }
    if (emailAvailable === false) {
      setErr("That email is already registered. Try signing in or use another email.");
      return;
    }
    if (passwordPassed < passwordRules.length) {
      setErr("Please meet all password requirements before continuing.");
      return;
    }

    setLoading(true);
    try {
      const payload = {
        ...form,
        country_id: countryId || undefined,
        apply_country_tax_defaults: Boolean(applyCountryDefaults),
      };
      const res = await api.post("/api/tenant-signup", payload);
      if (res.status === 201 || res.data?.ok) {
        setOk(true);

        // ensure session is established before redirecting
        try {
          await api.get("/api/auth/me");
        } catch (e) {
          console.warn("post-signup session check failed", e);
        }

        // small delay to show success then navigate
        setTimeout(() => router.push("/dashboard"), 800);
      } else {
        setErr(res.data?.error || "Signup failed");
      }
    } catch (err: any) {
      if (err.response) {
        const data = err.response.data || {};
        const status = err.response.status;

        if (status === 400 && data?.error === "weak_password" && Array.isArray(data.reasons)) {
          setPwServerReasons(data.reasons);
          setErr("Password does not meet requirements.");
        } else if (status === 409 && data?.error === "email_exists") {
          setEmailAvailable(false);
          setErr("That email is already registered. Try signing in or use another email.");
        } else if (status === 400 && data?.error === "missing_fields" && data.fields) {
          const missing = Object.keys(data.fields).filter((k) => !data.fields[k]);
          setErr(`Missing required fields: ${missing.join(", ")}`);
        } else if (status === 400 && data?.error === "invalid_email") {
          setErr("Please enter a valid email address.");
        } else if (status === 409 && data?.error === "unique_violation") {
          setErr("Signup conflict (unique constraint). Try different values.");
        } else {
          setErr(typeof data?.error === "string" ? data.error : `Signup failed (${status}).`);
        }
      } else if (err.request) {
        setErr("No response from server. Check your network or try again later.");
      } else {
        setErr("Unexpected error. Try again.");
      }
    } finally {
      setLoading(false);
    }
  }

  const canSubmit =
    Boolean(form.org && form.name && form.email && form.password) &&
    passwordPassed === passwordRules.length &&
    emailAvailable !== false;

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-black text-white overflow-hidden px-6">
      <div className="absolute inset-0 bg-gradient-to-b from-black via-zinc-950 to-black" />
      <div className="absolute -top-36 left-1/2 -translate-x-1/2 pointer-events-none z-0">
        <NeuralGlow size={680} intensity={0.8} colorA="#7dd3fc" colorB="#6366f1" colorC="#a78bfa" />
      </div>

      <div className="relative z-10 flex flex-col items-center px-6 w-full max-w-[980px]">
        <div className="mb-6 flex items-center justify-center">
          <div className="relative z-10 flex h-36 w-36 items-center justify-center rounded-full bg-white/6 p-2 shadow-2xl backdrop-blur-sm">
            <BrandLogo size={8} pulse />
          </div>
        </div>

        <AuthCard className="w-full max-w-xl">
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <div className="text-center mb-6">
              <div className="flex justify-center items-center gap-2">
                <h1 className="text-3xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-sky-300 via-indigo-400 to-sky-300">
                  Create your workspace
                </h1>
                <AIBadge />
              </div>
              <p className="mt-2 text-sm text-white/70">Spin up a secure tenant with AI-powered onboarding.</p>
            </div>

            <form onSubmit={handleSignup} className="space-y-4" aria-label="Signup form">
              {/* Organization */}
              <div>
                <label htmlFor="org" className="text-xs font-medium text-white/70">Organization / Company</label>
                <input id="org" name="org" placeholder="Organization / Company" className="w-full rounded-xl bg-white/5 border border-white/10 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-sky-400/40" value={form.org} onChange={onChange("org")} required />
              </div>

              {/* Country selector */}
              <div>
                <label htmlFor="country" className="text-xs font-medium text-white/70">Country</label>
                <select
                  id="country"
                  name="country"
                  value={countryId}
                  onChange={onCountryChange}
                  className="w-full rounded-xl bg-white/5 border border-white/10 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-sky-400/40"
                >
                  <option value="">{loadingCountries ? "Loading countries…" : "Select country (optional)"}</option>
                  {countries.map((c) => (
                    <option key={c.id} value={c.id}>
                      {iso2ToFlag(c.iso2)} {c.name}
                    </option>
                  ))}
                </select>
                <div className="mt-2 text-xs text-white/50">Selecting a country lets us preapply local tax defaults for your company.</div>
              </div>

              {/* Apply country defaults */}
              <div className="flex items-center gap-3">
                <input
                  id="applyCountryDefaults"
                  type="checkbox"
                  checked={applyCountryDefaults}
                  onChange={(e) => setApplyCountryDefaults(e.target.checked)}
                  className="w-4 h-4 rounded"
                />
                <label htmlFor="applyCountryDefaults" className="text-xs text-white/70">Apply country tax defaults to this company</label>
              </div>

              {/* Name */}
              <div>
                <label htmlFor="name" className="text-xs font-medium text-white/70">Your name</label>
                <input id="name" name="name" placeholder="Your name" className="w-full rounded-xl bg-white/5 border border-white/10 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-sky-400/40" value={form.name} onChange={onChange("name")} required />
              </div>

              {/* Email */}
              <div>
                <label htmlFor="email" className="text-xs font-medium text-white/70">Work email</label>
                <input id="email" name="email" type="email" aria-label="Work email" placeholder="you@company.com" className="w-full rounded-xl bg-white/5 border border-white/10 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-sky-400/40" value={form.email} onChange={onChange("email")} required />
                <div className="mt-2 text-xs">
                  {checkingEmail ? (
                    <span className="text-white/60">Checking email…</span>
                  ) : emailAvailable === null ? (
                    <span className="text-white/50">Enter a valid business email.</span>
                  ) : emailAvailable ? (
                    <span className="text-emerald-300">Email available</span>
                  ) : (
                    <span className="text-amber-400">Email already registered</span>
                  )}
                </div>
              </div>

              {/* Password */}
              <div>
                <label htmlFor="password" className="text-xs font-medium text-white/70">Password</label>
                <input id="password" name="password" type="password" aria-label="Password" placeholder="Password" className="w-full rounded-xl bg-white/5 border border-white/10 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-sky-400/40" value={form.password} onChange={onChange("password")} required />
                <PasswordStrength value={form.password} />
                {/* Server-side password reasons (if returned) */}
                {pwServerReasons && pwServerReasons.length > 0 && (
                  <ul className="mt-2 text-xs text-red-300 list-disc list-inside space-y-1" role="alert">
                    {pwServerReasons.map((r, i) => (
                      <li key={i}>{r}</li>
                    ))}
                  </ul>
                )}
              </div>

              {/* Error or success messages */}
              {err && <p id="signup-error" role="alert" className="text-sm text-red-400 mt-1">{err}</p>}
              {ok && <p role="status" aria-live="polite" className="text-sm text-emerald-400 mt-1">Workspace created — redirecting…</p>}

              <PrimaryButton type="submit" disabled={!canSubmit || loading} aria-busy={loading}>
                {loading ? "Creating workspace…" : "Start Free"}
              </PrimaryButton>
            </form>

            <div className="mt-6 border-t border-white/10 pt-5 text-center">
              <p className="text-xs text-white/60 mb-2">Already have an account?</p>
              <a href="/login" className="inline-block w-full rounded-xl border border-white/20 bg-white/5 px-4 py-2.5 text-sm font-medium text-white/90 hover:bg-white/10 transition">Back to Login</a>
            </div>
          </motion.div>
        </AuthCard>
      </div>
    </div>
  );
}
