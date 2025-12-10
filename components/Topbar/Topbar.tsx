"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import CompanySelector from "../CompanySelector";
import { useMenu } from "@/providers/MenuProvider";
import Link from "next/link";
import Image from "next/image";
import clsx from "clsx";
import apiClient from "@/lib/api-client";

/* ----------------------------- Error Helper ----------------------------- */
function getErrorMessage(e: unknown): string {
  if (typeof e === "string") return e;
  if (e instanceof Error) return e.message;
  try {
    const a = e as any;
    if (a?.response?.data?.message) return String(a.response.data.message);
    if (a?.message) return String(a.message);
    return JSON.stringify(a);
  } catch {
    return String(e);
  }
}

/* ----------------------------- Outside Click ----------------------------- */
function useOutsideClick<T extends HTMLElement = HTMLElement>(ref: React.RefObject<T>, onOutside: () => void) {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!ref?.current) return;

    const handler = (e: Event) => {
      const target = e.target as Node | null;
      if (!ref.current || !target) return;
      if (!(ref.current as any).contains(target)) onOutside();
    };

    const win: any = window;

    if ("onpointerdown" in win) {
      win.addEventListener("pointerdown", handler);
      return () => win.removeEventListener("pointerdown", handler);
    }

    win.addEventListener("mousedown", handler);
    win.addEventListener("touchstart", handler);
    return () => {
      win.removeEventListener("mousedown", handler);
      win.removeEventListener("touchstart", handler);
    };
  }, [ref, onOutside]);
}

/* ----------------------------- Debounce ----------------------------- */
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

