"use client";

import Link from "next/link";
import { useCallback } from "react";

type TopbarProps = {
  user?: { name?: string; email?: string; avatarUrl?: string | null };
  onToggleSidebar?: () => void;
};

export function Topbar({ user, onToggleSidebar }: TopbarProps) {
  // Keep your original logout working
  const logout = useCallback(async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {}
    window.location.href = "/login";
  }, []);

  const displayInitial =
    (user?.name?.[0] || user?.email?.[0] || "U").toUpperCase();

  return (
    <header className="sticky top-0 z-50 h-14 border-b border-white/10 bg-black/60 backdrop-blur supports-[backdrop-filter]:bg-black/40">
      <div className="mx-auto flex h-full w-full max-w-screen-2xl items-center justify-between gap-2 px-3 lg:px-6">
        {/* Left: Hamburger (mobile) + Brand */}
        <div className="flex min-w-0 items-center gap-2">
          <button
            type="button"
            aria-label="Toggle menu"
            onClick={onToggleSidebar}
            className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 active:scale-95 sm:hidden"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden>
              <path
                fill="currentColor"
                d="M3 6h18v2H3zm0 5h18v2H3zm0 5h18v2H3z"
              />
            </svg>
          </button>

          <Link
            href="/dashboard"
            className="flex items-center gap-2 rounded-lg px-2 py-1 hover:bg-white/5"
          >
            <div className="grid h-8 w-8 place-items-center rounded-xl bg-white/10 text-xs font-bold tracking-tight shadow-inner">
              GG
            </div>
            <div className="hidden xs:block leading-tight">
              <div className="text-sm font-semibold">GeniusGrid ERP</div>
              <div className="text-[10px] opacity-70">Agentic • AI • CRM</div>
            </div>
          </Link>
        </div>

        {/* Right controls */}
        <div className="flex items-center gap-2">
          {/* Search */}
          <button
            type="button"
            aria-label="Search (Ctrl/Cmd + K)"
            className="hidden sm:inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs hover:bg-white/10 active:scale-[.98]"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden>
              <path
                fill="currentColor"
                d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16a6.471 6.471 0 0 0 4.23-1.57l.27.28v.79L20 21.5 21.5 20zM9.5 14C7 14 5 12 5 9.5S7 5 9.5 5 14 7 14 9.5 12 14 9.5 14z"
              />
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
              <path
                fill="currentColor"
                d="M12 3a9 9 0 1 0 9 9a7 7 0 0 1-9-9z"
              />
            </svg>
          </button>

          {/* Notifications */}
          <button
            type="button"
            aria-label="Notifications"
            className="relative inline-flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 active:scale-95"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden>
              <path
                fill="currentColor"
                d="M12 22a2 2 0 0 0 2-2H10a2 2 0 0 0 2 2m6-6v-5a6 6 0 0 0-5-5.91V4a1 1 0 1 0-2 0v1.09A6 6 0 0 0 6 11v5l-2 2v1h16v-1z"
              />
            </svg>
            <span className="absolute -right-1 -top-1 grid h-4 min-w-4 place-items-center rounded-full bg-emerald-500 px-1 text-[10px] font-bold text-black">
              3
            </span>
          </button>

          {/* Avatar */}
          <details className="relative">
            <summary className="list-none">
              <button
                type="button"
                aria-label="Account menu"
                className="h-9 w-9 overflow-hidden rounded-full ring-2 ring-white/10 hover:ring-white/20 active:scale-95"
              >
                {user?.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={user.avatarUrl}
                    alt="User avatar"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="grid h-full w-full place-items-center bg-gradient-to-br from-zinc-700 to-zinc-900 text-xs">
                    {displayInitial}
                  </div>
                )}
              </button>
            </summary>
            <div className="absolute right-0 mt-2 w-64 rounded-2xl border border-white/10 bg-zinc-900/95 p-2 shadow-xl backdrop-blur">
              <div className="px-3 py-2">
                <div className="text-sm font-semibold text-white/90">
                  {user?.name || user?.email || "User"}
                </div>
                {user?.email && (
                  <div className="text-xs opacity-70">{user.email}</div>
                )}
              </div>
              <Link
                href="/profile"
                className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm hover:bg-white/5"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden>
                  <path
                    fill="currentColor"
                    d="M12 12a5 5 0 1 0-5-5a5 5 0 0 0 5 5m0 2c-4 0-8 2-8 6v2h16v-2c0-4-4-6-8-6z"
                  />
                </svg>
                Profile
              </Link>
              <Link
                href="/settings"
                className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm hover:bg-white/5"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden>
                  <path
                    fill="currentColor"
                    d="M12 8a4 4 0 1 1-4 4a4 4 0 0 1 4-4m8.94 4a7.94 7.94 0 0 0-.15-1.5l2.11-1.65l-2-3.46l-2.49 1a8.12 8.12 0 0 0-2.6-1.5L13.5 1h-4l-.31 2.89a8.12 8.12 0 0 0-2.6 1.5l-2.49-1l-2 3.46L3.7 10.5A7.94 7.94 0 0 0 3.56 12a7.94 7.94 0 0 0 .15 1.5L1.6 15.15l2 3.46l2.49-1a8.12 8.12 0 0 0 2.6 1.5L9.5 23h4l.31-2.89a8.12 8.12 0 0 0 2.6-1.5l2.49 1l2-3.46L20.3 13.5c.1-.49.16-.99.16-1.5Z"
                  />
                </svg>
                Settings
              </Link>
              <button
                onClick={logout}
                type="button"
                className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm hover:bg-white/5"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden>
                  <path
                    fill="currentColor"
                    d="M14 7v-2h-10v14h10v-2h2v4h-14v-18h14v4zm7 5l-5-5v3h-8v4h8v3l5-5z"
                  />
                </svg>
                Logout
              </button>
            </div>
          </details>

          {/* Main Logout (upgraded style) */}
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
                       focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-300/60"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              aria-hidden
              className="opacity-90 transition-transform group-hover:translate-x-[1px]"
            >
              <path
                fill="currentColor"
                d="M14 7v-2h-10v14h10v-2h2v4h-14v-18h14v4zM21 12l-5-5v3h-8v4h8v3z"
              />
            </svg>
            <span>Logout</span>
          </button>
        </div>
      </div>
    </header>
  );
}
