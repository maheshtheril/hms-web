// components/CountrySelect.tsx
"use client";

import React, { useEffect, useRef, useState } from "react";

export interface Country {
  id: string;
  name: string;
  iso2?: string | null;
  flag?: string | null; // DB emoji or null
}

type Props = {
  countries: Country[];
  value: string | "";
  onChange: (id: string) => void;
  placeholder?: string;
  maxItems?: number;
  className?: string;
};

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

function preferredFlag(c: Country): string | null {
  // normalize DB flag and return emoji or null
  const dbFlag = (c.flag || "").toString().trim();
  if (dbFlag) {
    // sometimes DB has trailing whitespace — trim it
    return dbFlag;
  }
  const emoji = iso2ToFlag(c.iso2);
  if (emoji) return emoji;
  return null;
}

function flagSvgUrl(iso2?: string | null) {
  if (!iso2) return "";
  return `https://flagcdn.com/w20/${iso2.toLowerCase()}.png`;
}

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

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!containerRef.current) return;
      if (!containerRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const q = query.trim().toLowerCase();
  const filtered = countries.filter((c) =>
    !q
      ? true
      : (c.name || "").toLowerCase().includes(q) ||
        (c.iso2 || "").toLowerCase().includes(q)
  );

  const display = filtered.slice(0, maxItems);
  const selected = countries.find((c) => c.id === value) ?? null;

  function handleSelect(c: Country) {
    onChange(c.id);
    setOpen(false);
    setQuery("");
    buttonRef.current?.focus();
  }

  // small accessibility keyboard handling
  function onTriggerKey(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown" || e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      setOpen(true);
      setTimeout(() => {
        setActiveIndex(0);
        const first = listRef.current?.querySelector("[data-index='0']") as HTMLButtonElement | null;
        first?.focus();
      }, 0);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  function onListKey(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, display.length - 1));
      setTimeout(() => {
        const el = listRef.current?.querySelector(`[data-index='${Math.min(activeIndex + 1, display.length - 1)}']`) as HTMLButtonElement | null;
        el?.focus();
      }, 0);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
      setTimeout(() => {
        const el = listRef.current?.querySelector(`[data-index='${Math.max(activeIndex - 1, 0)}']`) as HTMLButtonElement | null;
        el?.focus();
      }, 0);
    } else if (e.key === "Enter" && activeIndex >= 0) {
      e.preventDefault();
      const c = display[activeIndex];
      if (c) handleSelect(c);
    } else if (e.key === "Escape") {
      setOpen(false);
      buttonRef.current?.focus();
    }
  }

  return (
    <div ref={containerRef} className={`relative z-50 w-full ${className}`}>
      <button
        ref={buttonRef}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        onKeyDown={onTriggerKey}
        className="w-full text-left rounded-2xl px-3 py-2 flex items-center gap-3 border border-white/10 bg-white/3 backdrop-blur-sm shadow-lg"
        aria-label="Choose country"
      >
        <div className="flex items-center gap-3">
          {selected ? (
            <>
              <span className="text-lg leading-none mr-2" aria-hidden style={{ lineHeight: 1 }}>
                {preferredFlag(selected) ?? (selected.iso2 ? <img src={flagSvgUrl(selected.iso2)} alt="" className="inline-block w-5 h-4 rounded-sm object-cover" /> : null)}
              </span>
              <span className="text-sm font-medium text-white/95">{selected.name}</span>
            </>
          ) : (
            <span className="text-sm text-white/60">{placeholder}</span>
          )}
        </div>

        <div className="ml-auto text-white/50 text-xs">{open ? "⌃" : "⌄"}</div>
      </button>

      {open && (
        <div className="absolute mt-2 w-full rounded-2xl bg-gradient-to-b from-white/6 to-white/4 border border-white/8 shadow-2xl backdrop-blur-md max-h-64 overflow-hidden">
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
                      data-index={i}
                      type="button"
                      onClick={() => handleSelect(c)}
                      onFocus={() => setActiveIndex(i)}
                      aria-selected={c.id === value}
                      className={`w-full text-left flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/6 transition ${c.id === value ? "bg-white/6" : ""}`}
                    >
                      <span className="w-6 text-lg leading-none" aria-hidden style={{ lineHeight: 1 }}>
                        {f ?? (c.iso2 ? <img src={flagSvgUrl(c.iso2)} alt={`${c.name} flag`} className="inline-block w-5 h-4 rounded-sm object-cover" /> : <span className="text-white/40 text-sm">{(c.iso2 || "").toUpperCase()}</span>)}
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
