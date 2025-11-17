// app/components/CountrySelect.tsx
"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";

export interface Country {
  id: string;
  name: string;
  iso2?: string | null;
  flag?: string | null; // DB emoji or null
}

type Props = {
  countries: Country[];
  value?: string | null;
  onChange: (id: string) => void;
  placeholder?: string;
  maxItems?: number;
  className?: string;
};

/* ---------- Utilities ---------- */

function iso2ToFlag(iso2?: string | null): string {
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

/**
 * Try to pull a clean flag emoji from DB-provided string.
 * DB sometimes stores "🇮🇳  " (with trailing spaces) or other tags.
 * We scan for regional-indicator codepoints and return the first pair.
 */
function extractFlagEmoji(raw?: string | null): string | null {
  if (!raw) return null;
  // remove common invisible whitespace
  const cleaned = raw.replace(/[\u200B-\u200F\uFEFF\s]+/g, "");
  if (!cleaned) return null;

  // collect regional indicator codepoints (flag emojis use two regional indicators)
  const indicators: number[] = [];
  for (const ch of cleaned) {
    const cp = ch.codePointAt(0) ?? 0;
    // Regional Indicator Symbols range 0x1F1E6..0x1F1FF
    if (cp >= 0x1f1e6 && cp <= 0x1f1ff) {
      indicators.push(cp);
      if (indicators.length === 2) break;
    }
  }
  if (indicators.length === 2) {
    return String.fromCodePoint(indicators[0], indicators[1]);
  }

  // if cleaned itself looks like a short emoji (1-2 visible glyphs) return it
  if (cleaned.length > 0 && cleaned.length <= 4) {
    return cleaned;
  }

  return null;
}

function preferredFlag(c: Country): string | null {
  // first, try to extract a clean emoji from DB flag
  const fromDb = extractFlagEmoji(c.flag ?? null);
  if (fromDb) return fromDb;

  // next, try to compute from iso2
  const isoEmoji = iso2ToFlag(c.iso2 ?? null);
  if (isoEmoji) return isoEmoji;

  return null;
}

function flagSvgUrl(iso2?: string | null) {
  if (!iso2) return "";
  return `https://flagcdn.com/w20/${iso2.toLowerCase()}.png`;
}

/* ---------- Debounce hook (small, safe) ---------- */
function useDebounced<T>(value: T, delay = 180) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return v;
}

/* ---------- Component ---------- */

