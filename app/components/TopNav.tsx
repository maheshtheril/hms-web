"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";

type MeUser = {
  id: string;
  name?: string | null;
  email?: string | null;
  avatar_url?: string | null;
};

export default function TopNav() {
  const [me, setMe] = useState<MeUser | null>(null);
  const [open, setOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const displayName = me?.name ?? me?.email ?? "User";

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const r = await fetch("/api/auth/me", { credentials: "include", cache: "no-store" });
        if (!r.ok) return;
        const data = await r.json().catch(() => ({}));
        if (!alive) return;
        setMe((data?.user ?? data) as MeUser);
      } catch {
        // ignore
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  return (
    <header className="sticky top-0 z-40 backdrop-blur-sm bg-gradient-to-b from-black/60 via-zinc-900/40 to-transparent border-b border-white/6">
      <div className="mx-auto w-full max-w-screen-2xl px-3 sm:px-4 lg:px-6">
        <div className="flex items-center gap-4 h-16">
          {/* Left: Brand */}
          <div className="flex items-center gap-3 min-w-0">
            <Link href="/" className="flex items-center gap-3">
              <div className="flex items-center justify-center h-10 w-10 rounded-2xl bg-gradient-to-br from-white/10 to-white/5 ring-1 ring-white/6">
                {/* subtle logo mark (SVG) */}
                <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden className="opacity-90">
                  <path fill="currentColor" d="M3 12h18v2H3zM12 3v18h2V3z" />
                </svg>
              </div>
              <div className="hidden md:flex flex-col leading-tight">
                <span className="text-sm font-semibold tracking-tight">GeniusGrid</span>
                <span className="text-[11px] text-white/50 -mt-0.5">ERP • Multi-tenant • AI</span>
              </div>
            </Link>
          </div>

          {/* Middle: Search (grow) */}
          <div className="flex-1">
            <div className="relative max-w-2xl">
              <label htmlFor="site-search" className="sr-only">Search</label>
              <div className="flex items-center bg-white/4 border border-white/6 rounded-xl px-3 py-2 shadow-sm focus-within:ring-2 focus-within:ring-white/20">
                <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden className="opacity-70 mr-2">
                  <path fill="currentColor" d="M21 21l-4.35-4.35M10.5 18a7.5 7.5 0 1 1 0-15 7.5 7.5 0 0 1 0 15z" />
                </svg>
                <input
                  id="site-search"
                  className="bg-transparent outline-none placeholder:text-white/40 w-full text-sm"
                  placeholder="Search leads, invoices, customers..."
                  aria-label="Search leads, invoices, customers"
                />
                <div className="hidden sm:flex items-center gap-2 ml-3">
                  <TagChip>Leads</TagChip>
                  <TagChip>Customers</TagChip>
                </div>
              </div>
            </div>
          </div>

          {/* Right: Controls */}
          <nav className="flex items-center gap-3">
            {/* quick action - add */}
            <Link
              href="/crm/leads/new?mode=quick"
              className="inline-flex items-center gap-2 rounded-lg bg-emerald-500 px-3 py-2 text-xs font-semibold text-black shadow-md hover:scale-[.99] active:scale-[.97] focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
              aria-label="Quick add"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden><path fill="currentColor" d="M11 11V5h2v6h6v2h-6v6h-2v-6H5v-2z" /></svg>
              <span className="hidden sm:inline">Quick</span>
            </Link>

            {/* tenant / workspace switch */}
            <div className="hidden sm:flex items-center rounded-lg border border-white/6 bg-white/3 px-2 py-1 text-xs">
              <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden className="opacity-80 mr-1">
                <path fill="currentColor" d="M12 2L2 7v6c0 5 4 9 10 9s10-4 10-9V7L12 2z" />
              </svg>
              <span className="truncate max-w-[90px]">{/* tenant name placeholder */}Acme Corp</span>
              <button
                onClick={() => {
                  /* open workspace switcher modal - implement as needed */
                  alert("Switch workspace — implement modal");
                }}
                className="ml-2 px-2 py-1 rounded bg-white/3 hover:bg-white/4 text-xs"
                aria-label="Switch workspace"
              >
                Change
              </button>
            </div>

            {/* notifications */}
            <div className="relative">
              <button
                onClick={() => setNotifOpen((s) => !s)}
                className="rounded-lg p-2 border border-white/6 bg-white/3 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/20"
                aria-label="Notifications"
                title="Notifications"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden><path fill="currentColor" d="M12 2a6 6 0 0 0-6 6v4H4v2h16v-2h-2V8a6 6 0 0 0-6-6zM8 20a4 4 0 0 0 8 0H8z"/></svg>
                <span className="sr-only">Notifications</span>
              </button>

              {notifOpen && (
                <div className="absolute right-0 mt-2 w-72 rounded-xl bg-gradient-to-b from-zinc-900/90 to-zinc-950/95 border border-white/6 shadow-lg p-3 text-sm">
                  <div className="flex items-center justify-between mb-2">
                    <strong>Notifications</strong>
                    <button className="text-xs opacity-70" onClick={() => setNotifOpen(false)}>Close</button>
                  </div>
                  <div className="space-y-2">
                    <NotificationItem title="Lead assigned to you" sub="John Doe • 2h ago" />
                    <NotificationItem title="Invoice overdue" sub="Invoice #234 • 1d ago" tone="danger" />
                    <NotificationItem title="New signup" sub="Acme Ltd • 3d ago" />
                  </div>
                  <div className="mt-3 text-center">
                    <Link href="/notifications" className="text-xs underline">View all</Link>
                  </div>
                </div>
              )}
            </div>

            {/* avatar / menu */}
            <div className="relative">
              <button
                onClick={() => setOpen((s) => !s)}
                className="flex items-center gap-2 rounded-lg px-2 py-1 border border-white/6 bg-white/3 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/20"
                aria-label="Account menu"
                title="Account"
              >
                <Avatar src={me?.avatar_url} name={displayName} />
                <span className="hidden sm:block text-sm">{shortName(displayName)}</span>
                <svg width="12" height="12" viewBox="0 0 24 24" aria-hidden className="ml-1 opacity-60">
                  <path fill="currentColor" d="M7 10l5 5 5-5z" />
                </svg>
              </button>

              {open && (
                <div className="absolute right-0 mt-2 w-56 rounded-xl bg-gradient-to-b from-zinc-900/90 to-zinc-950/95 border border-white/6 shadow-lg p-2">
                  <Link href="/profile" className="block px-3 py-2 rounded hover:bg-white/3">Profile</Link>
                  <Link href="/settings" className="block px-3 py-2 rounded hover:bg-white/3">Settings</Link>
                  <Link href="/crm/leads" className="block px-3 py-2 rounded hover:bg-white/3">Open Leads</Link>
                  <hr className="my-2 border-white/6" />
                  <form method="post" action="/api/auth/logout" className="px-3">
                    <button type="submit" className="w-full text-left rounded px-2 py-2 hover:bg-white/3">Sign out</button>
                  </form>
                </div>
              )}
            </div>
          </nav>
        </div>
      </div>
    </header>
  );
}

/* ───────── Small UI primitives (reusable) ───────── */

function Avatar({ src, name }: { src?: string | null; name: string }) {
  const initials = (name || "U").split(" ").map((s) => s[0]).slice(0, 2).join("").toUpperCase();
  if (src) {
    return <img src={src} alt={name} className="h-8 w-8 rounded-full object-cover" />;
  }
  return <div className="h-8 w-8 rounded-full bg-white/5 flex items-center justify-center text-xs font-semibold">{initials}</div>;
}

function shortName(full: string) {
  // "John Doe" -> "John"
  return (full || "").split(" ")[0];
}

function TagChip({ children }: { children: React.ReactNode }) {
  return <span className="text-[11px] px-2 py-0.5 rounded bg-white/4 border border-white/6">{children}</span>;
}

function NotificationItem({ title, sub, tone }: { title: string; sub?: string; tone?: "default" | "danger" }) {
  return (
    <div className="rounded-md p-2 hover:bg-white/3">
      <div className={`text-sm ${tone === "danger" ? "text-rose-300" : "text-white"}`}>{title}</div>
      {sub && <div className="text-xs opacity-70 mt-0.5">{sub}</div>}
    </div>
  );
}
