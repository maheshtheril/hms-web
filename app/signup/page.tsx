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

/* -----------------------
   Types + Utilities
   ----------------------- */

export interface Country {
  id: string;
  name: string;
  iso2?: string | null;
  flag?: string | null;
}

type CountrySelectProps = {
  countries: Country[];
  value?: string | null;
  onChange: (id: string) => void;
  placeholder?: string;
  maxItems?: number;
  className?: string;
};

// normalize iso2 and strip weird chars
function normIso2(i?: string | null): string {
  return (i ?? "")
    .toString()
    .replace(/[^A-Za-z]/g, "") // remove invisible / weird chars
    .trim()
    .slice(0, 2)
    .toUpperCase();
}

// ISO -> regional indicator emoji
function iso2ToFlag(iso2?: string | null): string {
  const s = normIso2(iso2);
  if (s.length !== 2) return "";
  return Array.from(s)
    .map((c) => String.fromCodePoint(127397 + c.charCodeAt(0)))
    .join("");
}

// Try extract emoji from DB value (regional indicators or short emoji)
// This function strips zero-width/invisible chars and returns a short emoji
function extractFlagEmoji(raw?: string | null): string | null {
  if (!raw) return null;
  // Remove common invisible characters and whitespace
  const cleaned = raw.replace(/[\u200B-\u200F\uFEFF\u2060\s]+/g, "").trim();
  if (!cleaned) return null;

  // Try detecting regional indicator pair (two regional indicator symbols)
  // Unicode surrogate pair range for regional indicators: \uD83C[\uDDE6-\uDDFF]
  const reg = /(\uD83C[\uDDE6-\uDDFF]){2}/u;
  const match = cleaned.match(reg);
  if (match) return match[0];

  // If cleaned string is short (likely an emoji or short code), return it
  if ([...cleaned].length <= 4) return cleaned;

  return null;
}

// Safe wrapper for usage in rendering — returns DB emoji or ISO-derived emoji
function resolveFlagEmoji(c?: Country | null): string | null {
  if (!c) return null;
  const db = extractFlagEmoji(c.flag ?? null);
  if (db) return db;
  const iso = iso2ToFlag(c.iso2 ?? null);
  if (iso) return iso;
  return null;
}

function flagSvgUrl(iso2?: string | null) {
  const s = normIso2(iso2);
  if (!s) return "";
  return `https://flagcdn.com/w20/${s.toLowerCase()}.png`;
}

/* -----------------------
   Debounce helper
   ----------------------- */

function useDebounced<T>(value: T, delay = 160) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return v;
}

/* -----------------------
   CountrySelect (fully typed)
   ----------------------- */