export default function CountrySelect({
  countries,
  value,
  onChange,
  placeholder = "Select country (optional)",
  maxItems = 200,
  className = "",
}: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const listRef = useRef<HTMLUListElement | null>(null);
  const buttonRef = useRef<HTMLButtonElement | null>(null);

  // Close on outside click
  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!containerRef.current) return;
      if (!containerRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  // Debounce query so rapid typing doesn't trigger heavy filtering renders
  const debouncedQuery = useDebounced(query, 160);
  const q = debouncedQuery.trim().toLowerCase();

  // Memoize filtered list — avoids recompute on unrelated renders
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

  function handleSelect(c: Country) {
    onChange(c.id);
    setOpen(false);
    setQuery("");
    setActiveIndex(-1);
    buttonRef.current?.focus();
  }

  // helper to move focus to an index reliably (avoids stale-closure race)
  const moveFocus = useCallback((toIndex: number) => {
    const safeIndex = Math.max(0, Math.min(toIndex, display.length - 1));
    setActiveIndex(safeIndex);
    // focus after DOM update
    requestAnimationFrame(() => {
      const el = listRef.current?.querySelector(`[data-index='${safeIndex}']`) as HTMLButtonElement | null;
      el?.focus();
    });
  }, [display.length]);

  // keyboard handling for trigger
  function onTriggerKey(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown" || e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      setOpen(true);
      setTimeout(() => {
        // focus first item when opened
        if (display.length > 0) moveFocus(0);
      }, 0);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  function onListKey(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      moveFocus((activeIndex < 0 ? 0 : activeIndex + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      moveFocus((activeIndex <= 0 ? 0 : activeIndex - 1));
    } else if (e.key === "Enter" && activeIndex >= 0) {
      e.preventDefault();
      const c = display[activeIndex];
      if (c) handleSelect(c);
    } else if (e.key === "Escape") {
      setOpen(false);
      buttonRef.current?.focus();
    }
  }

  // fallback handler: hide broken imgs and rely on iso2 text
  const handleImgError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    const img = e.currentTarget;
    img.style.display = "none";
    img.setAttribute("aria-hidden", "true");
  };

  return (
    <div ref={containerRef} className={`relative z-50 w-full ${className}`}>
      <button
        ref={buttonRef}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls="country-listbox"
        role="combobox"
        onClick={() => {
          setOpen((v) => !v);
          if (!open) {
            setTimeout(() => {
              if (display.length > 0) moveFocus(0);
            }, 0);
          }
        }}
        onKeyDown={onTriggerKey}
        className="w-full text-left rounded-2xl px-3 py-2 flex items-center gap-3 border border-white/10 bg-zinc-800 shadow-lg"
        aria-label="Choose country"
      >
        <div className="flex items-center gap-3">
          {selected ? (
            <>
              <span className="text-lg leading-none mr-2" aria-hidden style={{ lineHeight: 1 }}>
                {preferredFlag(selected) ?? (selected.iso2 ? (
                  <img src={flagSvgUrl(selected.iso2)} alt="" className="inline-block w-5 h-4 rounded-sm object-cover" onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }} />
                ) : null)}
              </span>
              <span className="text-sm font-medium text-white/95">{selected.name}</span>
            </>
          ) : (
            <span className="text-sm text-white/60">{placeholder}</span>
          )}
        </div>

        <div className="ml-auto text-white/50 text-xs">{open ? "⌃" : "⌄"}</div>
      </button>

      {/* a11y live region to announce selection changes */}
      <div aria-live="polite" className="sr-only">
        {selected ? `${selected.name} selected` : "No country selected"}
      </div>

      {open && (
        <div className="absolute mt-2 w-full rounded-2xl bg-zinc-900 border border-white/8 shadow-2xl max-h-64 overflow-hidden">
          <div className="p-2">
            <input
              data-role="country-search"
              value={query}
              onChange={(e) => { setQuery(e.target.value); setActiveIndex(0); }}
              onKeyDown={(e) => { if (e.key === "ArrowDown") { e.preventDefault(); const el = listRef.current?.querySelector("[data-index='0']") as HTMLButtonElement | null; el?.focus(); } }}
              placeholder="Search country..."
              aria-label="Search countries"
              className="w-full rounded-xl px-3 py-2 bg-transparent border border-white/6 placeholder:text-white/40 text-white/90 outline-none"
            />
          </div>

          <ul
            id="country-listbox"
            role="listbox"
            ref={listRef}
            tabIndex={-1}
            aria-activedescendant={activeIndex >= 0 && display[activeIndex] ? `country-${display[activeIndex].id}` : undefined}
            onKeyDown={onListKey}
            className="overflow-auto max-h-48"
          >
            {display.length === 0 ? (
              <li className="px-3 py-2 text-xs text-white/50">No countries match.</li>
            ) : (
              display.map((c, i) => {
                const f = preferredFlag(c);
                return (
                  <li key={c.id} id={`country-${c.id}`} className="px-2">
                    <button
                      role="option"
                      data-index={i}
                      type="button"
                      onClick={() => handleSelect(c)}
                      onFocus={() => setActiveIndex(i)}
                      aria-selected={c.id === value}
                      className={`w-full text-left flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/6 transition ${c.id === value ? "bg-white/6" : ""}`}
                    >
                      <span className="w-6 text-lg leading-none" aria-hidden style={{ lineHeight: 1 }}>
                        {/* show emoji if available, else try CDN img, else ISO2 letters */}
                        {f ?? (c.iso2 ? (
                          <>
                            <img src={flagSvgUrl(c.iso2)} alt={`${c.name} flag`} className="inline-block w-5 h-4 rounded-sm object-cover" onError={handleImgError} />
                            <span className="sr-only">{c.name} flag</span>
                          </>
                        ) : <span className="text-white/40 text-sm">{(c.iso2 || "").toUpperCase()}</span>)}
                      </span>

                      <span className="text-sm text-white/90">{c.name}</span>
                      <span className="ml-auto text-xs text-white/50">{c.iso2?.toUpperCase() ?? ""}</span>
                    </button>
                  </li>
                );
              })
            )}
            {filtered.length > maxItems && <li className="px-3 py-2 text-xs text-white/50">Showing first {maxItems} results...</li>}
          </ul>
        </div>
      )}
    </div>
  );
}
