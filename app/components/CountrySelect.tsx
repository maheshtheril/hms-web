// app/components/CountrySelect.tsx
"use client";

import React, {
  useEffect,
  useRef,
  useState,
  useMemo,
  useCallback,
} from "react";

export interface Country {
  id: string;
  name: string;
  iso2?: string | null;
  flag?: string | null;
}

type Props = {
  countries?: Country[];
  fetchUrl?: string;
  value?: string | null;
  onChange: (id: string) => void;
  placeholder?: string;
  maxItems?: number;
  className?: string;
  autoSelectIso?: string;
};

function normIso2(i?: string | null): string {
  return (i ?? "")
    .toString()
    .replace(/[^A-Za-z]/g, "")
    .trim()
    .slice(0, 2)
    .toUpperCase();
}

// Flag CDN (SVG)
function flagSvgUrl(iso2?: string | null) {
  const s = normIso2(iso2);
  if (!s) return "";
  return `https://flagcdn.com/${s.toLowerCase()}.svg`;
}

function useDebounced<T>(value: T, delay = 160) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return v;
}

export default function CountrySelect({
  countries: countriesProp = [],
  fetchUrl,
  value,
  onChange,
  placeholder = "Select country (optional)",
  maxItems = 200,
  className = "",
  autoSelectIso = "IN",
}: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(-1);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const listRef = useRef<HTMLUListElement | null>(null);
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);

  const [imgFailed, setImgFailed] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(false);
  const [countries, setCountries] = useState<Country[]>(countriesProp);

  // CORE styles used inline so globals can't easily change them.
  const BUTTON_BASE =
    "w-full text-left rounded-2xl px-3 py-2 flex items-center gap-3 border bg-white/6 shadow-lg focus:outline-none";

  // SOLID light-blue gradient (opaque) + white-ish outer border
  // This is intentionally opaque (no backdrop-filter) to *remove* glass transparency.
  const PANEL_STYLE: React.CSSProperties = {
    background: "linear-gradient(180deg, #2b6cb0 0%, #60a5fa 100%)", // solid light-blue gradient
    backgroundColor: "#2b6cb0", // explicit fallback solid color — ensures no transparency
    border: "1px solid rgba(255,255,255,0.95)", // white / high-visibility border
    boxShadow: "0 18px 48px rgba(10,30,80,0.6)",
    borderRadius: 12,
    overflow: "hidden",
    isolation: "isolate",
    zIndex: 2147483640,
    // Make absolutely sure we don't inherit any page-level opacity
    opacity: 1,
  };

  // input base (white focus ring)
  const INPUT_BASE: React.CSSProperties = {
    background: "transparent",
    border: "1px solid rgba(255,255,255,0.12)",
    color: "#fff",
  };

  // sync prop changes
  useEffect(() => setCountries(countriesProp ?? []), [countriesProp]);

  // optional fetch
  useEffect(() => {
    if (!fetchUrl) return;
    let cancelled = false;
    setLoading(true);
    fetch(fetchUrl)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((data) => {
        if (cancelled) return;
        const raw = Array.isArray(data) ? data : data?.data ?? [];
        const list: Country[] = raw.map((c: any, idx: number) => ({
          id: String(c.id ?? c.uuid ?? c._id ?? c.code ?? `country-${idx}`),
          name: String(c.name ?? c.country ?? c.label ?? c.title ?? ""),
          iso2: normIso2(
            c.iso2 ?? c.alpha2 ?? c.code2 ?? c.country_code ?? c.alpha_2 ?? ""
          ),
          flag: c.flag ?? c.emoji ?? null,
        }));
        setCountries(list.length ? list : [
          { id: "IN", name: "India", iso2: "IN", flag: null },
          { id: "US", name: "United States", iso2: "US", flag: null },
        ]);
      })
      .catch(() => {
        if (cancelled) return;
        setCountries([
          { id: "IN", name: "India", iso2: "IN", flag: null },
          { id: "US", name: "United States", iso2: "US", flag: null },
        ]);
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [fetchUrl]);

  // close on outside click
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

  const handleImgError = (id: string) =>
    setImgFailed((p) => ({ ...p, [id]: true }));

  // If some global CSS is still stomping the visuals we absolutely force the panel
  // with element.style.setProperty(..., "important") when it's opened.
  useEffect(() => {
    if (!open) return;
    const el = panelRef.current;
    if (!el) return;

    try {
      // force opaque gradient + white border (prevent glass/backdrop styles from bleeding in)
      el.style.setProperty("background", "linear-gradient(180deg, #2b6cb0 0%, #60a5fa 100%)", "important");
      el.style.setProperty("background-color", "#2b6cb0", "important");
      el.style.setProperty("border", "1px solid rgba(255,255,255,0.95)", "important");
      el.style.setProperty("box-shadow", "0 18px 48px rgba(10,30,80,0.6)", "important");
      el.style.setProperty("background-image", "linear-gradient(180deg, #2b6cb0 0%, #60a5fa 100%)", "important");
      el.style.setProperty("backdrop-filter", "none", "important");
      el.style.setProperty("-webkit-backdrop-filter", "none", "important");
      el.style.setProperty("mix-blend-mode", "normal", "important");
      el.style.setProperty("isolation", "isolate", "important");
      el.style.setProperty("z-index", "2147483640", "important");
      el.style.setProperty("opacity", "1", "important");
      el.style.setProperty("border-radius", "12px", "important");
      el.style.setProperty("overflow", "hidden", "important");
    } catch (e) {
      // some environments may restrict setProperty with important; ignore but fallback inline style exists.
      // eslint-disable-next-line no-console
      console.warn("could not set important styles on country panel", e);
    }
  }, [open]);

  useEffect(() => {
    if (!open) setActiveIndex(-1);
    else setTimeout(() => display.length > 0 && setActiveIndex(0), 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // auto-select default country when list loaded and no value
  useEffect(() => {
    if (value) return;
    if (!countries || countries.length === 0) return;
    const found = countries.find(
      (c) => normIso2(c.iso2) === normIso2(autoSelectIso)
    );
    if (found) onChange(found.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [countries]);

  return (
    <div
      ref={containerRef}
      className={`relative z-50 w-full ${className}`}
      data-component="country-select"
    >
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
        className={`${BUTTON_BASE} focus:ring-2 focus:ring-white/20 focus:border-white`}
        aria-label={selected ? `Country: ${selected.name}` : "Select country"}
      >
        <div className="flex items-center gap-3">
          {selected ? (
            <>
              <span className="text-lg mr-2 leading-none" aria-hidden>
                {selected.iso2 ? (
                  <img
                    src={flagSvgUrl(selected.iso2)}
                    alt={`${selected.name} flag`}
                    className="inline-block w-5 h-4 rounded-sm object-cover"
                    onError={() => handleImgError(selected.id)}
                    style={{ display: imgFailed[selected.id] ? "none" : "inline-block", background: "#fff" }}
                  />
                ) : (
                  <span className="inline-block text-sm leading-none select-none">
                    {normIso2(selected.iso2)}
                  </span>
                )}
                {imgFailed[selected.id] && (
                  <span className="inline-block text-sm leading-none select-none">
                    {normIso2(selected.iso2)}
                  </span>
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
        <div
          id="country-panel"
          ref={panelRef}
          className="absolute mt-2 w-full max-h-64 focus:outline-none"
          style={PANEL_STYLE}
        >
          <div style={{ padding: 8 }}>
            <input
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setActiveIndex(0);
              }}
              placeholder={loading ? "Loading…" : "Search country..."}
              className="w-full rounded-xl px-3 py-2 placeholder:text-white/55 text-white/90 outline-none"
              onKeyDown={(e) => {
                if (e.key === "ArrowDown") {
                  e.preventDefault();
                  moveFocus(0);
                }
              }}
              aria-label="Search countries"
              style={{
                ...INPUT_BASE,
                paddingLeft: 12,
                paddingRight: 12,
              }}
              onFocus={(e) => {
                (e.target as HTMLInputElement).style.boxShadow = "0 0 0 6px rgba(255,255,255,0.08)";
                (e.target as HTMLInputElement).style.border = "1px solid rgba(255,255,255,0.95)";
              }}
              onBlur={(e) => {
                (e.target as HTMLInputElement).style.boxShadow = "none";
                (e.target as HTMLInputElement).style.border = "1px solid rgba(255,255,255,0.12)";
              }}
            />
          </div>

          <ul
            role="listbox"
            ref={listRef}
            tabIndex={-1}
            onKeyDown={(e) => {
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
            }}
            style={{
              overflow: "auto",
              maxHeight: 240,
              padding: 4,
              listStyle: "none",
              margin: 0,
              background: "inherit", // inherit the panel's opaque gradient — prevents any transparency
            }}
          >
            {display.length === 0 ? (
              <li style={{ padding: "8px 12px", color: "rgba(255,255,255,0.95)", fontSize: 12 }}>
                No countries match.
              </li>
            ) : (
              display.map((c, i) => {
                const iso = normIso2(c.iso2);
                const failed = !!imgFailed[c.id];
                const isSelected = c.id === value;
                return (
                  <li key={c.id} style={{ padding: "4px 8px" }}>
                    <button
                      data-index={i}
                      role="option"
                      type="button"
                      onClick={() => handleSelect(c)}
                      onFocus={() => setActiveIndex(i)}
                      aria-selected={isSelected}
                      style={{
                        width: "100%",
                        textAlign: "left",
                        display: "flex",
                        alignItems: "center",
                        gap: 12,
                        padding: "8px 12px",
                        borderRadius: 10,
                        background: isSelected ? "rgba(255,255,255,0.12)" : "transparent",
                        cursor: "pointer",
                      }}
                      onMouseEnter={(e) => {
                        (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.06)";
                      }}
                      onMouseLeave={(e) => {
                        (e.currentTarget as HTMLElement).style.background = isSelected ? "rgba(255,255,255,0.12)" : "transparent";
                      }}
                    >
                      <span style={{ width: 28, display: "inline-flex", alignItems: "center", justifyContent: "center" }} aria-hidden>
                        {iso ? (
                          <img
                            src={flagSvgUrl(iso)}
                            alt={`${c.name} flag`}
                            style={{
                              width: 20,
                              height: 16,
                              borderRadius: 3,
                              display: failed ? "none" : "inline-block",
                              objectFit: "cover",
                              background: "#fff",
                            }}
                            onError={() => handleImgError(c.id)}
                          />
                        ) : (
                          <span style={{ fontSize: 12, color: "rgba(255,255,255,0.95)" }}>{iso ?? ""}</span>
                        )}

                        {failed && (
                          <span style={{ fontSize: 12, color: "rgba(255,255,255,0.95)", marginLeft: 4 }}>
                            {iso ?? ""}
                          </span>
                        )}
                      </span>

                      <span style={{ color: "rgba(255,255,255,0.95)", fontSize: 14 }}>{c.name}</span>
                      <span style={{ marginLeft: "auto", fontSize: 12, color: "rgba(255,255,255,0.95)", fontWeight: 600 }}>{iso}</span>
                    </button>
                  </li>
                );
              })
            )}

            {filtered.length > maxItems && (
              <li style={{ padding: "8px 12px", color: "rgba(255,255,255,0.95)", fontSize: 12 }}>
                Showing first {maxItems} results…
              </li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
