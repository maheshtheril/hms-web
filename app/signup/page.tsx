"use client";

import React, { useEffect, useRef, useState } from "react";
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
   Password strength helper
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
   Flag helper
   ----------------------- */
function iso2ToFlag(iso2?: string) {
  if (!iso2) return "";
  const s = iso2.toUpperCase().trim();
  if (s.length !== 2) return "";
  try {
    return s
      .split("")
      .map((c) => String.fromCodePoint(127397 + c.charCodeAt(0)))
      .join("");
  } catch {
    return "";
  }
}

interface Country {
  id: string;
  name: string;
  iso2?: string;
  flag?: string | null;
}

/* -----------------------
   Country Select
   ----------------------- */
function CountrySelect({
  countries,
  value,
  onChange,
  placeholder = "Select country (optional)",
}: {
  countries: Country[];
  value: string | "";
  onChange: (id: string) => void;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const ref = useRef<HTMLDivElement | null>(null);
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const listRef = useRef<HTMLUListElement | null>(null);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!ref.current) return;
      if (!ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const filtered = countries.filter(
    (c) =>
      c.name.toLowerCase().includes(query.toLowerCase()) ||
      (c.iso2 || "").toLowerCase().includes(query.toLowerCase())
  );

  const selected = countries.find((c) => c.id === value) ?? null;

  const preferSvgFallback = false;

  function flagForCountry(c: Country) {
    const dbFlag = (c.flag || "").trim();
    if (dbFlag) return dbFlag;
    const emoji = iso2ToFlag(c.iso2);
    if (emoji && !preferSvgFallback) return emoji;
    return null;
  }

  function handleSelect(c: Country) {
    onChange(c.id);
    setOpen(false);
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setOpen(true);
      const firstItem = listRef.current?.querySelector<HTMLButtonElement>(
        "button[data-index='0']"
      );
      firstItem?.focus();
    } else if (e.key === "Escape") {
      setOpen(false);
      buttonRef.current?.focus();
    }
  }

  return (
    <div ref={ref} className="relative z-20 w-full">
      {/* Trigger box */}
      <button
        ref={buttonRef}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        onKeyDown={onKeyDown}
        className="w-full text-left rounded-2xl px-3 py-2 flex items-center gap-3 border border-white/10 bg-white/3 backdrop-blur-sm shadow-lg"
      >
        <div className="flex items-center gap-3">
          <span className="text-lg leading-none">
            {selected ? (
              <>
                <span aria-hidden className="mr-2">
                  {flagForCountry(selected) ?? (
                    selected.iso2 ? (
                      <img
                        src={`https://flagcdn.com/w20/${selected.iso2.toLowerCase()}.png`}
                        alt=""
                        className="inline-block w-5 h-4 rounded-sm object-cover"
                      />
                    ) : null
                  )}
                </span>
                <span className="text-sm font-medium text-white/95">
                  {selected.name}
                </span>
              </>
            ) : (
              <span className="text-sm text-white/60">{placeholder}</span>
            )}
          </span>
        </div>

        <div className="ml-auto text-white/50 text-xs">
          {open ? "⌃" : "⌄"}
        </div>
      </button>

      {open && (
        <div className="absolute mt-2 w-full rounded-2xl bg-gradient-to-b from-white/4 to-white/3 border border-white/10 shadow-2xl backdrop-blur-md max-h-64 overflow-hidden">
          <div className="p-2">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search country..."
              className="w-full rounded-xl px-3 py-2 bg-transparent border border-white/6 placeholder:text-white/40 text-white/90 outline-none"
            />
          </div>

          <ul
            role="listbox"
            ref={listRef}
            tabIndex={-1}
            className="overflow-auto max-h-48"
          >
            {filtered.length === 0 ? (
              <li className="px-3 py-2 text-xs text-white/50">No countries match.</li>
            ) : (
              filtered.map((c, i) => {
                const f = flagForCountry(c);
                return (
                  <li key={c.id} className="px-2">
                    <button
                      data-index={i}
                      type="button"
                      onClick={() => handleSelect(c)}
                      className={`w-full text-left flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/6 transition ${
                        c.id === value ? "bg-white/6" : ""
                      }`}
                    >
                      <span className="w-6 text-lg leading-none">
                        {f ?? (c.iso2 ? (
                          <img
                            src={`https://flagcdn.com/w20/${c.iso2.toLowerCase()}.png`}
                            alt={`${c.name} flag`}
                            className="inline-block w-5 h-4 rounded-sm object-cover"
                          />
                        ) : (
                          <span className="text-white/40 text-sm">
                            {(c.iso2 || "").toUpperCase()}
                          </span>
                        ))}
                      </span>
                      <span className="text-sm text-white/90">{c.name}</span>
                      <span className="ml-auto text-xs text-white/50">
                        {c.iso2?.toUpperCase() || ""}
                      </span>
                    </button>
                  </li>
                );
              })
            )}
          </ul>
        </div>
      )}
    </div>
  );
}

/* -----------------------
   Signup page
   ----------------------- */
