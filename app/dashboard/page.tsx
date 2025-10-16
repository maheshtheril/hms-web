// app/dashboard/page.tsx
"use client";

import React, { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import FireworksOnce from "./FireworksOnce";
import TopNav from "@/app/components/TopNav";
import LeadCalendar from "@/app/dashboard/components/LeadCalendar";

/* ───────── Types ───────── */
type KpisPayload = {
  open_leads?: number;
  open_leads_count?: number;
  todays_followups?: number;
  followups_today?: number;
  open_leads_trend?: string;
};
type MeUser = {
  id: string;
  name?: string | null;
  email?: string | null;
  role?: string | null;
  roles?: string[] | null;
  role_codes?: string[] | null;
  avatar_url?: string | null;
};
type MeResponse = Partial<{
  ok: boolean;
  user: MeUser | null;
  roles: string[];
}>;

/* ───────── Utils ───────── */
const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));
const safe = <T,>(v: T | undefined | null, fallback: T): T => (v == null ? fallback : v);

function quickHref(src: string, ret = "/dashboard") {
  return `/crm/leads/new?mode=quick&src=${encodeURIComponent(src)}&return=${encodeURIComponent(ret)}`;
}
function detailedHref(src: string, ret = "/dashboard") {
  return `/crm/leads/new?mode=detailed&src=${encodeURIComponent(src)}&return=${encodeURIComponent(ret)}`;
}