function CountrySelect({
  countries,
  value,
  onChange,
  placeholder = "Select country (optional)",
  maxItems = 200,
  className = "",
}: CountrySelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(-1);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const listRef = useRef<HTMLUListElement | null>(null);
  const buttonRef = useRef<HTMLButtonElement | null>(null);

  // close when click outside
  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!containerRef.current) return;
      if (!containerRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const debouncedQuery = useDebounced(query, 160);
  const q = debouncedQuery.trim().toLowerCase();

  const filtered = useMemo(() => {
    if (!q) return countries;
    return countries.filter((c) => {
      const name = (c.name || "").toLowerCase();
      const iso = (c.iso2 || "").toLowerCase();
      return name.includes(q) || iso.includes(q);
    });
  }, [countries, q]);

  const display = filtered.slice(0, maxItems);
  const selected = countries.find((c) => c.id === value) ?? null;

  const moveFocus = useCallback(
    (idx: number) => {
      const safe = Math.max(0, Math.min(idx, display.length - 1));
      setActiveIndex(safe);

      // focus the underlying button
      requestAnimationFrame(() => {
        const el = listRef.current?.querySelector(
          `[data-index='${safe}']`
        ) as HTMLButtonElement | null;
        el?.focus();
      });
    },
    [display.length]
  );

  function handleSelect(c: Country) {
    onChange(c.id);
    setOpen(false);
    setQuery("");
    setActiveIndex(-1);
    buttonRef.current?.focus();
  }

  // when opening, focus the list for keyboard control
  const openDropdown = () => {
    setOpen(true);
    setTimeout(() => {
      listRef.current?.focus();
      moveFocus(0);
    }, 0);
  };

  function onTriggerKey(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown" || e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      openDropdown();
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  function onListKey(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      moveFocus(activeIndex < 0 ? 0 : activeIndex + 1);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      moveFocus(activeIndex <= 0 ? 0 : activeIndex - 1);
    } else if (e.key === "Enter" && activeIndex >= 0) {
      e.preventDefault();
      const c = display[activeIndex];
      if (c) handleSelect(c);
    } else if (e.key === "Escape") {
      setOpen(false);
      buttonRef.current?.focus();
    }
  }

  const handleImgError = (e: React.SyntheticEvent<HTMLImageElement>) => {
    // hide the PNG fallback on error; we already attempt emoji fallback
    e.currentTarget.style.display = "none";
    e.currentTarget.setAttribute("aria-hidden", "true");
  };

  useEffect(() => {
    if (!open) setActiveIndex(-1);
    else setTimeout(() => display.length > 0 && setActiveIndex(0), 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  return (
    <div ref={containerRef} className={`relative z-50 w-full ${className}`}>
      <button
        ref={buttonRef}
        type="button"
        role="combobox"
        aria-expanded={open}
        aria-haspopup="listbox"
        onClick={() => {
          setOpen((s) => !s);
          if (!open && display.length > 0) setTimeout(() => moveFocus(0), 0);
        }}
        onKeyDown={onTriggerKey}
        className="w-full text-left rounded-2xl px-3 py-2 flex items-center gap-3 border border-white/10 bg-white/6 backdrop-blur-sm shadow-lg"
        aria-label={selected ? `Country: ${selected.name}` : "Select country"}
      >
        <div className="flex items-center gap-3">
          {selected ? (
            <>
              {/* IMPORTANT: use larger text size & normal line-height so emoji is visible */}
              <span className="text-2xl leading-normal w-8 select-none" aria-hidden>
                {resolveFlagEmoji(selected) ?? (
                  selected.iso2 ? (
                    <img
                      src={flagSvgUrl(selected.iso2)}
                      alt={`${selected.name} flag`}
                      className="inline-block w-5 h-4 rounded-sm object-cover"
                      onError={handleImgError}
                    />
                  ) : (
                    "🌐"
                  )
                )}
              </span>
              <span className="text-sm font-medium text-white/95">
                {selected.name}
              </span>
            </>
          ) : (
            <span className="text-sm text-white/60">{placeholder}</span>
          )}
        </div>
        <div className="ml-auto text-white/50 text-xs">{open ? "⌃" : "⌄"}</div>
      </button>

      {open && (
        <div className="absolute mt-2 w-full rounded-2xl bg-[#0f172a]/75 backdrop-blur-xl border border-white/10 shadow-2xl max-h-64 overflow-hidden">
          <div className="p-2">
            <input
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setActiveIndex(0);
              }}
              placeholder="Search country..."
              className="w-full rounded-xl px-3 py-2 bg-white/5 border border-white/20 placeholder:text-white/40 text-white/90 outline-none"
              onKeyDown={(e) => {
                if (e.key === "ArrowDown") {
                  e.preventDefault();
                  moveFocus(0);
                }
              }}
              aria-label="Search countries"
            />
          </div>

          <ul
            role="listbox"
            ref={listRef}
            tabIndex={-1}
            onKeyDown={onListKey}
            className="overflow-auto max-h-48 p-1 space-y-1"
          >
            {display.length === 0 ? (
              <li className="px-3 py-2 text-xs text-white/50">No countries match.</li>
            ) : (
              display.map((c, i) => {
                const f = resolveFlagEmoji(c);
                const iso = normIso2(c.iso2);
                return (
                  <li key={c.id} className="px-2">
                    <button
                      data-index={i}
                      role="option"
                      type="button"
                      onClick={() => handleSelect(c)}
                      onFocus={() => setActiveIndex(i)}
                      aria-selected={c.id === value}
                      className={`w-full text-left flex items-center gap-3 px-3 py-2 rounded-lg transition ${
                        c.id === value ? "bg-white/10" : "hover:bg-white/10"
                      }`}
                    >
                      <span className="text-2xl leading-normal w-8 select-none" aria-hidden>
                        {f ?? (iso ? (
                          <img
                            src={flagSvgUrl(iso)}
                            alt={`${c.name} flag`}
                            className="inline-block w-5 h-4 rounded-sm object-cover"
                            onError={handleImgError}
                          />
                        ) : (
                          <span className="text-white/40 text-sm">{iso || ""}</span>
                        ))}
                      </span>

                      <span className="text-sm text-white/90">{c.name}</span>
                      <span className="ml-auto text-xs text-white/50">{iso}</span>
                    </button>
                  </li>
                );
              })
            )}

            {filtered.length > maxItems && (
              <li className="px-3 py-2 text-xs text-white/50">Showing first {maxItems} results…</li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}

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
  {
    test: (p: string) => p.length >= PASSWORD_POLICY.minLength,
    label: `At least ${PASSWORD_POLICY.minLength} characters`,
  },
  { test: (p: string) => /[A-Z]/.test(p), label: "One uppercase letter" },
  { test: (p: string) => /[a-z]/.test(p), label: "One lowercase letter" },
  { test: (p: string) => /\d/.test(p), label: "One number" },
  {
    test: (p: string) => PASSWORD_POLICY.symbolRegex.test(p),
    label: "One special symbol",
  },
];

function usePasswordStrength(password: string) {
  const passedRules = passwordRules.map((r) => r.test(password));
  const passed = passedRules.reduce((acc, v) => acc + (v ? 1 : 0), 0);
  const strengthLabel =
    ["Very weak", "Weak", "Fair", "Good", "Strong", "Very strong"][passed] ||
    "Very weak";

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
        <span className="text-xs text-white/50">
          {passed}/{passwordRules.length}
        </span>
      </div>

      <div className="flex gap-1 h-2 mb-2">
        {passwordRules.map((_, i) => (
          <div key={i} className={`flex-1 rounded ${passedRules[i] ? "bg-emerald-400" : "bg-white/10"}`} />
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
   Signup page
   ----------------------- */

export default function SignupPage() {
  const router = useRouter();

  const [form, setForm] = useState({
    org: "",
    name: "",
    email: "",
    password: "",
  });

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

  /* -----------------------
     Email availability check
     ----------------------- */
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
    return () => {
      cancelled = true;
    };
  }, [debouncedEmail]);

  /* -----------------------
     Fetch countries + normalize
     ----------------------- */
  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoadingCountries(true);
      try {
        const res = await api.get("/api/global/countries", {
          params: { active: "true" },
        });

        if (cancelled) return;

        const raw = Array.isArray(res.data?.data) ? res.data.data : [];

        const list: Country[] = raw.map((c: any, idx: number) => ({
          id: String(c.id ?? c.uuid ?? c._id ?? c.code ?? `country-${idx}`),
          name: String(c.name ?? c.country ?? c.label ?? c.title ?? ""),
          iso2: normIso2(
            c.iso2 ??
              c.alpha2 ??
              c.code2 ??
              c.country_code ??
              c.alpha_2 ??
              ""
          ),
          flag: c.flag ?? c.emoji ?? null,
        }));

        setCountries(list);

        const india = list.find((c) => (c.iso2 ?? "").toUpperCase() === "IN");
        setCountryId(india ? india.id : list[0]?.id ?? "");
      } catch (e) {
        console.warn("Failed to load countries", e);
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
    (key: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm((f) => ({ ...f, [key]: e.target.value }));

  /* -----------------------
     Signup submit
     ----------------------- */
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

        setTimeout(() => router.push("/dashboard"), 700);
      } else {
        setErr(res.data?.error || "Signup failed");
      }
    } catch (err: any) {
      if (err.response) {
        const data = err.response.data || {};
        const status = err.response.status;

        if (
          status === 400 &&
          data.error === "weak_password" &&
          Array.isArray(data.reasons)
        ) {
          setPwServerReasons(data.reasons);
          setErr("Password does not meet requirements.");
        } else if (status === 409 && data.error === "email_exists") {
          setEmailAvailable(false);
          setErr("That email is already registered.");
        } else if (status === 400 && data.error === "invalid_email") {
          setErr("Invalid email.");
        } else if (status === 409 && data.error === "unique_violation") {
          setErr("Signup conflict. Try again.");
        } else {
          setErr(typeof data.error === "string" ? data.error : `Signup failed (${status}).`);
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

  /* -----------------------
     Render
     ----------------------- */

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-linear-to-b from-sky-900/8 via-indigo-900/8 to-sky-900/8 text-white overflow-hidden px-6">
      <div className="absolute inset-0 bg-linear-to-b from-white/4 via-white/6 to-white/4 pointer-events-none" />

      <div className="absolute -top-40 left-1/2 -translate-x-1/2 pointer-events-none z-0">
        <NeuralGlow size={680} intensity={0.65} colorA="#7dd3fc" colorB="#6366f1" colorC="#a78bfa" />
      </div>

      <div className="relative z-10 flex flex-col items-center w-full max-w-[980px]">
        <div className="mb-6 flex items-center justify-center">
          <div className="flex h-36 w-36 items-center justify-center rounded-full bg-white/6 shadow-2xl backdrop-blur-sm p-2">
            <BrandLogo size={8} pulse />
          </div>
        </div>

        <AuthCard className="w-full max-w-xl">
          <motion.div initial={{ opacity: 0, y: 28 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45 }}>
            <div className="text-center mb-6">
              <div className="flex justify-center items-center gap-2">
                <h1 className="text-3xl font-extrabold bg-clip-text text-transparent bg-linear-to-r from-sky-300 via-indigo-400 to-sky-300">
                  Create your workspace
                </h1>
                <AIBadge />
              </div>
              <p className="mt-2 text-sm text-white/70">Spin up a secure tenant with AI-powered onboarding.</p>
            </div>

            <form onSubmit={handleSignup} className="space-y-4" aria-label="Signup form">
              {/* Org */}
              <div>
                <label className="text-xs font-medium text-white/70">Organization / Company</label>
                <input
                  placeholder="Organization / Company"
                  className="w-full rounded-xl bg-white/5 border border-white/10 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-sky-400/40"
                  value={form.org}
                  onChange={onChange("org")}
                  required
                />
              </div>

              {/* Country */}
              <div>
                <label className="text-xs font-medium text-white/70">Country</label>
                <CountrySelect countries={countries} value={countryId} onChange={(id: string) => setCountryId(id)} />
                <p className="mt-2 text-xs text-white/50">Selecting a country lets us pre-apply local tax defaults.</p>
              </div>

              {/* Apply defaults */}
              <div className="flex items-center gap-3">
                <input type="checkbox" checked={applyCountryDefaults} onChange={(e) => setApplyCountryDefaults(e.target.checked)} className="w-4 h-4 rounded" />
                <label className="text-xs text-white/70">Apply country tax defaults to this company</label>
              </div>

              {/* Name */}
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

              {/* Email */}
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
                <div className="mt-2 text-xs">
                  {checkingEmail ? (
                    <span className="text-white/60">Checking…</span>
                  ) : emailAvailable === null ? (
                    <span className="text-white/50">Enter a valid business email.</span>
                  ) : emailAvailable ? (
                    <span className="text-emerald-300">Email available</span>
                  ) : (
                    <span className="text-amber-400">Email already exists</span>
                  )}
                </div>
              </div>

              {/* Password */}
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

                {pwServerReasons?.length ? (
                  <ul className="mt-2 text-xs text-red-300 list-disc list-inside space-y-1">
                    {pwServerReasons.map((r, i) => (
                      <li key={i}>{r}</li>
                    ))}
                  </ul>
                ) : null}
              </div>

              {/* Errors */}
              {err && (
                <p role="alert" className="text-sm text-red-400 mt-1">
                  {err}
                </p>
              )}

              {ok && (
                <p role="status" aria-live="polite" className="text-sm text-emerald-400 mt-1">
                  Workspace created — redirecting…
                </p>
              )}

              <PrimaryButton type="submit" disabled={!canSubmit || loading} aria-busy={loading}>
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
