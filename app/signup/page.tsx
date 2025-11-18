"use client";

import React, {
  useEffect,
  useState,
  useRef,
  useMemo,
  useCallback,
} from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import { motion } from "framer-motion";

import BrandLogo from "@/components/BrandLogo";
import AuthCard from "@/components/AuthCard";
import PrimaryButton from "@/components/PrimaryButton";
import AIBadge from "@/components/AIBadge";
import NeuralGlow from "@/components/NeuralGlow";

const api = axios.create({ baseURL: "", withCredentials: true });

/* ===========================================================
   UTILITIES
   =========================================================== */

export interface Country {
  id: string;
  name: string;
  iso2?: string | null;
  flag?: string | null;
}

function normIso2(i?: string | null): string {
  return (i ?? "")
    .toString()
    .replace(/[^A-Za-z]/g, "")
    .trim()
    .slice(0, 2)
    .toUpperCase();
}

function iso2ToFlag(iso2?: string | null): string {
  const s = normIso2(iso2);
  if (s.length !== 2) return "";
  return Array.from(s)
    .map((c) => String.fromCodePoint(127397 + c.charCodeAt(0)))
    .join("");
}

function extractEmoji(raw?: string | null): string | null {
  if (!raw) return null;
  const cleaned = raw.replace(/[\u200B-\u200F\uFEFF\s]+/g, "").trim();
  if (!cleaned) return null;

  // Regional indicators
  const reg = /(\uD83C[\uDDE6-\uDDFF]){2}/u;
  const match = cleaned.match(reg);
  if (match) return match[0];

  // Short emoji fallback
  if ([...cleaned].length <= 4) return cleaned;

  return null;
}

function countryFlag(c: Country): string {
  return (
    extractEmoji(c.flag) ||
    iso2ToFlag(c.iso2) ||
    "🌐"
  );
}

/* ===========================================================
   DEBOUNCE
   =========================================================== */

function useDebounced<T>(value: T, delay = 200) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return v;
}

/* ===========================================================
   COUNTRY SELECT — PERFECT FINAL VERSION
   =========================================================== */

