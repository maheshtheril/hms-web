"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import CompanySelector from "../CompanySelector";
import { useMenu } from "@/providers/MenuProvider";
import Link from "next/link";
import Image from "next/image";
import clsx from "clsx";

/**
 * useOutsideClick — bulletproof & typed-safe for TS environments
 * - Uses `any` for window when attaching listeners so TS won't infer `never`
 * - Prefers pointer events, falls back to mouse+touch
 * - SSR-safe (guards against window)
 */
function useOutsideClick<T extends HTMLElement = HTMLElement>(ref: React.RefObject<T>, onOutside: () => void) {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!ref?.current) return;

    const handler = (e: Event) => {
      try {
        const target = e.target as Node | null;
        if (!ref.current || !target) return;
        if (!(ref.current as any).contains(target)) onOutside();
      } catch {
        // ignore unexpected shapes
      }
    };

    // use any to avoid TS narrowing issues across lib/TS versions
    const win: any = window;

    // prefer pointer events when available
    if (win && "onpointerdown" in win) {
      win.addEventListener("pointerdown", handler);
      return () => {
        try {
          win.removeEventListener("pointerdown", handler);
        } catch {}
      };
    }

    // fallback to mousedown + touchstart
    win.addEventListener("mousedown", handler);
    win.addEventListener("touchstart", handler);
    return () => {
      try {
        win.removeEventListener("mousedown", handler);
        win.removeEventListener("touchstart", handler);
      } catch {}
    };
  }, [ref, onOutside]);
}

