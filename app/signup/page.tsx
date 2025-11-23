"use client";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Logo from "@/components/Logo";

/**
 * Final signup page — Option A country selector + full password typing/strength UX
 *
 * - Normalizes many server shapes into canonical Country objects:
 *   { id, name, iso2?, flag_emoji?, serverId? }
 * - FlagIcon prefers explicit emoji, then generates from iso2, then globe fallback.
 * - Ensures emoji fonts via inline style to avoid custom-font issues.
 */

const LOGO_SRC = process.env.NEXT_PUBLIC_LOGO_SRC || "/assets/brand-logo.png";
const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL || "";

type FormState = {
  name: string;
  email: string;
  password: string;
  company: string;
  countryId: string;
  industry?: string;
  acceptTerms: boolean;
};

type Country = {
  id: string;
  name: string;
  flag_emoji?: string | null;
  iso2?: string;
  serverId?: string;
};

/* defensive lookup for country names if backend only provides ISO2 code */
const ISO_TO_FULL_NAME: { [key: string]: string } = {
  US: "United States",
  CA: "Canada",
  GB: "United Kingdom",
  IN: "India",
  AU: "Australia",
  DE: "Germany",
  FR: "France",
  JP: "Japan",
  CN: "China",
  BR: "Brazil",
  MX: "Mexico",
  RU: "Russia",
  ZA: "South Africa",
  AE: "United Arab Emirates",
  SG: "Singapore",
  NZ: "New Zealand",
  IT: "Italy",
  ES: "Spain",
  NL: "Netherlands",
  KR: "South Korea",
};

/* -----------------------
   Password policy + helpers
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
    <div className="mt-3" aria-live="polite">
      <div className="flex items-center justify-between text-xs text-white/70 mb-2">
        <span>
          Password strength: <strong>{strengthLabel}</strong>
        </span>
        <span className="text-xs text-white/50">
          {passed}/{passwordRules.length}
        </span>
      </div>

      <div className="flex gap-1 h-2 mb-3">
        {passwordRules.map((_, i) => (
          <div
            key={i}
            className={`flex-1 rounded ${passedRules[i] ? "bg-emerald-400" : "bg-white/10"}`}
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

/* --------------------------
   FlagIcon (robust emoji fallback generation / force emoji fonts)
   -------------------------- */
function FlagIcon({ country }: { country: Country | null }) {
  // Prefer server-provided emoji (normalized into flag_emoji)
  const explicit = country?.flag_emoji ?? null;

  // compute iso normalized
  const isoRaw = country?.iso2 ?? "";
  const iso = typeof isoRaw === "string" ? isoRaw.trim().slice(0, 2).toUpperCase() : "";

  // Memoize generated emoji from iso to avoid recomputing on each render for large lists
  const generatedEmoji = useMemo(() => {
    if (!iso || !/^[A-Z]{2}$/.test(iso)) return null;
    try {
      const base = 0x1f1e6; // regional indicator start
      const first = base + (iso.charCodeAt(0) - "A".charCodeAt(0));
      const second = base + (iso.charCodeAt(1) - "A".charCodeAt(0));
      const emoji = String.fromCodePoint(first, second);
      return emoji;
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn("[FlagIcon] iso->emoji generation failed for", iso, err);
      return null;
    }
  }, [iso]);

  // final emoji choice
  const emojiToShow = explicit || generatedEmoji || "🌐";

  // Screen-reader friendly: show emoji aria-hidden, and provide sr-only country name
  return (
    <span className="inline-flex items-center" title={country?.name ?? iso}>
      <span
        aria-hidden="true"
        style={{
          fontSize: 18,
          lineHeight: 1,
          // Force emoji-capable fonts to avoid custom-font hiding color emoji
          fontFamily: `system-ui, -apple-system, "Segoe UI Emoji", "Noto Color Emoji", "Apple Color Emoji"`,
        }}
      >
        {emojiToShow}
      </span>
      <span className="sr-only">{country?.name ?? iso ?? "Unknown country"}</span>
    </span>
  );
}