function CountrySelect({
  countries,
  value,
  onChange,
}: {
  countries: Country[];
  value: string | null | undefined;
  onChange: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);

  const listRef = useRef<HTMLUListElement | null>(null);
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  /* Close on outside click */
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (!containerRef.current) return;
      if (!containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const deb = useDebounced(query, 150);

  const filtered = useMemo(() => {
    const q = deb.toLowerCase();
    if (!q) return countries;
    return countries.filter((c) =>
      c.name.toLowerCase().includes(q) ||
      (c.iso2 ?? "").toLowerCase().includes(q)
    );
  }, [deb, countries]);

  const selected = countries.find((c) => c.id === value) || null;

  const move = (i: number) => {
    const safe = Math.max(0, Math.min(i, filtered.length - 1));
    setActive(safe);
    requestAnimationFrame(() => {
      const el = listRef.current?.querySelector(
        `[data-i='${safe}']`
      ) as HTMLButtonElement | null;
      el?.focus();
    });
  };

  const openDropdown = () => {
    setOpen(true);
    setTimeout(() => move(0), 1);
  };

  return (
    <div ref={containerRef} className="relative w-full z-50">
      <button
        ref={buttonRef}
        type="button"
        className="w-full rounded-2xl px-3 py-2 flex items-center gap-3 
                   bg-white/10 backdrop-blur-xl border border-white/10 shadow-lg"
        onClick={() => (open ? setOpen(false) : openDropdown())}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") {
            e.preventDefault();
            openDropdown();
          }
        }}
      >
        {selected ? (
          <>
            <span className="text-2xl w-8 select-none leading-normal">
              {countryFlag(selected)}
            </span>
            <span className="text-sm text-white/90">
              {selected.name}
            </span>
          </>
        ) : (
          <span className="text-sm text-white/60">
            Select country
          </span>
        )}
        <span className="ml-auto text-white/50 text-xs">{open ? "⌃" : "⌄"}</span>
      </button>

      {open && (
        <div className="absolute mt-2 w-full rounded-2xl bg-[#0f172a]/80 backdrop-blur-xl
                        border border-white/10 shadow-2xl max-h-64 overflow-hidden">
          <div className="p-2">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full px-3 py-2 bg-white/5 border border-white/20 rounded-xl
                         outline-none text-sm placeholder:text-white/40"
              placeholder="Search country…"
            />
          </div>

          <ul
            ref={listRef}
            tabIndex={-1}
            className="max-h-48 overflow-auto space-y-1 p-1"
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") {
                e.preventDefault();
                move(active + 1);
              }
              if (e.key === "ArrowUp") {
                e.preventDefault();
                move(active - 1);
              }
              if (e.key === "Enter") {
                e.preventDefault();
                const c = filtered[active];
                if (c) {
                  onChange(c.id);
                  setOpen(false);
                }
              }
            }}
          >
            {filtered.map((c, i) => (
              <li key={c.id}>
                <button
                  data-i={i}
                  type="button"
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg 
                              ${c.id === value ? "bg-white/10" : "hover:bg-white/10"}`}
                  onClick={() => {
                    onChange(c.id);
                    setOpen(false);
                  }}
                  onFocus={() => setActive(i)}
                >
                  <span className="text-2xl w-8 leading-normal select-none">
                    {countryFlag(c)}
                  </span>
                  <span className="text-sm text-white/90">{c.name}</span>
                  <span className="ml-auto text-xs text-white/40">
                    {normIso2(c.iso2)}
                  </span>
                </button>
              </li>
            ))}

            {filtered.length === 0 && (
              <li className="px-3 py-2 text-xs text-white/50">
                No countries match.
              </li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}

/* ===========================================================
   PASSWORD STRENGTH
   =========================================================== */

const PASSWORD_POLICY = {
  minLength: 12,
  requireUpper: true,
  requireLower: true,
  requireDigit: true,
  requireSymbol: true,
  symbolRegex: /[^A-Za-z0-9]/,
};

const passwordRules = [
  { test: (p: string) => p.length >= PASSWORD_POLICY.minLength, label: "At least 12 characters" },
  { test: (p: string) => /[A-Z]/.test(p), label: "One uppercase letter" },
  { test: (p: string) => /[a-z]/.test(p), label: "One lowercase letter" },
  { test: (p: string) => /\d/.test(p), label: "One number" },
  { test: (p: string) => PASSWORD_POLICY.symbolRegex.test(p), label: "One special symbol" },
];

function usePasswordStrength(password: string) {
  const passedRules = passwordRules.map((r) => r.test(password));
  const passed = passedRules.filter(Boolean).length;
  const strengthLabel =
    ["Very weak", "Weak", "Fair", "Good", "Strong", "Very strong"][passed] ||
    "Very weak";

  return { passed, strengthLabel, passedRules };
}

function PasswordStrength({ value }: { value: string }) {
  const { passed, strengthLabel, passedRules } = usePasswordStrength(value);

  return (
    <div className="mt-2">
      <div className="flex justify-between text-xs text-white/70 mb-1">
        <span>Strength: <strong>{strengthLabel}</strong></span>
        <span className="text-white/50">{passed}/5</span>
      </div>

      <div className="flex gap-1 h-2 mb-2">
        {passwordRules.map((_, i) => (
          <div
            key={i}
            className={`flex-1 rounded ${passedRules[i] ? "bg-emerald-400" : "bg-white/10"}`}
          />
        ))}
      </div>
    </div>
  );
}

/* ===========================================================
   SIGNUP PAGE
   =========================================================== */

export default function SignupPage() {
  const router = useRouter();

  const [form, setForm] = useState({
    org: "",
    name: "",
    email: "",
    password: "",
  });

  const [emailAvailable, setEmailAvailable] = useState<boolean | null>(null);
  const [checkingEmail, setCheckingEmail] = useState(false);

  const [countries, setCountries] = useState<Country[]>([]);
  const [countryId, setCountryId] = useState<string>("");

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [ok, setOk] = useState(false);

  const debouncedEmail = useDebounced(form.email, 350);

  /* Load countries */
  useEffect(() => {
    async function load() {
      try {
        const res = await api.get("/api/global/countries", {
          params: { active: "true" },
        });

        const raw = Array.isArray(res.data?.data) ? res.data.data : [];

        const list: Country[] = raw.map((c: any, idx: number) => ({
          id: String(c.id ?? c.uuid ?? idx),
          name: String(c.name ?? ""),
          iso2: normIso2(c.iso2),
          flag: c.flag ?? c.emoji ?? null,
        }));

        setCountries(list);

        const india = list.find((x) => x.iso2 === "IN");
        setCountryId(india?.id || list[0]?.id || "");
      } catch (e) {
        console.error("Failed loading countries", e);
      }
    }
    load();
  }, []);

  /* Email availability check */
  useEffect(() => {
    if (!debouncedEmail || !/\S+@\S+\.\S+/.test(debouncedEmail)) {
      setEmailAvailable(null);
      return;
    }

    async function check() {
      setCheckingEmail(true);
      try {
        const res = await api.get("/api/check-email", {
          params: { email: debouncedEmail },
        });
        setEmailAvailable(!res.data?.exists);
      } catch {
        setEmailAvailable(null);
      } finally {
        setCheckingEmail(false);
      }
    }

    check();
  }, [debouncedEmail]);

  const { passed: pwPassed } = usePasswordStrength(form.password);

  const canSubmit =
    form.org &&
    form.name &&
    form.email &&
    form.password &&
    pwPassed === passwordRules.length &&
    emailAvailable !== false;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;

    setErr("");
    setLoading(true);

    try {
      const payload = {
        ...form,
        country_id: countryId || undefined,
      };

      const res = await api.post("/api/tenant-signup", payload);

      if (res.status === 201 || res.data?.ok) {
        setOk(true);
        setTimeout(() => router.push("/dashboard"), 800);
      } else {
        setErr(res.data?.error || "Signup failed");
      }
    } catch (err: any) {
      setErr("Signup failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center 
                    bg-linear-to-b from-sky-900/8 via-indigo-900/8 to-sky-900/8 
                    text-white overflow-hidden px-6">

      <div className="absolute inset-0 bg-linear-to-b 
                      from-white/4 via-white/6 to-white/4 pointer-events-none" />

      <div className="absolute -top-40 left-1/2 -translate-x-1/2 pointer-events-none z-0">
        <NeuralGlow size={680} intensity={0.65}
          colorA="#7dd3fc" colorB="#6366f1" colorC="#a78bfa" />
      </div>

      <div className="relative z-10 w-full max-w-[980px] flex flex-col items-center">
        <div className="mb-6">
          <div className="flex h-36 w-36 items-center justify-center rounded-full 
                          bg-white/6 backdrop-blur-sm shadow-2xl p-2">
            <BrandLogo size={8} pulse />
          </div>
        </div>

        <AuthCard className="w-full max-w-xl">
          <motion.div
            initial={{ opacity: 0, y: 28 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            <div className="text-center mb-6">
              <div className="flex justify-center items-center gap-2">
                <h1 className="text-3xl font-extrabold text-transparent bg-clip-text 
                               bg-linear-to-r from-sky-300 via-indigo-400 to-sky-300">
                  Create your workspace
                </h1>
                <AIBadge />
              </div>
              <p className="text-sm text-white/70 mt-2">
                Spin up a secure tenant with AI-powered onboarding.
              </p>
            </div>

            <form onSubmit={submit} className="space-y-4">
              {/* Org */}
              <div>
                <label className="text-xs text-white/70">Organization</label>
                <input
                  className="w-full rounded-xl bg-white/5 border border-white/10 
                             px-3 py-2 text-sm outline-none focus:ring-2 
                             focus:ring-sky-400/40"
                  value={form.org}
                  onChange={(e) => setForm({ ...form, org: e.target.value })}
                  required
                />
              </div>

              {/* Country */}
              <div>
                <label className="text-xs text-white/70">Country</label>
                <CountrySelect
                  countries={countries}
                  value={countryId}
                  onChange={(id) => setCountryId(id)}
                />
                <p className="text-xs text-white/50 mt-2">
                  Country helps us pre-apply local defaults.
                </p>
              </div>

              {/* Name */}
              <div>
                <label className="text-xs text-white/70">Your name</label>
                <input
                  className="w-full rounded-xl bg-white/5 border border-white/10 
                             px-3 py-2 text-sm outline-none focus:ring-2 
                             focus:ring-sky-400/40"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                />
              </div>

              {/* Email */}
              <div>
                <label className="text-xs text-white/70">Work email</label>
                <input
                  type="email"
                  className="w-full rounded-xl bg-white/5 border border-white/10 
                             px-3 py-2 text-sm outline-none focus:ring-2 
                             focus:ring-sky-400/40"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  required
                />
                <div className="text-xs mt-2">
                  {checkingEmail ? (
                    <span className="text-white/60">Checking…</span>
                  ) : emailAvailable === null ? (
                    <span className="text-white/50">Enter a valid email.</span>
                  ) : emailAvailable ? (
                    <span className="text-emerald-300">Available ✓</span>
                  ) : (
                    <span className="text-amber-400">Already registered</span>
                  )}
                </div>
              </div>

              {/* Password */}
              <div>
                <label className="text-xs text-white/70">Password</label>
                <input
                  type="password"
                  className="w-full rounded-xl bg-white/5 border border-white/10 
                             px-3 py-2 text-sm outline-none focus:ring-2 
                             focus:ring-sky-400/40"
                  value={form.password}
                  onChange={(e) =>
                    setForm({ ...form, password: e.target.value })
                  }
                  required
                />

                <PasswordStrength value={form.password} />
              </div>

              {err && (
                <p className="text-red-400 text-sm">{err}</p>
              )}

              {ok && (
                <p className="text-emerald-400 text-sm">
                  Workspace created — redirecting…
                </p>
              )}

              <PrimaryButton disabled={!canSubmit || loading}>
                {loading ? "Creating…" : "Start Free"}
              </PrimaryButton>
            </form>

            <div className="mt-6 border-t border-white/10 pt-5 text-center">
              <p className="text-xs text-white/60 mb-2">
                Already have an account?
              </p>
              <a
                href="/login"
                className="inline-block w-full rounded-xl border border-white/20 
                           bg-white/5 px-4 py-2.5 text-sm font-medium text-white/90 
                           hover:bg-white/10 transition"
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
