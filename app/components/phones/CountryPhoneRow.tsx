"use client";
import React from "react";

type Country = { iso2: "IN"|"AE"|"US"|"GB"|"SG"|"SA"; name:string; dial:string };

export const COUNTRIES: Country[] = [
  { iso2: "IN", name: "India", dial: "91" },
  { iso2: "AE", name: "United Arab Emirates", dial: "971" },
  { iso2: "US", name: "United States", dial: "1" },
  { iso2: "GB", name: "United Kingdom", dial: "44" },
  { iso2: "SG", name: "Singapore", dial: "65" },
  { iso2: "SA", name: "Saudi Arabia", dial: "966" },
];

export const dialOf = (iso2: string) => COUNTRIES.find(c => c.iso2 === iso2)?.dial ?? "91";
export const countryOf = (iso2: string) => COUNTRIES.find(c => c.iso2 === iso2) ?? COUNTRIES[0];

// ---------- Flag helpers (same behavior as Quick Lead) ----------
const A = 0x1f1e6;
const iso2ToEmoji = (iso2: string) =>
  iso2.toUpperCase().split("").map(c => String.fromCodePoint(A + c.charCodeAt(0) - 65)).join("");

const flagClass = (iso2: string) => `fi fi-${iso2.toLowerCase()}`;

function FlagIcon({ iso2, width = 20, height = 14 }: { iso2: string; width?: number; height?: number }) {
  const ref = React.useRef<HTMLSpanElement>(null);
  const [fallback, setFallback] = React.useState<string | null>(null);

  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;
    // If flag-icons CSS isn't present, backgroundImage will be 'none' → fallback to emoji
    const bg = getComputedStyle(el).backgroundImage;
    if (!bg || bg === "none") setFallback(iso2ToEmoji(iso2));
  }, [iso2]);

  if (fallback) {
    return (
      <span
        aria-hidden
        style={{ width, height, display: "inline-grid", placeItems: "center", fontSize: Math.round(height * 0.9) }}
      >
        {fallback}
      </span>
    );
  }
  return <span ref={ref} aria-hidden className={`${flagClass(iso2)} block`} style={{ width, height, borderRadius: 3 }} />;
}

// ---------- Small utils ----------
function useClickOutside<T extends HTMLElement>(ref: React.RefObject<T>, onOutside: () => void) {
  React.useEffect(() => {
    function onDoc(e: MouseEvent) {
      const el = ref.current;
      if (!el) return;
      if (!el.contains(e.target as Node)) onOutside();
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [ref, onOutside]);
}

function CaretDown({ className = "" }) {
  return (
    <svg className={className} width="14" height="14" viewBox="0 0 24 24" aria-hidden>
      <path fill="currentColor" d="M7 10l5 5 5-5z" />
    </svg>
  );
}

// ---------- The shared phone row (now shows SVG flags like Quick Lead) ----------
export function CountryPhoneRow({
  phone_country, phone_national, onChangeCountry, onChangeNational, InputComp,
}: {
  phone_country: string;
  phone_national: string;
  onChangeCountry: (iso2: string) => void;
  onChangeNational: (v: string) => void;
  /** your Input component */
  InputComp: React.ComponentType<React.InputHTMLAttributes<HTMLInputElement>>;
}) {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);
  useClickOutside(ref, () => setOpen(false));
  const c = countryOf(phone_country);
  const prefix = `+${c.dial}`;

  return (
    <div className="relative flex gap-2" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-sm hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-white/20"
        aria-haspopup="listbox" aria-expanded={open}
      >
        <FlagIcon iso2={c.iso2} />
        <span className="tabular-nums">+{c.dial}</span>
        <CaretDown className="opacity-70" />
      </button>

      <div className="flex-1 relative">
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs opacity-70">{prefix}</span>
        <InputComp
          className="pl-12"
          inputMode="numeric"
          placeholder="XXXXXXXXXX"
          value={phone_national}
          onChange={(e: any) => onChangeNational(String(e.target.value).replace(/[^\d]/g, ""))}
        />
      </div>

      {open && (
        <div role="listbox" className="absolute z-50 mt-2 w-72 rounded-2xl border border-white/10 bg-zinc-900 text-zinc-100 shadow-2xl p-2 left-0">
          <div className="max-h-56 overflow-auto pr-1">
            {COUNTRIES.map(opt => (
              <button
                key={opt.iso2}
                type="button"
                onClick={() => { onChangeCountry(opt.iso2); setOpen(false); }}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm ${opt.iso2===phone_country ? "bg-white/15" : "hover:bg-white/10"}`}
              >
                <div className="flex items-center gap-2">
                  <FlagIcon iso2={opt.iso2} />
                  <span className="flex-1">{opt.name}</span>
                  <span className="opacity-80">+{opt.dial}</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
