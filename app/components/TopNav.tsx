// app/components/TopNav.tsx
"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

type TopNavProps = {
  user?: { name?: string; email?: string; avatarUrl?: string | null };
  onToggleSidebar?: () => void;
  initialNotifCount?: number;
  // if you want TopNav to fetch server-side notifications on mount:
  // fetchOnMount?: boolean;
};

type NotifItem = {
  id: string;
  title?: string;
  message: string;
  ts: number;
  read?: boolean;
  meta?: any;
};

export default function TopNav({
  user,
  onToggleSidebar,
  initialNotifCount = 0,
}: TopNavProps) {
  const [notifCount, setNotifCount] = useState<number>(initialNotifCount);
  const [openNotifs, setOpenNotifs] = useState(false);
  const [notifications, setNotifications] = useState<NotifItem[]>([]);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function handler(e: Event) {
      const d = (e as CustomEvent).detail || {};
      // support numeric changes (from QuickLeadDrawer and others)
      if (typeof d.increment === "number") {
        setNotifCount((c) => Math.max(0, c + d.increment));
      }
      if (typeof d.decrement === "number") {
        setNotifCount((c) => Math.max(0, c - d.decrement));
      }
      if (typeof d.set === "number") {
        setNotifCount(Math.max(0, d.set));
      }

      // if the event included a message payload, push to list
      if (d.message || d.title) {
        const id = String(d.id ?? Math.random().toString(36).slice(2, 9));
        const item: NotifItem = {
          id,
          title: d.title,
          message: d.message ?? String(d.text ?? d.body ?? ""),
          ts: Date.now(),
          read: false,
          meta: d,
        };
        setNotifications((prev) => [item, ...prev].slice(0, 50));
        setNotifCount((c) => c + 1);
      }
    }

    // also listen to explicit message events if you want to dispatch them separately
    function messageHandler(e: Event) {
      const d = (e as CustomEvent).detail || {};
      if (d.message || d.title) {
        const id = String(d.id ?? Math.random().toString(36).slice(2, 9));
        const item: NotifItem = {
          id,
          title: d.title,
          message: d.message ?? String(d.text ?? d.body ?? ""),
          ts: Date.now(),
          read: false,
          meta: d,
        };
        setNotifications((prev) => [item, ...prev].slice(0, 50));
        setNotifCount((c) => c + 1);
      }
    }

    window.addEventListener("app:notification", handler as EventListener);
    window.addEventListener("app:message", messageHandler as EventListener);

    return () => {
      window.removeEventListener("app:notification", handler as EventListener);
      window.removeEventListener("app:message", messageHandler as EventListener);
    };
  }, []);

  // close dropdown on click outside
  useEffect(() => {
    function onDoc(e: MouseEvent) {
      const el = menuRef.current;
      if (!el) return;
      if (!el.contains(e.target as Node)) setOpenNotifs(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const logout = useCallback(async () => {
    try {
      await fetch("/auth/logout", { method: "POST" });
    } catch {}
    window.location.href = "/login";
  }, []);

  const displayInitial = (user?.name?.[0] || user?.email?.[0] || "U").toUpperCase();

  const markAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    setNotifCount(0);
  };

  const markRead = (id: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
    setNotifCount((c) => Math.max(0, c - 1));
  };

  const clearAll = () => {
    setNotifications([]);
    setNotifCount(0);
  };

  const openAndMark = () => {
    setOpenNotifs((v) => !v);
    // optionally mark on open (common pattern) — here we don't auto-mark to let user scan.
    // if you want auto-marking on open, uncomment:
    // if (!openNotifs) markAllRead();
  };

  return (
    <header
      className="sticky top-0 z-50 h-14 backdrop-blur-md border-b border-white/10"
      style={{
        background:
          "linear-gradient(90deg, rgba(10,12,24,0.75) 0%, rgba(20,18,40,0.6) 60%, rgba(30,22,60,0.55) 100%)",
      }}
    >
      <div className="mx-auto flex h-full w-full max-w-screen-2xl items-center justify-between gap-3 px-3 lg:px-6">
        {/* Left */}
        <div className="flex min-w-0 items-center gap-2">
          <button
            type="button"
            aria-label="Toggle sidebar"
            onClick={onToggleSidebar}
            className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 active:scale-95 sm:hidden"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden>
              <path fill="currentColor" d="M3 6h18v2H3zm0 5h18v2H3zm0 5h18v2H3z" />
            </svg>
          </button>

          <Link
            href="/dashboard"
            className="flex items-center gap-2 rounded-lg px-2 py-1 hover:bg-white/5"
          >
            <div className="hidden xs:block leading-tight">
              <div className="text-sm font-semibold">GeniusGrid ERP</div>
              <div className="text-[10px] opacity-70">AI • CRM • Multi-Tenant</div>
            </div>
          </Link>
        </div>

        <div className="flex-1" />

        {/* Right */}
        <div className="flex items-center gap-3">
          {/* Search */}
          <button
            type="button"
            aria-label="Search"
            className="hidden sm:inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs hover:bg-white/10 active:scale-[.98]"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden>
              <path fill="currentColor" d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16a6.471 6.471 0 0 0 4.23-1.57l.27.28v.79L20 21.5 21.5 20zM9.5 14C7 14 5 12 5 9.5S7 5 9.5 5 14 7 14 9.5 12 14 9.5 14z" />
            </svg>
            <span>Search</span>
          </button>

          {/* Theme toggle */}
          <button
            type="button"
            aria-label="Toggle theme"
            className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 active:scale-95"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden>
              <path fill="currentColor" d="M12 3a9 9 0 1 0 9 9a7 7 0 0 1-9-9z" />
            </svg>
          </button>

          {/* Notifications (bell) */}
          <div className="relative" ref={menuRef}>
            <button
              type="button"
              aria-label="Notifications"
              onClick={openAndMark}
              className="relative inline-flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 active:scale-95"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden>
                <path
                  fill="currentColor"
                  d="M12 22a2 2 0 0 0 2-2H10a2 2 0 0 0 2 2m6-6v-5a6 6 0 0 0-5-5.91V4a1 1 0 1 0-2 0v1.09A6 6 0 0 0 6 11v5l-2 2v1h16v-1z"
                />
              </svg>

              {/* badge */}
              <span
                className={`absolute -right-1 -top-1 grid h-4 min-w-4 place-items-center rounded-full px-1 text-[10px] font-bold text-black transition-all ${
                  notifCount > 0 ? "bg-emerald-500" : "bg-white/10 text-white/70"
                }`}
                aria-hidden
              >
                {notifCount > 99 ? "99+" : notifCount}
              </span>
            </button>

            {/* Dropdown */}
            {openNotifs && (
              <div className="absolute right-0 mt-2 w-80 max-h-96 overflow-auto rounded-2xl border border-white/10 bg-black/80 p-2 shadow-xl backdrop-blur z-50">
                <div className="flex items-center justify-between px-2 py-1">
                  <div className="text-sm font-semibold">Notifications</div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={markAllRead}
                      className="text-xs opacity-70 hover:opacity-100 px-2 py-1 rounded"
                    >
                      Mark all read
                    </button>
                    <button
                      onClick={clearAll}
                      className="text-xs opacity-70 hover:opacity-100 px-2 py-1 rounded"
                    >
                      Clear
                    </button>
                  </div>
                </div>

                <div className="mt-1 max-h-72 overflow-auto">
                  {notifications.length === 0 ? (
                    <div className="px-3 py-2 text-sm opacity-70">No notifications yet.</div>
                  ) : (
                    notifications.map((n) => (
                      <div
                        key={n.id}
                        className={`flex gap-2 px-3 py-2 rounded-lg items-start ${n.read ? "opacity-60" : "bg-white/3"}`}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium truncate">{n.title ?? "Notice"}</div>
                          <div className="text-xs opacity-70 truncate">{n.message}</div>
                          <div className="text-[11px] opacity-50 mt-1">{new Date(n.ts).toLocaleString()}</div>
                        </div>
                        <div className="flex flex-col gap-1">
                          {!n.read && (
                            <button
                              onClick={() => markRead(n.id)}
                              className="text-xs px-2 py-1 rounded border border-white/10 hover:bg-white/6"
                            >
                              Mark
                            </button>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Profile dropdown */}
          <details className="relative">
            <summary className="list-none">
              <button
                type="button"
                aria-label="Account menu"
                className="h-9 w-9 overflow-hidden rounded-full ring-2 ring-white/10 hover:ring-indigo-400/30 active:scale-95"
              >
                {user?.avatarUrl ? (
                  <img src={user.avatarUrl} alt="User avatar" className="h-full w-full object-cover" />
                ) : (
                  <div className="grid h-full w-full place-items-center bg-gradient-to-br from-indigo-500/30 to-fuchsia-500/30 text-xs font-bold">
                    {displayInitial}
                  </div>
                )}
              </button>
            </summary>
            <div className="absolute right-0 mt-2 w-64 rounded-2xl border border-white/10 bg-black/80 p-2 shadow-xl backdrop-blur">
              <div className="px-3 py-2 border-b border-white/10">
                <div className="text-sm font-semibold text-white/90">{user?.name || user?.email || "User"}</div>
                {user?.email && <div className="text-xs opacity-70">{user.email}</div>}
              </div>
              <Link href="/profile" className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm hover:bg-white/5">Profile</Link>
              <Link href="/settings" className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm hover:bg-white/5">Settings</Link>
            </div>
          </details>

          {/* Logout */}
          <button
            onClick={logout}
            type="button"
            className="group inline-flex items-center gap-2 px-3 py-1.5 rounded-xl 
                       bg-gradient-to-r from-rose-500/90 via-fuchsia-500/80 to-indigo-500/80 
                       hover:from-rose-400 hover:via-fuchsia-400 hover:to-indigo-400
                       text-white text-sm font-semibold
                       border border-white/10
                       shadow-[0_0_0_1px_rgba(255,255,255,0.08)]
                       hover:shadow-[0_0_0_1px_rgba(255,255,255,0.12),0_8px_24px_rgba(0,0,0,0.35)]
                       active:scale-[.98]
                       focus:outline-none focus-visible:ring-2 focus-visible:ring-fuchsia-300/50"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden className="opacity-90 transition-transform group-hover:translate-x-[1px]">
              <path fill="currentColor" d="M14 7v-2h-10v14h10v-2h2v4h-14v-18h14v4zM21 12l-5-5v3h-8v4h8v3z" />
            </svg>
            <span>Logout</span>
          </button>
        </div>
      </div>
    </header>
  );
}