export default function SignupPage() {
  const router = useRouter();
  const [form, setForm] = useState({ org: "", name: "", email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [ok, setOk] = useState(false);

  const [pwServerReasons, setPwServerReasons] = useState<string[] | null>(null);
  const [emailAvailable, setEmailAvailable] = useState<boolean | null>(null);
  const [checkingEmail, setCheckingEmail] = useState(false);
  const debouncedEmail = useDebouncedValue(form.email, 450);

  const { passed: passwordPassed } = usePasswordStrength(form.password);

  const [countries, setCountries] = useState<Country[]>([]);
  const [countryId, setCountryId] = useState<string | "">("");
  const [applyCountryDefaults, setApplyCountryDefaults] = useState(true);
  const [loadingCountries, setLoadingCountries] = useState(false);

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
        const res = await api.get("/api/check-email", {
          params: { email: debouncedEmail },
        });
        if (cancelled) return;
        setEmailAvailable(!res.data?.exists);
      } catch {
        setEmailAvailable(null);
      } finally {
        setCheckingEmail(false);
      }
    }
    check();
    return () => { cancelled = true };
  }, [debouncedEmail]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoadingCountries(true);
      try {
        const res = await api.get("/api/global/countries", {
          params: { active: "true" },
        });
        if (cancelled) return;
        const list = Array.isArray(res.data?.data) ? res.data.data : [];
        setCountries(list);
        const india = list.find((c: any) => (c.iso2 || "").toUpperCase() === "IN");
        setCountryId(india ? india.id : (list[0]?.id ?? ""));
      } catch {}
      finally {
        if (!cancelled) setLoadingCountries(false);
      }
    }
    load();
    return () => { cancelled = true };
  }, []);

  const onChange =
    (k: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm((f) => ({ ...f, [k]: e.target.value }));

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;

    setErr("");
    setPwServerReasons(null);

    if (!/^\S+@\S+\.\S+$/.test(form.email)) {
      setErr("Please enter a valid email address.");
      return;
    }
    if (emailAvailable === false) {
      setErr("That email is already registered.");
      return;
    }
    if (passwordPassed < passwordRules.length) {
      setErr("Please meet all password requirements.");
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
        try {
          await api.get("/api/auth/me");
        } catch {}

        setTimeout(() => router.push("/dashboard"), 800);
      } else {
        setErr(res.data?.error || "Signup failed");
      }
    } catch (err: any) {
      if (err.response) {
        const data = err.response.data;
        const status = err.response.status;

        if (status === 400 && data?.error === "weak_password") {
          setPwServerReasons(data.reasons || []);
          setErr("Password does not meet requirements.");
        } else if (status === 409 && data?.error === "email_exists") {
          setEmailAvailable(false);
          setErr("That email is already registered.");
        } else {
          setErr(data?.error || `Signup failed (${status}).`);
        }
      } else if (err.request) {
        setErr("No response from server.");
      } else {
        setErr("Unexpected error.");
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
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="text-center mb-6">
              <div className="flex justify-center items-center gap-2">
                <h1 className="text-3xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-sky-300 via-indigo-400 to-sky-300">
                  Create your workspace
                </h1>
                <AIBadge />
              </div>
              <p className="mt-2 text-sm text-white/70">
                Spin up a secure tenant with AI-powered onboarding.
              </p>
            </div>

            <form onSubmit={handleSignup} className="space-y-4">
              <div>
                <label className="text-xs font-medium text-white/70">Organization / Company</label>
                <input
                  placeholder="Organization / Company"
                  className="w-full rounded-xl bg-white/5 border border-white/10 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-sky-400/40"
                  value={form.org}
                  onChange={(e) => setForm((f) => ({ ...f, org: e.target.value }))}
                  required
                />
              </div>

              <div>
                <label className="text-xs font-medium text-white/70">Country</label>
                <CountrySelect
                  countries={countries}
                  value={countryId}
                  onChange={(id) => setCountryId(id)}
                />
              </div>

              <div className="flex items-center gap-3">
                <input
                  id="applyCountryDefaults"
                  type="checkbox"
                  checked={applyCountryDefaults}
                  onChange={(e) => setApplyCountryDefaults(e.target.checked)}
                  className="w-4 h-4 rounded"
                />
                <label htmlFor="applyCountryDefaults" className="text-xs text-white/70">
                  Apply country tax defaults
                </label>
              </div>

              <div>
                <label className="text-xs font-medium text-white/70">Your name</label>
                <input
                  placeholder="Your name"
                  className="w-full rounded-xl bg-white/5 border border-white/10 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-sky-400/40"
                  value={form.name}
                  onChange={onChange("name")}
                  required
                />
              </div>

              <div>
                <label className="text-xs font-medium text-white/70">Work email</label>
                <input
                  type="email"
                  placeholder="you@company.com"
                  className="w-full rounded-xl bg-white/5 border border-white/10 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-sky-400/40"
                  value={form.email}
                  onChange={onChange("email")}
                  required
                />
              </div>

              <div>
                <label className="text-xs font-medium text-white/70">Password</label>
                <input
                  type="password"
                  placeholder="Password"
                  className="w-full rounded-xl bg-white/5 border border-white/10 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-sky-400/40"
                  value={form.password}
                  onChange={onChange("password")}
                  required
                />
                <PasswordStrength value={form.password} />
              </div>

              {err && <p className="text-sm text-red-400">{err}</p>}
              {ok && <p className="text-sm text-emerald-400">Workspace created — redirecting…</p>}

              <PrimaryButton type="submit" disabled={!canSubmit || loading}>
                {loading ? "Creating workspace…" : "Start Free"}
              </PrimaryButton>
            </form>

            <div className="mt-6 border-t border-white/10 pt-5 text-center">
              <p className="text-xs text-white/60 mb-2">Already have an account?</p>
              <a
                href="/login"
                className="inline-block w-full rounded-xl border border-white/20 bg-white/5 px-4 py-2.5 text-sm font-medium text-white/90 hover:bg-white/10 transition"
              >
                Back to Login
              </a>
            </div>
          </motion.div>
        </AuthCard>
      </div>
    </div>
  );
}