/* SafeLogo: tries Logo component and falls back to PNG */
function SafeLogo({
  size = 80,
  className = "",
  alt = "Zyntra logo",
  forceFallback = false,
}: {
  size?: number;
  className?: string;
  alt?: string;
  forceFallback?: boolean;
}) {
  const [fallback, setFallback] = useState(false);
  useEffect(() => {
    if (forceFallback) setFallback(true);
  }, [forceFallback]);

  return (
    <div
      className={`relative inline-flex items-center justify-center ${className}`}
      style={{ width: size, height: size }}
    >
      <div aria-hidden={fallback} className={fallback ? "hidden" : "block"}>
        <Logo width={size} height={size} />
      </div>

      <img
        src={LOGO_SRC}
        alt={alt}
        style={{ width: size, height: "auto" }}
        className={fallback ? "block" : "hidden"}
        onError={() => setFallback(true)}
      />

      {fallback && (
        <div className="sr-only" role="img" aria-label="Zyntra">
          ZYNTRA
        </div>
      )}
    </div>
  );
}

/* ----------------------------
   CountrySelect component
   ---------------------------- */
function CountrySelect({
  countries,
  value,
  onChange,
  placeholder = "Search country...",
}: {
  countries: Country[];
  value: string;
  onChange: (id: string) => void;
  placeholder?: string;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);
  const searchRef = useRef<HTMLInputElement | null>(null);

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [highlight, setHighlight] = useState(0);

  const selected = useMemo(() => countries.find((c) => c.id === value) ?? null, [countries, value]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return countries;
    return countries.filter((c) => {
      return (
        c.name.toLowerCase().includes(q) ||
        ((c.flag_emoji ?? "") as string).toLowerCase().includes(q) ||
        ((c.iso2 ?? c.id ?? "") as string).toLowerCase().includes(q)
      );
    });
  }, [countries, query]);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!containerRef.current) return;
      if (!containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery("");
      }
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  function openDropdown() {
    setOpen(true);
    setQuery(selected?.name ?? "");
    setTimeout(() => searchRef.current?.focus(), 0);
    setTimeout(() => {
      const idx = selected ? filtered.findIndex((c) => c.id === selected.id) : -1;
      setHighlight(idx >= 0 ? idx : 0);
    }, 0);
  }

  function onSearchKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlight((h) => Math.min(h + 1, filtered.length - 1));
      scrollIntoView(highlight + 1);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlight((h) => Math.max(h - 1, 0));
      scrollIntoView(highlight - 1);
    } else if (e.key === "Enter") {
      e.preventDefault();
      selectAt(highlight);
    } else if (e.key === "Escape") {
      e.preventDefault();
      setOpen(false);
      setQuery("");
    }
  }

  function scrollIntoView(index: number) {
    const el = listRef.current?.querySelector<HTMLDivElement>(`[data-idx="${index}"]`);
    if (el) el.scrollIntoView({ block: "nearest" });
  }

  function selectAt(i: number) {
    const it = filtered[i];
    if (!it) return;
    onChange(it.id);
    setOpen(false);
    setQuery("");
  }

  useEffect(() => {
    if (highlight >= filtered.length) setHighlight(Math.max(0, filtered.length - 1));
  }, [filtered.length, highlight]);

  // compute aria-activedescendant id when open
  const activeOptionId = open && filtered[highlight] ? `country-option-${filtered[highlight].id}` : undefined;

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => (open ? setOpen(false) : openDropdown())}
        className="w-full h-10 rounded-md bg-[#06121a] border border-white/8 px-3 py-2 text-sm text-white flex items-center justify-between gap-3 hover:ring-2 hover:ring-[#00E3C2]/20 focus:outline-none"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`Country: ${selected?.name ?? "Select country"}`}
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-8 h-8 flex items-center justify-center">
            <FlagIcon country={selected} />
          </div>

          <div className="text-sm text-white/80 truncate">
            {selected ? selected.name : <span className="text-white/50">Select country</span>}
          </div>
        </div>

        <svg
          className={`w-4 h-4 text-white/40 transform ${open ? "rotate-180" : ""}`}
          viewBox="0 0 20 20"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden
        >
          <path d="M5 8L10 13L15 8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open && (
        <div className="absolute z-50 mt-2 w-full max-h-[300px] rounded-md bg-[#081421] border border-white/8 shadow-xl py-2 text-sm">
          <div className="px-3">
            <input
              ref={searchRef}
              type="text"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setHighlight(0);
              }}
              onKeyDown={onSearchKeyDown}
              placeholder={placeholder}
              className="w-full h-10 rounded-md bg-[#06121a] border border-white/8 px-3 py-2 text-sm text-white placeholder-white/40 outline-none focus:ring-2 focus:ring-[#00E3C2]/30"
              aria-label="Search country"
              role="searchbox"
              aria-activedescendant={activeOptionId}
            />
          </div>

          <div ref={listRef} className="mt-2 max-h-[210px] overflow-auto" role="listbox" aria-label="Country list">
            {filtered.length === 0 ? (
              <div className="px-3 py-2 h-10 flex items-center text-white/50">No results</div>
            ) : (
              filtered.map((c, idx) => {
                const isHighlighted = idx === highlight;
                const isSelected = c.id === value;
                const optionId = `country-option-${c.id}`;
                return (
                  <div
                    id={optionId}
                    key={c.id}
                    data-idx={idx}
                    role="option"
                    aria-selected={isSelected}
                    onMouseEnter={() => setHighlight(idx)}
                    onMouseDown={(ev) => {
                      ev.preventDefault();
                      selectAt(idx);
                    }}
                    className={`flex items-center gap-3 px-3 py-2 h-10 cursor-pointer ${isHighlighted ? "bg-[#0f2934]" : "hover:bg-[#0c2229]"} ${isSelected ? "border-l-2 border-[#00E3C2] pl-2" : ""}`}
                  >
                    <div className="w-8 h-8 flex items-center justify-center">
                      <FlagIcon country={c} />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="truncate text-white/90">{c.name}</div>
                    </div>

                    {isSelected && <div className="text-emerald-300 text-sm">✓</div>}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* -----------------------
   Full Industries list (exposed for render)
   NOTE: canonical keys used for backend 'industry' field */
const INDUSTRIES: { key: string; label: string }[] = [
  { key: "saas", label: "SaaS / Software" },
  { key: "manufacturing", label: "Manufacturing" },
  { key: "hospital", label: "Hospital / Healthcare" },
  { key: "retail", label: "Retail" },
  { key: "education", label: "Education" },
  { key: "finance", label: "Finance / Banking" },
  { key: "insurance", label: "Insurance" },
  { key: "construction", label: "Construction" },
  { key: "real_estate", label: "Real Estate" },
  { key: "logistics", label: "Logistics / Transport" },
  { key: "ecommerce", label: "E-commerce" },
  { key: "telecom", label: "Telecommunications" },
  { key: "agriculture", label: "Agriculture" },
  { key: "energy", label: "Energy / Utilities" },
  { key: "pharma", label: "Pharmaceuticals" },
  { key: "food_beverage", label: "Food & Beverage" },
  { key: "automotive", label: "Automotive" },
  { key: "legal", label: "Legal / Law" },
  { key: "media", label: "Media & Entertainment" },
  { key: "marketing", label: "Marketing & Advertising" },
  { key: "consulting", label: "Professional Services / Consulting" },
  { key: "nonprofit", label: "Non-profit / NGO" },
  { key: "hospitality", label: "Hospitality / Travel" },
  { key: "mining", label: "Mining" },
  { key: "aerospace", label: "Aerospace" },
  { key: "biotech", label: "Biotechnology" },
  { key: "chemicals", label: "Chemicals" },
  { key: "electronics", label: "Electronics" },
  { key: "textiles", label: "Textiles" },
  { key: "healthtech", label: "Healthtech" },
  { key: "itevices", label: "IT & Hardware" },
  { key: "research", label: "R&D / Lab" },
  { key: "security", label: "Security / Surveillance" },
  { key: "property_management", label: "Property Management" },
  { key: "service", label: "Service Industry" },
  { key: "other", label: "Other / Not Listed" },
];

/* -----------------------
   SignupPage main component
   ----------------------- */
export default function SignupPage(): JSX.Element {
  const router = useRouter();
  const [form, setForm] = useState<FormState>({
    name: "",
    email: "",
    password: "",
    company: "",
    countryId: "",
    industry: "",
    acceptTerms: false,
  });

  const [countries, setCountries] = useState<Country[]>([]);
  const [loadingCountries, setLoadingCountries] = useState(false);
  const [countriesError, setCountriesError] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // server-side password reasons (when API responds weak_password)
  const [pwServerReasons, setPwServerReasons] = useState<string[] | null>(null);

  const [mountedAnimate, setMountedAnimate] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setMountedAnimate(true), 70);
    return () => clearTimeout(t);
  }, []);

  /* Load countries (robust normalization + fallback) */
  useEffect(() => {
    let mounted = true;
    async function loadCountries() {
      setLoadingCountries(true);
      setCountriesError(null);

      try {
        const base = BACKEND || "";
        const candidateUrls = base
          ? [`${base}/api/global/countries`, `${base}/api/countries`, `${base}/api/global/country`]
          : ["/api/global/countries", "/api/countries", "/api/global/country"];

        let res: Response | null = null;
        let lastErr: any = null;

        for (const url of candidateUrls) {
          try {
            res = await fetch(url, { cache: "no-store", credentials: "include" });
            if (res && res.ok) {
              console.info("[countries] fetched from", url);
              break;
            } else {
              lastErr = { url, status: res?.status, statusText: res?.statusText };
              res = null;
            }
          } catch (e) {
            lastErr = { url, error: e };
            res = null;
          }
        }

        if (!res) {
          console.error("[countries] all fetch attempts failed", lastErr);
          if (!mounted) return;
          setCountries([
            { id: "IN", name: "India", flag_emoji: "🇮🇳", iso2: "IN", serverId: "IN" },
            { id: "US", name: "United States", flag_emoji: "🇺🇸", iso2: "US", serverId: "US" },
          ]);
          setCountriesError("Failed to fetch countries from server. See console for details.");
          setForm((s) => ({ ...s, countryId: "IN" }));
          return;
        }

        const rawText = await res.text();
        let parsed: any;
        try {
          parsed = rawText ? JSON.parse(rawText) : null;
        } catch (e) {
          console.warn("[countries] failed to parse JSON, rawText:", rawText);
          parsed = null;
        }
        console.debug("[countries] raw response", { status: res.status, parsed });

        const arr = Array.isArray(parsed)
          ? parsed
          : Array.isArray(parsed?.data)
          ? parsed.data
          : Array.isArray(parsed?.countries)
          ? parsed.countries
          : [];

        // NORMALIZE many server shapes -> canonical Country[]
        const normalized: Country[] =
          arr.length > 0
            ? arr.map((c: any, idx: number) => {
                // ----- iso discovery (many possible fields) -----
                const isoRaw =
                  (c?.iso2 ??
                    c?.alpha2 ??
                    c?.country_code ??
                    c?.alpha_2 ??
                    c?.code2 ??
                    c?.code ??
                    c?.countryCode ??
                    c?.iso ??
                    c?.ISO ??
                    ""
                  ).toString();
                const iso = isoRaw ? isoRaw.trim().slice(0, 2).toUpperCase() : undefined;

                // ----- server id candidates (prefer UUID / db id fields) -----
                const serverIdCandidate =
                  c?.id ?? c?._id ?? c?.uuid ?? c?.uid ?? c?.server_id ?? c?.code ?? c?.countryId ?? iso ?? `c${idx}`;
                const serverId = serverIdCandidate != null ? String(serverIdCandidate) : `c${idx}`;

                // ----- find explicit emoji robustly -----
                // 1) common explicit fields
                let explicitFlag =
                  (c?.flag_emoji ?? c?.flag ?? c?.emoji ?? c?.flagEmoji ?? c?.country_flag ?? c?.countryFlag ?? null) as string | null;

                // 2) if not found, try to detect any value in object that looks like a regional-flag emoji
                if (!explicitFlag) {
                  try {
                    for (const key of Object.keys(c || {})) {
                      const val = c[key];
                      if (typeof val === "string") {
                        // regional indicator symbols regex (unicode) — will match 🇦🇺 etc
                        if (/\p{Regional_Indicator}/u.test(val) || /[\u{1F1E6}-\u{1F1FF}]/u.test(val)) {
                          explicitFlag = val;
                          break;
                        }
                      }
                    }
                  } catch (e) {
                    // ignore detection errors
                  }
                }

                // 3) trim whitespace/newlines from explicitFlag and normalize to null if empty
                if (typeof explicitFlag === "string") {
                  explicitFlag = explicitFlag.trim();
                  if (explicitFlag.length === 0) explicitFlag = null;
                } else {
                  explicitFlag = null;
                }

                // ----- name fallback (map iso -> friendly name if server provided only ISO) -----
                let nameCandidate = String(c?.name ?? c?.country ?? c?.label ?? c?.title ?? (iso ?? "Unknown"));
                if (iso && (nameCandidate === iso || nameCandidate.trim().length <= 3)) {
                  nameCandidate = ISO_TO_FULL_NAME[iso] ?? nameCandidate;
                }

                // Final object: use serverId as canonical id so UI text doesn't show ISO code accidentally
                return {
                  id: String(serverId), // canonical UI id (UUID / DB id)
                  name: nameCandidate || (iso ? ISO_TO_FULL_NAME[iso] ?? iso : `Country ${idx + 1}`),
                  flag_emoji: explicitFlag ?? null,
                  iso2: iso,
                  serverId: serverId != null ? String(serverId) : undefined,
                } as Country;
              })
            : [
                { id: "IN", name: "India", flag_emoji: "🇮🇳", iso2: "IN", serverId: "IN" },
                { id: "US", name: "United States", flag_emoji: "🇺🇸", iso2: "US", serverId: "US" },
              ];

        // quick debug sample for visibility
        // eslint-disable-next-line no-console
        console.debug("[countries] normalized sample:", normalized.slice(0, 6));

        if (!mounted) return;
        setCountries(normalized);

        // Prefer to select India's serverId if present; fallback to first normalized id
        const india = normalized.find((c) => (c.iso2 ?? "").toUpperCase() === "IN" || c.name === "India");
        setForm((s) => ({ ...s, countryId: india ? india.id : normalized[0]?.id ?? "" }));
      } catch (err) {
        console.error("[countries] unexpected error", err);
        if (!mounted) return;
        setCountries([
          { id: "IN", name: "India", flag_emoji: "🇮🇳", iso2: "IN", serverId: "IN" },
          { id: "US", name: "United States", flag_emoji: "🇺🇸", iso2: "US", serverId: "US" },
        ]);
        setForm((s) => ({ ...s, countryId: "IN" }));
        setCountriesError("Unexpected error fetching countries - check console.");
      } finally {
        if (mounted) setLoadingCountries(false);
      }
    }
    loadCountries();
    return () => {
      mounted = false;
    };
  }, []);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((s) => ({ ...s, [key]: value }));
  }

  const { passed: passwordPassed } = usePasswordStrength(form.password);

  async function createAccount(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    setPwServerReasons(null);

    if (!form.acceptTerms) {
      setError("Please accept the Terms & Privacy Policy.");
      return;
    }
    if (!form.name || !form.company || !form.email || !form.password || !form.countryId) {
      setError("Please complete all fields.");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      setError("Please enter a valid email address.");
      return;
    }
    // enforce same min length as the password policy
    if (form.password.length < PASSWORD_POLICY.minLength) {
      setError(`Password must be at least ${PASSWORD_POLICY.minLength} characters.`);
      return;
    }

    setLoading(true);
    try {
      const base = BACKEND || "";
      const url = base ? `${base}/api/auth/signup` : "/api/auth/signup";

      // pick selected country object to find serverId / iso2
      const selected = countries.find((c) => c.id === form.countryId);

      // backend-friendly payload: prefer server-side id as country_id, fallback to iso2 or ui id
      const country_id = selected?.serverId ?? selected?.iso2 ?? form.countryId;
      const country_iso2 = selected?.iso2 ?? undefined;

      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          name: form.name,
          company: form.company,
          email: form.email,
          password: form.password,
          country_id, // server field name
          country_iso2, // convenience if backend accepts iso
          industry: form.industry || null,
        }),
      });

      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (payload?.error === "email_exists") {
          throw new Error("An account with that email already exists. Try logging in or reset password.");
        }
        // handle weak_password with reasons
        if (res.status === 400 && payload?.error === "weak_password" && Array.isArray(payload?.reasons)) {
          setPwServerReasons(payload.reasons);
          setError("Password does not meet requirements.");
          return;
        }
        throw new Error(payload?.message || payload?.error || `Signup failed (${res.status})`);
      }

      setSuccess(true);

      // If industry is hospital, send user to the HMS onboarding wizard.
      // Provisioning/seed jobs run asynchronously on the server (provisioning queue).
      setTimeout(() => {
        if (form.industry === "hospital") {
          router.push("/tenant/onboarding/hms");
        } else {
          router.push("/tenant");
        }
      }, 350);
    } catch (err: unknown) {
      if (err instanceof Error) setError(err.message);
      else setError("Signup failed - try again or contact support.");
    } finally {
      setLoading(false);
    }
  }

  const canSubmit =
    Boolean(form.name && form.company && form.email && form.password) &&
    passwordPassed === passwordRules.length;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-[#071226] to-[#071321] p-6">
      {/* Background accents */}
      <div aria-hidden className="fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute -left-56 -top-40 w-[680px] h-[680px] rounded-3xl z-0" style={{ background: "radial-gradient(closest-side, rgba(255,255,255,0.12), rgba(255,255,255,0.06) 40%, rgba(255,255,255,0.02) 70%, transparent)", filter: "blur(8px) saturate(1.02)" }} />
        <div className="absolute right-[-120px] top-10 w-[520px] h-[520px] rounded-3xl z-0" style={{ background: "radial-gradient(closest-side, rgba(255,255,255,0.06), rgba(255,255,255,0.02) 40%, transparent)", filter: "blur(88px)" }} />
      </div>

      <div className="w-full max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* HERO */}
          <div className="px-4 md:px-8 lg:px-12 order-2 lg:order-1">
            <div className="max-w-xl">
              <div className="flex items-center gap-4 mb-6">
                <div className={`relative flex items-center justify-center ${mountedAnimate ? "zyntra-entrance" : ""}`} aria-hidden>
                  <div className="absolute w-48 h-48 rounded-3xl z-0" style={{ background: "radial-gradient(closest-side, rgba(255,255,255,0.12), rgba(255,255,255,0.06) 40%, rgba(255,255,255,0.02) 70%, transparent)", filter: "blur(8px) saturate(1.02)" }} />
                  <div className="absolute w-44 h-44 rounded-3xl bg-white/6 backdrop-blur-3xl border border-white/8 z-10" />
                  <div className={`absolute w-44 h-44 rounded-3xl ring-4 ring-[#00E3C2]/18 ${"zyntra-pulse"}`} style={{ transformOrigin: "center" }} />
                  <div className="zyntra-shimmer" data-shimmer={mountedAnimate} aria-hidden />
                  <div className="relative z-20 flex items-center justify-center w-40 h-40 zyntra-hover" style={{ transition: "transform 220ms cubic-bezier(.2,.9,.2,1)" }}>
                    <div className="h-28 w-auto flex items-center justify-center">
                      <SafeLogo size={140} className="drop-shadow-[0_10px_30px_rgba(0,255,220,0.48)]" />
                    </div>
                  </div>
                </div>

                <div>
                  <div className="text-xs text-white/60 tracking-wider uppercase">ZYNTRA</div>
                  <div className="text-sm text-white/50">AI-Driven ERP for Modern Teams</div>
                </div>
              </div>

              <h1 className="text-4xl sm:text-5xl font-extrabold leading-tight text-white">Smarter business operations. Faster decisions.</h1>

              <p className="mt-5 text-lg text-white/75">ZYNTRA combines modern ERP with AI assistants, delivering forecasting, automations and unified operations — built for finance, inventory and teams.</p>

              <div className="mt-8 flex gap-4 items-center">
                <a href="#signup" className="inline-flex items-center gap-3 px-5 py-2.5 rounded-md bg-gradient-to-r from-[#dffaf2] to-[#c6fff0] text-slate-900 font-semibold shadow-[0_10px_30px_rgba(6,182,163,0.08)] transform transition-transform duration-180 hover:-translate-y-1">Create workspace — Free</a>
                <a href="/docs" className="text-sm text-white/60 hover:text-white/80">Docs & onboarding →</a>
              </div>

              <div className="mt-10 grid grid-cols-2 gap-4">
                <div className="rounded-md p-4 bg-[rgba(255,255,255,0.02)] border border-white/6">
                  <div className="text-xs text-white/60">Provisioning</div>
                  <div className="mt-1 font-semibold text-white">Instant workspace</div>
                </div>
                <div className="rounded-md p-4 bg-[rgba(255,255,255,0.02)] border border-white/6">
                  <div className="text-xs text-white/60">Security</div>
                  <div className="mt-1 font-semibold text-white">SSO & enterprise-ready</div>
                </div>
              </div>
            </div>
          </div>

          {/* FORM - glass card */}
          <div className="order-1 lg:order-2 px-4 md:px-8">
            <div id="signup" className="mx-auto max-w-md">
              <div className="relative">
                <div className="absolute -top-8 -right-8 w-36 h-36 rounded-full bg-gradient-to-tr from-[#00E3C2] to-[#7dd3fc] opacity-6 animate-float" />
                <div className="relative rounded-md bg-[rgba(255,255,255,0.03)] border border-white/8 backdrop-blur-md p-6 ring-1 ring-white/4 shadow-2xl transition-transform transform hover:-translate-y-1">
                  {/* left accent stripe */}
                  <div className="absolute -left-1 top-6 bottom-6 w-[4px] rounded-l-md bg-gradient-to-b from-[#00E3C2]/60 to-transparent" aria-hidden />

                  <div className="flex items-center gap-4 mb-5">
                    <div className={`relative flex items-center justify-center ${mountedAnimate ? "zyntra-entrance" : ""}`} aria-hidden>
                      <div className="absolute w-28 h-28 rounded-2xl" style={{ background: "radial-gradient(closest-side, rgba(255,255,255,0.12), rgba(255,255,255,0.06) 40%, rgba(255,255,255,0.02) 70%, transparent)", filter: "blur(6px)" }} />
                      <div className="absolute w-24 h-24 rounded-2xl bg-white/6 backdrop-blur-md border border-white/8 z-10" />
                      <div className={`absolute w-24 h-24 rounded-2xl ring-4 ring-[#00E3C2]/16 ${"zyntra-pulse"}`} />
                      <div className="zyntra-shimmer" data-shimmer={mountedAnimate} />
                      <div className="relative z-20 flex items-center justify-center w-20 h-20" style={{ transition: "transform 200ms ease" }}>
                        <SafeLogo size={80} className="drop-shadow-[0_6px_18px_rgba(0,255,220,0.45)]" />
                      </div>
                    </div>

                    <div>
                      <h3 className="text-lg sm:text-xl font-semibold text-white">Create your workspace</h3>
                      <p className="text-sm text-white/70">Free trial — enterprise features included.</p>
                    </div>
                  </div>

                  <form onSubmit={createAccount} noValidate className="space-y-4" aria-live="polite">
                    <div className="grid grid-cols-2 gap-3">
                      <input
                        aria-label="Your name"
                        placeholder="Your name"
                        value={form.name}
                        onChange={(e) => update("name", e.target.value)}
                        className="px-3 py-2 h-10 rounded-md bg-[#06121a] border border-white/8 text-white placeholder-white/40 outline-none focus:ring-2 focus:ring-[#00E3C2]/30"
                      />
                      <input
                        aria-label="Company name"
                        placeholder="Company name"
                        value={form.company}
                        onChange={(e) => update("company", e.target.value)}
                        className="px-3 py-2 h-10 rounded-md bg-[#06121a] border border-white/8 text-white placeholder-white/40 outline-none focus:ring-2 focus:ring-[#00E3C2]/30"
                      />
                    </div>

                    <input
                      aria-label="Work email"
                      placeholder="Work email"
                      type="email"
                      value={form.email}
                      onChange={(e) => update("email", e.target.value)}
                      className="w-full px-3 py-2 h-10 rounded-md bg-[#06121a] border border-white/8 text-white placeholder-white/40 outline-none focus:ring-2 focus:ring-[#00E3C2]/30"
                    />

                    <div className="grid grid-cols-1 gap-2">
                      <div className="relative">
                        <div className="flex items-center gap-2">
                          <input
                            aria-label="Password"
                            placeholder="Password"
                            type={showPassword ? "text" : "password"}
                            value={form.password}
                            onChange={(e) => update("password", e.target.value)}
                            className="w-full px-3 py-2 h-10 rounded-md bg-[#06121a] border border-white/8 text-white placeholder-white/40 outline-none focus:ring-2 focus:ring-[#00E3C2]/30 pr-10"
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword((s) => !s)}
                            className="absolute right-2 top-1/2 -translate-y-1/2 px-2 py-1 text-sm rounded"
                            aria-label={showPassword ? "Hide password" : "Show password"}
                          >
                            {showPassword ? "Hide" : "Show"}
                          </button>
                        </div>

                        <PasswordStrength value={form.password} />
                      </div>

                      <div>
                        {loadingCountries ? (
                          <div className="text-xs text-white/60 mb-2">Loading countries…</div>
                        ) : countriesError ? (
                          <div className="text-xs text-amber-300 mb-2">{countriesError}</div>
                        ) : null}

                        <CountrySelect
                          countries={countries}
                          value={form.countryId}
                          onChange={(id) => update("countryId", id)}
                        />
                      </div>
                    </div>

                    {/* industry */}
                    <div className="grid grid-cols-1 gap-2">
                      <label className="text-sm text-white/70">Industry</label>
                      <select
                        value={form.industry ?? ""}
                        onChange={(e) => update("industry", e.target.value)}
                        className="w-full px-3 py-2 h-10 rounded-md bg-[#06121a] border border-white/8 text-white placeholder-white/40 outline-none focus:ring-2 focus:ring-[#00E3C2]/30"
                      >
                        <option value="">Select industry (optional)</option>
                        {INDUSTRIES.map((it) => (
                          <option key={it.key} value={it.key}>
                            {it.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* terms */}
                    <label className="flex items-start gap-3 text-sm">
                      <input
                        type="checkbox"
                        checked={form.acceptTerms}
                        onChange={(e) => update("acceptTerms", e.target.checked)}
                        className="mt-1 w-4 h-4 bg-[#06121a] border border-white/8 rounded"
                      />
                      <span className="text-white/80">
                        I agree to the <a href="/terms" className="underline">Terms</a> and <a href="/privacy" className="underline">Privacy Policy</a>.
                      </span>
                    </label>

                    {/* server-side password reasons, error and success */}
                    {pwServerReasons && pwServerReasons.length > 0 && (
                      <div className="rounded-md p-3 bg-[rgba(255,255,255,0.02)] border border-yellow-400/10 text-xs text-yellow-200">
                        <div className="font-medium text-yellow-100 mb-1">Password suggestions</div>
                        <ul className="list-disc list-inside space-y-1">
                          {pwServerReasons.map((r, i) => (
                            <li key={i}>{r}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {error && <div className="text-sm text-red-300">{error}</div>}
                    {success && <div className="text-sm text-emerald-300">Account created. Redirecting…</div>}

                    <div className="flex items-center justify-between gap-3">
                      <button
                        type="submit"
                        disabled={!canSubmit || loading}
                        className={`flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 rounded-md font-semibold transition ${
                          canSubmit && !loading ? "bg-[#00E3C2] text-black" : "bg-white/6 text-white/40 cursor-not-allowed"
                        }`}
                      >
                        {loading ? "Creating…" : "Create workspace"}
                      </button>

                      <button
                        type="button"
                        onClick={() => router.push("/auth/login")}
                        className="text-sm text-white/60 hover:text-white/80"
                      >
                        Already have an account?
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>  
    </div>
  );
}