/* ───────── Client data hooks ───────── */
function useAuthTolerant() {
  const [authed, setAuthed] = useState<boolean | null>(null); // null=loading, true/false final
  const [me, setMe] = useState<MeResponse | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      await delay(300);
      async function tryMe(): Promise<boolean> {
        try {
          const r = await fetch("/api/auth/me", { credentials: "include", cache: "no-store" });
          if (!r.ok) return false;
          const data = (await r.json().catch(() => ({}))) as MeResponse | {};
          if (!alive) return true;
          setMe((data as MeResponse) ?? null);
          return true;
        } catch {
          return false;
        }
      }
      const ok1 = await tryMe();
      if (!ok1) {
        await delay(500);
        const ok2 = await tryMe();
        if (!alive) return;
        setAuthed(ok2);
      } else {
        if (!alive) return;
        setAuthed(true);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  return { authed, me };
}

function useKpis(authed: boolean | null, me: MeResponse | null) {
  const [kpis, setKpis] = useState<KpisPayload | null>(null);
  const [loading, setLoading] = useState(true);

  const mine = useMemo(() => {
    const pool: string[] = [
      ...safe(me?.roles, []),
      ...safe(me?.user?.roles, [] as string[]),
      ...safe(me?.user?.role_codes, [] as string[]),
    ];
    const has = (arr: string[]) => arr.some((r) => /sales|salesman|salesperson|bd[e]?/i.test(String(r)));
    return pool.length > 0 ? has(pool) : !!me?.user?.role && /sales|salesman|salesperson|bd[e]?/i.test(me.user.role!);
  }, [me]);

  useEffect(() => {
    let alive = true;
    (async () => {
      if (authed !== true) return;
      try {
        const url = new URL("/api/kpis", window.location.origin);
        url.searchParams.set(mine ? "mine" : "scope", mine ? "1" : "all");
        url.searchParams.set("table", "leads");
        const r = await fetch(url.toString(), { credentials: "include", cache: "no-store" });
        if (!alive) return;
        if (!r.ok) {
          setKpis(null);
        } else {
          const data = (await r.json()) as KpisPayload;
          setKpis(data ?? null);
        }
      } catch {
        if (alive) setKpis(null);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [authed, mine]);

  return { kpis, loading, mine };
}

/* ───────── Page ───────── */
export default function DashboardPage() {
  const { authed, me } = useAuthTolerant();
  const { kpis, loading: kpiLoading, mine } = useKpis(authed, me);

  useEffect(() => {
    if (authed === false) {
      window.location.replace("/login");
    }
  }, [authed]);

  const loading = authed === null;
  const displayName = me?.user?.name?.trim() || me?.user?.email || "User";
  const openLeads = String(kpis?.open_leads ?? kpis?.open_leads_count ?? "–");
  const todaysFollowups = String(kpis?.todays_followups ?? kpis?.followups_today ?? "–");
  const openLeadsTrend = String(kpis?.open_leads_trend ?? "–");

  return (
    <div className="min-h-dvh bg-gradient-to-b from-zinc-950 via-zinc-900 to-black text-zinc-100 antialiased">
      {/* celebration: keeps existing behaviour (FireworksOnce handles once-only) */}
      <FireworksOnce />
      <TopNav />

      <main className="mx-auto w-full max-w-screen-2xl px-4 sm:px-6 lg:px-8 py-8">
        {/* if still resolving auth show compact skeleton */}
        {loading ? (
          <div className="space-y-6">
            <div className="rounded-2xl border border-white/8 bg-white/4 p-6 animate-pulse" />
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="h-28 rounded-2xl border border-white/8 bg-white/4 animate-pulse" />
              <div className="h-28 rounded-2xl border border-white/8 bg-white/4 animate-pulse" />
              <div className="h-28 rounded-2xl border border-white/8 bg-white/4 animate-pulse" />
            </div>
          </div>
        ) : authed === true ? (
          <>
            {/* HERO / WELCOME */}
            <section className="rounded-3xl border border-white/6 bg-gradient-to-r from-zinc-900/60 via-zinc-900/40 to-black/40 p-6 sm:p-8 mb-6 shadow-lg">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="min-w-0">
                  <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                    Welcome back, <span className="text-white/95">{displayName}</span>
                  </h1>
                  <p className="mt-1 text-sm text-white/70 max-w-xl">
                    Secure session active — your tenant and company data are scoped and protected. {mine ? <span className="italic">Showing KPIs for your assignments.</span> : null}
                  </p>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <PrimaryLink href={quickHref("welcome_quick")} label="+ Quick Lead" />
                    <GhostLink href={detailedHref("welcome_detailed")} label="+ Detailed Lead" />
                    <GhostLink href="/crm/leads" label="Open Leads" />
                    <GhostLink href={quickHref("welcome_schedule_call")} label="Schedule Call" />
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {/* small summary pill */}
                  <div className="rounded-full bg-white/6 px-3 py-2 text-xs font-medium">
                    <span className="block text-[11px] text-white/80">Tenant</span>
                    <span className="block text-sm font-semibold">Acme Corp</span>
                  </div>

                  <div className="flex flex-col items-end">
                    <span className="text-xs text-white/60">Last login</span>
                    <span className="text-sm font-medium">Today</span>
                  </div>
                </div>
              </div>
            </section>

            {/* KPI GRID */}
            <section className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <KpiCardEnhanced
                label="Open Leads"
                value={kpiLoading ? "…" : openLeads}
                trend={kpiLoading ? "…" : openLeadsTrend}
                icon={<IconLeads />}
              />
              <KpiCardEnhanced
                label="Today’s Follow-ups"
                value={kpiLoading ? "…" : todaysFollowups}
                trend={kpiLoading ? "…" : "On track"}
                icon={<IconCalendar />}
              />
              <KpiCardEnhanced
                label="Conversion (est.)"
                value={kpiLoading ? "…" : "12%"}
                trend={kpiLoading ? "…" : "+1.2%"}
                icon={<IconGauge />}
              />
            </section>

            {/* MAIN ROW: Calendar + Activity */}
            <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 rounded-2xl border border-white/8 bg-gradient-to-br from-zinc-900 to-zinc-950 p-5 sm:p-6 shadow-sm">
                <div className="mb-3 flex items-center justify-between">
                  <h2 className="text-sm font-semibold tracking-wide">Lead Follow-ups Calendar</h2>
                  <span className="text-xs text-white/50">Drag to reschedule • Click to edit</span>
                </div>
                <Suspense
                  fallback={
                    <div className="mt-2 animate-pulse space-y-3">
                      <div className="h-6 w-40 rounded bg-white/10" />
                      <div className="h-64 rounded-xl border border-white/10 bg-white/5" />
                    </div>
                  }
                >
                  <LeadCalendar />
                </Suspense>
              </div>

              <aside className="rounded-2xl border border-white/8 bg-gradient-to-br from-zinc-900/50 to-zinc-950 p-4">
                <h3 className="text-sm font-semibold">Today</h3>
                <div className="mt-3 space-y-3">
                  <div className="rounded-md p-3 bg-white/3 border border-white/6">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-sm font-medium">Call: John Doe</div>
                        <div className="text-xs text-white/60">At 3:30 PM • Reminder set</div>
                      </div>
                      <div className="text-xs text-white/60">10m</div>
                    </div>
                  </div>

                  <div className="rounded-md p-3 bg-white/3 border border-white/6">
                    <div className="text-sm font-medium">Invoice #234 overdue</div>
                    <div className="text-xs text-white/60">Customer: Acme Ltd</div>
                  </div>
                </div>

                <div className="mt-4">
                  <Link href="/activities" className="text-xs underline">View all activities</Link>
                </div>
              </aside>
            </section>

            {/* Floating FAB */}
            <Link
              href={quickHref("fab")}
              className="fixed right-6 bottom-8 inline-flex items-center gap-3 h-12 rounded-full bg-emerald-500 px-4 py-2 text-black font-semibold shadow-2xl hover:scale-[.99] active:scale-[.98] focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
              aria-label="Quick add lead"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden><path fill="currentColor" d="M11 11V5h2v6h6v2h-6v6h-2v-6H5v-2z" /></svg>
              <span className="hidden xs:inline">Quick lead</span>
            </Link>
          </>
        ) : null}
      </main>

      <footer className="mt-10 py-6 text-center text-xs opacity-60">
        © {new Date().getFullYear()} GeniusGrid — Made for speed, accuracy & AI.
      </footer>
    </div>
  );
}

/* ───────── Small UI pieces ───────── */

function KpiCardEnhanced({ label, value, trend, icon }: { label: string; value: string; trend: string; icon?: React.ReactNode }) {
  return (
    <div className="group rounded-2xl border border-white/8 bg-gradient-to-br from-zinc-900 to-zinc-950 p-4 hover:translate-y-[-4px] transition-transform duration-200 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 min-w-0">
          <div className="h-11 w-11 rounded-xl bg-white/6 flex items-center justify-center">{icon}</div>
          <div className="min-w-0">
            <div className="text-xs text-white/70">{label}</div>
            <div className="mt-1 flex items-baseline gap-3">
              <div className="text-2xl sm:text-3xl font-extrabold tracking-tight">{value}</div>
              <div className="text-[11px] rounded-full bg-emerald-500/10 px-2 py-0.5 text-emerald-300 border border-emerald-500/20">{trend}</div>
            </div>
          </div>
        </div>

        {/* subtle sparkline placeholder (SVG decorative) */}
        <div className="hidden md:block">
          <svg width="64" height="28" viewBox="0 0 64 28" className="opacity-60" aria-hidden>
            <polyline fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="2" points="0,20 12,12 24,16 36,8 48,14 64,6" />
            <polyline fill="none" stroke="rgba(16,185,129,0.7)" strokeWidth="2" points="0,20 12,12 24,16 36,8 48,14 64,6" />
          </svg>
        </div>
      </div>
    </div>
  );
}

/* ───────── Icons ───────── */
function IconLeads() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden>
      <path fill="currentColor" d="M12 12a5 5 0 1 0 0-10 5 5 0 0 0 0 10zM2 20c0-3.3 4.3-6 10-6s10 2.7 10 6v2H2v-2z"/>
    </svg>
  );
}
function IconCalendar() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden>
      <path fill="currentColor" d="M7 10h5v5H7zM3 5h2V3h2v2h8V3h2v2h2a1 1 0 0 1 1 1v13a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a1 1 0 0 1 1-1z"/>
    </svg>
  );
}
function IconGauge() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden>
      <path fill="currentColor" d="M12 3a9 9 0 1 0 9 9 9 9 0 0 0-9-9zm1 5h-2v6l5 2 .7-1.2L13 13V8z"/>
    </svg>
  );
}

/* ───────── Small shared buttons (used inline) ───────── */
function PrimaryLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-2 rounded-xl bg-white text-black px-3 py-2 text-xs font-semibold hover:bg-zinc-100 active:scale-[.98] focus:outline-none focus-visible:ring-2 focus-visible:ring-white/30"
    >
      {label}
    </Link>
  );
}
function GhostLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-transparent px-3 py-2 text-xs font-semibold hover:bg-white/3 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/20"
    >
      {label}
    </Link>
  );
}
