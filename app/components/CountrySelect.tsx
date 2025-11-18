"use client";

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

export interface Country {
  id: string;
  name: string;
  iso2?: string | null;
  flag?: string | null;
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

// normalize iso2 once
function normIso2(i?: string | null): string {
  return (i ?? "").toString().trim().slice(0, 2).toUpperCase();
}

// generate emoji from ISO2 (regional indicator symbols)
function iso2ToFlag(iso2?: string | null): string {
  const s = normIso2(iso2);
  if (s.length !== 2) return "";
  // 'A' => 65; regional indicator starts at 127462 for 'A'
  return Array.from(s)
    .map((c) => String.fromCodePoint(127397 + c.charCodeAt(0)))
    .join("");
}

/**
 * Try to extract a flag emoji from the raw field.
 * Supports:
 * - pairs of regional indicator symbols (🇮🇳)
 * - short emoji-like strings (<=4 characters)
 */
function extractFlagEmoji(raw?: string | null): string | null {
  if (!raw) return null;

  // remove invisible characters & whitespace
  const cleaned = raw.replace(/[\u200B-\u200F\uFEFF\s]+/g, "").trim();
  if (!cleaned) return null;

  // regex for two regional indicator symbols (works with surrogate pairs)
  const reg = /(\uD83C[\uDDE6-\uDDFF]){2}/u;
  const match = cleaned.match(reg);
  if (match) return match[0];

  // if what's left is short (some DBs store a single char or short text)
  if ([...cleaned].length <= 4) return cleaned;

  return null;
}

function preferredFlag(c: Country): string | null {
  const db = extractFlagEmoji(c.flag ?? null);
  if (db) return db;

  const isoEmoji = iso2ToFlag(c.iso2 ?? null);
  if (isoEmoji) return isoEmoji;

  return null;
}

function flagSvgUrl(iso2?: string | null) {
  const s = normIso2(iso2);
  if (!s) return "";
  // smaller size is fine for inline icons; use PNG (widely supported)
  return `https://flagcdn.com/w20/${s.toLowerCase()}.png`;
}

/* ---------- Debounce ---------- */

function useDebounced<T>(value: T, delay = 160) {
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

  // Close dropdown when clicking outside
  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!containerRef.current) return;
      if (!containerRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  // Debounced query
  const debouncedQuery = useDebounced(query, 160);
  const q = debouncedQuery.trim().toLowerCase();

  // Filter countries (memoized)
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

  // Keyboard on trigger
  function onTriggerKey(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown" || e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      setOpen(true);
      setTimeout(() => display.length > 0 && moveFocus(0), 0);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  // Keyboard on dropdown
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
    // hide only the image so emoji/ISO fallback shows
    e.currentTarget.style.display = "none";
    // ensure parent remains accessible
    e.currentTarget.setAttribute("aria-hidden", "true");
  };

  // small accessibility: when opening, reset activeIndex
  useEffect(() => {
    if (!open) {
      setActiveIndex(-1);
    } else {
      setTimeout(() => display.length > 0 && setActiveIndex(0), 0);
    }
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
          setOpen(!open);
          if (!open && display.length > 0) setTimeout(() => moveFocus(0), 0);
        }}
        onKeyDown={onTriggerKey}
        className="w-full text-left rounded-2xl px-3 py-2 flex items-center gap-3 border border-white/10 bg-zinc-800 shadow-lg"
        aria-label={selected ? `Country: ${selected.name}` : "Select country"}
      >
        <div className="flex items-center gap-3">
          {selected ? (
            <>
              <span className="text-lg mr-2 leading-none" aria-hidden>
                {preferredFlag(selected) ?? (
                  selected.iso2 ? (
                    <img
                      src={flagSvgUrl(selected.iso2)}
                      alt={`${selected.name} flag`}
                      className="inline-block w-5 h-4 rounded-sm object-cover"
                      onError={handleImgError}
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
        </div>
        <div className="ml-auto text-white/50 text-xs">
          {open ? "⌃" : "⌄"}
        </div>
      </button>

      {open && (
        <div className="absolute mt-2 w-full rounded-2xl bg-zinc-900 border border-white/8 shadow-2xl max-h-64 overflow-hidden">
          <div className="p-2">
            <input
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setActiveIndex(0);
              }}
              placeholder="Search country..."
              className="w-full rounded-xl px-3 py-2 bg-transparent border border-white/6 placeholder:text-white/40 text-white/90 outline-none"
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
            className="overflow-auto max-h-48"
          >
            {display.length === 0 ? (
              <li className="px-3 py-2 text-xs text-white/50">
                No countries match.
              </li>
            ) : (
              display.map((c, i) => {
                const f = preferredFlag(c);
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
                      className={`w-full text-left flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/6 transition ${
                        c.id === value ? "bg-white/6" : ""
                      }`}
                    >
                      <span className="w-6 text-lg leading-none" aria-hidden>
                        {f ?? (iso ? (
                          <img
                            src={flagSvgUrl(iso)}
                            alt={`${c.name} flag`}
                            className="inline-block w-5 h-4 rounded-sm object-cover"
                            onError={handleImgError}
                          />
                        ) : (
                          <span className="text-white/40 text-sm">
                            {iso || ""}
                          </span>
                        ))}
                      </span>

                      <span className="text-sm text-white/90">{c.name}</span>
                      <span className="ml-auto text-xs text-white/50">
                        {iso}
                      </span>
                    </button>
                  </li>
                );
              })
            )}

            {filtered.length > maxItems && (
              <li className="px-3 py-2 text-xs text-white/50">
                Showing first {maxItems} results…
              </li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