/** Hook: debounced value */
function useDebouncedValue<T>(value: T, delay = 300) {
  const [v, setV] = useState<T>(value);
  useEffect(() => {
    const id = setTimeout(() => setV(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return v;
}

/* ----------------------------- Types ----------------------------- */

type NotificationItem = {
  id: string;
  title: string;
  body?: string;
  url?: string;
  read?: boolean;
  created_at?: string;
};

/* ----------------------------- Topbar (production-ready) ----------------------------- */

export default function Topbar() {
  const { companies } = useMenu();

  return (
    <header
      className="
        fixed left-64 right-0 top-0 h-16 z-30
        bg-[rgba(255,255,255,0.05)]
        backdrop-blur-xl border-b border-white/10
        flex items-center justify-between px-4 md:px-6
      "
      role="banner"
    >
      <div className="flex items-center gap-4 min-w-0">
        <div className="hidden lg:block">
          <CompanySelector />
        </div>

        <div className="block lg:hidden">
          <div className="text-sm text-white/90">{companies && companies.length ? companies[0].name : "No company"}</div>
        </div>

        <div className="ml-2 -mr-2 md:ml-6 md:mr-0 w-full max-w-[720px]">
          <SearchBox />
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Notifications />
        <ProfileMenu />
      </div>
    </header>
  );
}

/* ----------------------------- SearchBox ----------------------------- */

function SearchBox() {
  const [q, setQ] = useState("");
  const debouncedQ = useDebouncedValue(q, 300);
  const [results, setResults] = useState<any[] | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);
  useOutsideClick(ref, () => setIsOpen(false));

  useEffect(() => {
    if (!debouncedQ || debouncedQ.trim().length < 2) {
      setResults(null);
      return;
    }

    let mounted = true;
    (async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(debouncedQ)}`, { headers: { Accept: "application/json" } });
        if (!mounted) return;
        if (!res.ok) {
          setResults([]);
          return;
        }
        const data = await res.json();
        setResults(Array.isArray(data) ? data : data.results ?? []);
        setIsOpen(true);
      } catch (err) {
        console.error("search failed", err);
        setResults([]);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [debouncedQ]);

  return (
    <div ref={ref} className="relative w-full">
      <label htmlFor="global-search" className="sr-only">Search</label>
      <div className="relative">
        <input
          id="global-search"
          className="w-full rounded-xl bg-white/4 placeholder:text-white/40 text-white px-4 py-2 focus:outline-none focus:ring-2 focus:ring-white/20"
          placeholder="Search leads, patients, invoices, orders..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onFocus={() => { if (results && results.length) setIsOpen(true); }}
          aria-autocomplete="list"
        />
        <div className="absolute right-3 top-1/2 -translate-y-1/2 text-white/60">
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path d="M21 21l-4.35-4.35" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            <circle cx="11" cy="11" r="6" stroke="currentColor" strokeWidth="2" />
          </svg>
        </div>
      </div>

      {isOpen && results && (
        <div className="absolute left-0 right-0 mt-2 bg-[rgba(0,0,0,0.55)] border border-white/6 rounded-lg shadow-lg z-50">
          {results.length === 0 ? (
            <div className="p-3 text-sm text-white/70">No results</div>
          ) : (
            <ul className="max-h-72 overflow-auto">
              {results.map((r: any) => (
                <li key={r.id ?? JSON.stringify(r)} className="p-3 hover:bg-white/3">
                  <a href={r.url ?? "#"} className="block text-sm text-white truncate">
                    <div className="font-medium">{r.title ?? r.name ?? r.label}</div>
                    {r.subtitle && <div className="text-xs text-white/60 mt-1 truncate">{r.subtitle}</div>}
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

/* ----------------------------- Notifications ----------------------------- */

function Notifications() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);
  useOutsideClick(ref, () => setOpen(false));

  useEffect(() => {
    let mounted = true;
    let interval: number | null = null;

    async function load() {
      setLoading(true);
      try {
        const res = await fetch(`/api/notifications`, { headers: { Accept: "application/json" } });
        if (!mounted) return;
        if (!res.ok) {
          setItems([]);
          return;
        }
        const data = await res.json();
        setItems(Array.isArray(data) ? data : data.items ?? []);
      } catch (err) {
        console.error("notifications fetch failed", err);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    load().catch(() => {});
    interval = window.setInterval(() => load().catch(() => {}), 30_000);

    return () => {
      mounted = false;
      if (interval) clearInterval(interval);
    };
  }, []);

  const unreadCount = items.filter((i) => !i.read).length;

  return (
    <div className="relative" ref={ref}>
      <button
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen((s) => !s)}
        className="p-2 rounded hover:bg-white/5 focus:outline-none focus:ring-2 focus:ring-white/20"
        title="Notifications"
      >
        <div className="relative">
          <svg className="w-5 h-5 text-white/90" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path d="M15 17h5l-1.405-1.405A2.032 2.032 0 0 1 18 14.158V11a6 6 0 1 0-12 0v3.159c0 .538-.214 1.055-.595 1.436L4 17h11z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>

          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 inline-flex items-center justify-center px-1.5 py-0.5 text-[10px] font-semibold rounded-full bg-rose-500 text-white">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </div>
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-96 bg-[rgba(0,0,0,0.6)] border border-white/6 rounded-lg shadow-lg z-50">
          <div className="p-3 border-b border-white/6 flex items-center justify-between">
            <div className="text-sm font-medium text-white">Notifications</div>
            <div className="text-xs text-white/60">{loading ? "Loading…" : `${items.length} total`}</div>
          </div>

          <div className="max-h-72 overflow-auto">
            {items.length === 0 ? (
              <div className="p-4 text-sm text-white/60">No notifications</div>
            ) : (
              <ul className="divide-y divide-white/6">
                {items.map((n) => (
                  <li key={n.id} className={clsx("p-3 hover:bg-white/3", n.read ? "opacity-80" : "bg-white/2")}>
                    <a href={n.url ?? "#"} className="block">
                      <div className="text-sm text-white font-medium">{n.title}</div>
                      {n.body && <div className="text-xs text-white/70 mt-1">{n.body}</div>}
                      <div className="text-[11px] text-white/50 mt-2">{n.created_at ? new Date(n.created_at).toLocaleString() : ""}</div>
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="p-2 border-t border-white/6 flex items-center justify-between">
            <button
              onClick={async () => {
                try {
                  await fetch("/api/notifications/mark-all-read", { method: "POST" });
                  setItems((prev) => prev.map((i) => ({ ...i, read: true })));
                } catch (err) {
                  console.error("mark all read failed", err);
                }
              }}
              className="text-sm text-white/90 hover:underline px-3 py-1 rounded"
            >
              Mark all read
            </button>

            <Link href="/notifications" className="text-sm text-white/90 hover:underline px-3 py-1 rounded">
              View all
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

/* ----------------------------- ProfileMenu ----------------------------- */

function ProfileMenu() {
  const ref = useRef<HTMLDivElement | null>(null);
  const [open, setOpen] = useState(false);
  useOutsideClick(ref, () => setOpen(false));

  const [user, setUser] = useState<{ id?: string; name?: string; email?: string; avatar_url?: string } | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await fetch("/api/me", { headers: { Accept: "application/json" } });
        if (!mounted) return;
        if (res.ok) {
          const d = await res.json();
          setUser(d.user ?? d);
        } else {
          setUser(null);
        }
      } catch (err) {
        console.error("fetch /api/me failed", err);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const handleLogout = useCallback(async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
      window.location.href = "/auth/login";
    } catch (err) {
      console.error("logout failed", err);
      window.location.href = "/auth/login";
    }
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((s) => !s)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex items-center gap-2 p-1 rounded hover:bg-white/5 focus:outline-none focus:ring-2 focus:ring-white/20"
      >
        {user?.avatar_url ? (
          <Image src={user.avatar_url} alt={user.name ?? "avatar"} width={28} height={28} className="rounded-full" />
        ) : (
          <div className="w-7 h-7 rounded-full bg-white/8 flex items-center justify-center text-xs text-white/90">
            {user?.name ? user.name.charAt(0).toUpperCase() : "U"}
          </div>
        )}

        <div className="hidden sm:flex flex-col text-left">
          <span className="text-sm text-white/90 leading-4">{user?.name ?? "User"}</span>
          <span className="text-xs text-white/60 leading-4">{user?.email ?? ""}</span>
        </div>
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-56 bg-[rgba(0,0,0,0.6)] border border-white/6 rounded-lg shadow-lg z-50">
          <div className="p-3 border-b border-white/6">
            <div className="text-sm font-medium text-white">{user?.name ?? "User"}</div>
            <div className="text-xs text-white/60">{user?.email ?? ""}</div>
          </div>

          <div className="flex flex-col divide-y divide-white/6">
            <Link href="/account" className="px-3 py-2 text-sm text-white hover:bg-white/3">Account</Link>
            <Link href="/settings" className="px-3 py-2 text-sm text-white hover:bg-white/3">Settings</Link>
            <Link href="/billing" className="px-3 py-2 text-sm text-white hover:bg-white/3">Billing</Link>
            <button onClick={handleLogout} className="text-left px-3 py-2 text-sm text-white hover:bg-white/3">Logout</button>
          </div>
        </div>
      )}
    </div>
  );
}