/* ----------------------------- Topbar ----------------------------- */
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
          <div className="text-sm text-white/90">
            {companies?.length ? companies[0].name : "No company"}
          </div>
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
        const r = await apiClient.get("/search", { params: { q: debouncedQ } });
        if (!mounted) return;
        const data = r.data ?? [];
        const arr = Array.isArray(data) ? data : data.results ?? [];
        setResults(arr);
        if (arr.length > 0) setIsOpen(true);
      } catch (err) {
        console.warn("search failed:", getErrorMessage(err));
        if (mounted) setResults([]);
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
          className="w-full rounded-xl bg-white/4 placeholder:text-white/40 text-white px-4 py-2
                     focus:outline-none focus:ring-2 focus:ring-white/20"
          placeholder="Search leads, patients, invoices, orders..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onFocus={() => results?.length && setIsOpen(true)}
        />
        <div className="absolute right-3 top-1/2 -translate-y-1/2 text-white/60">
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none">
            <path d="M21 21l-4.35-4.35" stroke="currentColor" strokeWidth="2" />
            <circle cx="11" cy="11" r="6" stroke="currentColor" strokeWidth="2" />
          </svg>
        </div>
      </div>

      {isOpen && results && (
        <div className="absolute left-0 right-0 mt-2 bg-[rgba(0,0,0,0.55)] border border-white/6
                        rounded-lg shadow-lg z-50">
          {results.length === 0 ? (
            <div className="p-3 text-sm text-white/70">No results</div>
          ) : (
            <ul className="max-h-72 overflow-auto">
              {results.map((r: any) => (
                <li key={r.id ?? JSON.stringify(r)} className="p-3 hover:bg-white/3">
                  <a href={r.url ?? "#"} className="block text-sm text-white truncate">
                    <div className="font-medium">{r.title ?? r.name ?? r.label}</div>
                    {r.subtitle && (
                      <div className="text-xs text-white/60 mt-1 truncate">{r.subtitle}</div>
                    )}
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
  const [authChecked, setAuthChecked] = useState(false);
  const [isAuthed, setIsAuthed] = useState(false);

  const ref = useRef<HTMLDivElement | null>(null);
  useOutsideClick(ref, () => setOpen(false));

  const failures = useRef(0);
  const intervalId = useRef<number | null>(null);

  // Probe /api/me
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const r = await apiClient.get("/me");
        if (!mounted) return;
        setIsAuthed(r.status === 200);
      } catch {
        setIsAuthed(false);
      } finally {
        if (mounted) setAuthChecked(true);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  // Polling
  useEffect(() => {
    if (!authChecked || !isAuthed) return;

    let mounted = true;

    const load = async () => {
      setLoading(true);
      try {
        const r = await apiClient.get("/notifications");
        if (!mounted) return;
        const data = r.data ?? [];
        setItems(Array.isArray(data) ? data : data.items ?? []);
        failures.current = 0;
      } catch (err) {
        failures.current += 1;
        console.warn("notifications fetch:", getErrorMessage(err));

        if (failures.current >= 3 && intervalId.current) {
          clearInterval(intervalId.current);
          intervalId.current = null;
        }
      } finally {
        if (mounted) setLoading(false);
      }
    };

    load().catch(() => {});
    intervalId.current = window.setInterval(() => load().catch(() => {}), 30_000);

    return () => {
      mounted = false;
      if (intervalId.current) {
        clearInterval(intervalId.current);
        intervalId.current = null;
      }
    };
  }, [authChecked, isAuthed]);

  const unread = items.filter((i) => !i.read).length;

  const markAllRead = async () => {
    try {
      await apiClient.post("/notifications/mark-all-read");
      setItems((prev) => prev.map((i) => ({ ...i, read: true })));
    } catch (err) {
      console.warn("mark all read:", getErrorMessage(err));
    }
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((s) => !s)}
        className="p-2 rounded hover:bg-white/5 focus:ring-2 focus:ring-white/20"
      >
        <div className="relative">
          <svg className="w-5 h-5 text-white/90" viewBox="0 0 24 24" fill="none">
            <path d="M15 17h5l-1.405-1.405A2.032 2.032 0 0 1 18 14.158V11a6 6 0 1 0-12 0v3.159c0 .538-.214 1.055-.595 1.436L4 17h11z"
              stroke="currentColor" strokeWidth="1.5" />
          </svg>

          {unread > 0 && (
            <span className="absolute -top-1 -right-1 inline-flex items-center justify-center
                             px-1.5 py-0.5 text-[10px] font-semibold rounded-full bg-rose-500 text-white">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </div>
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-96 bg-[rgba(0,0,0,0.6)] border border-white/6
                        rounded-lg shadow-lg z-50">
          <div className="p-3 border-b border-white/6 flex justify-between">
            <div className="text-sm text-white font-medium">Notifications</div>
            <div className="text-xs text-white/60">
              {loading ? "Loading…" : `${items.length} total`}
            </div>
          </div>

          <div className="max-h-72 overflow-auto">
            {items.length === 0 ? (
              <div className="p-4 text-sm text-white/60">No notifications</div>
            ) : (
              <ul className="divide-y divide-white/6">
                {items.map((n) => (
                  <li
                    key={n.id}
                    className={clsx("p-3 hover:bg-white/3", n.read ? "opacity-80" : "bg-white/2")}
                  >
                    <a href={n.url ?? "#"} className="block">
                      <div className="text-sm text-white font-medium">{n.title}</div>
                      {n.body && <div className="text-xs text-white/70 mt-1">{n.body}</div>}
                      <div className="text-[11px] text-white/50 mt-2">
                        {n.created_at ? new Date(n.created_at).toLocaleString() : ""}
                      </div>
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="p-2 border-t border-white/6 flex justify-between">
            <button
              onClick={markAllRead}
              className="text-sm text-white/90 hover:underline px-3 py-1 rounded"
            >
              Mark all read
            </button>

            <Link href="/notifications" prefetch={false} className="text-sm text-white/90 hover:underline px-3 py-1 rounded">
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
        const r = await apiClient.get("/me");
        if (!mounted) return;
        const d = r.data ?? {};
        setUser(d.user ?? d);
      } catch (err) {
        console.warn("fetch /me failed:", getErrorMessage(err));
        if (mounted) setUser(null);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const logout = useCallback(async () => {
    try {
      await apiClient.post("/auth/logout");
    } catch (err) {
      console.warn("logout:", getErrorMessage(err));
    } finally {
      window.location.href = "/login";
    }
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((s) => !s)}
        className="flex items-center gap-2 p-1 rounded hover:bg-white/5 focus:ring-2 focus:ring-white/20"
      >
        {user?.avatar_url ? (
          <Image src={user.avatar_url} alt={user.name ?? "avatar"} width={28} height={28} className="rounded-full" />
        ) : (
          <div className="w-7 h-7 rounded-full bg-white/8 flex items-center justify-center text-xs text-white/90">
            {user?.name ? user.name[0].toUpperCase() : "U"}
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
            <div className="text-sm text-white font-medium">{user?.name ?? "User"}</div>
            <div className="text-xs text-white/60">{user?.email ?? ""}</div>
          </div>

          <div className="flex flex-col divide-y divide-white/6">
            <Link href="/account" prefetch={false} className="px-3 py-2 text-sm text-white hover:bg-white/3">
              Account
            </Link>
            <Link href="/settings" prefetch={false} className="px-3 py-2 text-sm text-white hover:bg-white/3">
              Settings
            </Link>
            <Link href="/billing" prefetch={false} className="px-3 py-2 text-sm text-white hover:bg-white/3">
              Billing
            </Link>
            <button onClick={logout} className="text-left px-3 py-2 text-sm text-white hover:bg-white/3">
              Logout
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
