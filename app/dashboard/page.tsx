// path: app/dashboard/page.tsx
"use client";

import React, { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import FireworksOnce from "./FireworksOnce";
import TopNav from "@/app/components/TopNav";
import LeadCalendar from "@/app/dashboard/components/LeadCalendar";

/* ───────────────── Types ───────────────── */
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
};

type MeResponse = {
  user?: MeUser | null;
  roles?: string[];
};

/* ───────────────── Utils ───────────────── */
function quickHref(src: string, ret = "/dashboard") {
  return `/crm/leads/new?mode=quick&src=${encodeURIComponent(src)}&return=${encodeURIComponent(ret)}`;
}
function detailedHref(src: string, ret = "/dashboard") {
  return `/crm/leads/new?mode=detailed&src=${encodeURIComponent(src)}&return=${encodeURIComponent(ret)}`;
}

/* ───────────────── Client data hooks ───────────────── */
function useMe() {
  const [me, setMe] = useState<MeResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const r = await fetch("/api/auth/me", { credentials: "include", cache: "no-store" });
        if (!alive) return;
        if (!r.ok) {
          setMe(null);
        } else {
          const data = (await r.json()) as MeResponse;
          setMe(data ?? null);
        }
      } catch {
        if (alive) setMe(null);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  return { me, loading };
}

function useKpis(me: MeResponse | null) {
  const [kpis, setKpis] = useState<KpisPayload | null>(null);
  const [loading, setLoading] = useState(true);

  const mine = useMemo(() => {
    const pool: string[] = [
      ...(me?.roles ?? []),
      ...((me?.user?.roles as string[] | null) ?? []),
      ...((me?.user?.role_codes as string[] | null) ?? []),
    ];
    const has = (arr: string[]) => arr.some((r) => /sales|salesman|salesperson|bd[e]?/i.test(String(r)));
    return pool.length > 0 ? has(pool) : !!me?.user?.role && /sales|salesman|salesperson|bd[e]?/i.test(me.user.role);
  }, [me]);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const url = new URL("/api/kpis", window.location.origin);
        if (mine) url.searchParams.set("mine", "1");
        else url.searchParams.set("scope", "all");
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
  }, [mine]);

  return { kpis, loading, mine };
}

/* ───────────────── Page (Client) ───────────────── */
export default function DashboardPage() {
  const { me, loading: meLoading } = useMe();

  // Client-side redirect if unauthenticated
  useEffect(() => {
    if (!meLoading && (!me || !me.user)) {
      window.location.replace("/login");
    }
  }, [meLoading, me]);

  const { kpis, loading: kpiLoading, mine } = useKpis(me);

  const displayName =
    me?.user?.name?.trim() || me?.user?.email || "user";
  const openLeads = String(
    (kpis?.open_leads ?? kpis?.open_leads_count ?? 0) || 0
  );
  const todaysFollowups = String(
    (kpis?.todays_followups ?? kpis?.followups_today ?? 0) || 0
  );
  const openLeadsTrend = String(kpis?.open_leads_trend ?? "+0%");

  const showSkeleton = meLoading || !me?.user;

  return (
    <div className="min-h-dvh bg-gradient-to-b from-zinc-950 via-zinc-900 to-black text-zinc-100">
      <FireworksOnce />
      <TopNav />

      <main className="mx-auto w-full max-w-screen-2xl px-3 sm:px-4 lg:px-6 py-6 sm:py-8">
        {/* Loading skeleton while we check auth */}
        {showSkeleton ? (
          <div className="space-y-6">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-5 sm:p-6 animate-pulse">
              <div className="h-6 w-56 rounded bg-white/10" />
              <div className="mt-3 h-4 w-80 rounded bg-white/10" />
              <div className="mt-4 flex gap-2">
                <div className="h-8 w-28 rounded bg-white/10" />
                <div className="h-8 w-32 rounded bg-white/10" />
                <div className="h-8 w-24 rounded bg-white/10" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="h-24 rounded-2xl border border-white/10 bg-white/5 animate-pulse" />
              <div className="h-24 rounded-2xl border border-white/10 bg-white/5 animate-pulse" />
            </div>
            <div className="h-80 rounded-2xl border border-white/10 bg-white/5 animate-pulse" />
          </div>
        ) : (
          <>
            {/* Welcome + KPIs */}
            <section className="grid grid-cols-1 xl:grid-cols-3 gap-4 sm:gap-6 mb-6">
              <div className="xl:col-span-2 rounded-2xl border border-white/10 bg-white/5 p-5 sm:p-6">
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight">
                  Welcome, <span className="text-white/90">{displayName}</span> 👋
                </h1>
                <p className="mt-1 text-sm opacity-80">
                  Secure session is active. Your data is scoped to your tenant & company context.
                  {mine ? " (KPIs filtered to your assignments)" : ""}
                </p>

                <div className="mt-4 flex flex-wrap gap-2">
                  <PrimaryLink href={quickHref("welcome_quick")} label="+ Quick Lead" />
                  <GhostLink href={detailedHref("welcome_detailed")} label="+ Detailed Lead" />
                  <GhostLink href="/crm/leads" label="Open Leads" />
                  <GhostLink href={quickHref("welcome_schedule_call")} label="Schedule Call" />
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-2 xl:grid-cols-1 gap-4 sm:gap-6">
                <KpiCard
                  label="Open Leads"
                  value={kpiLoading ? "…" : openLeads}
                  trend={kpiLoading ? "…" : openLeadsTrend}
                />
                <KpiCard
                  label="Today’s Follow-ups"
                  value={kpiLoading ? "…" : todaysFollowups}
                  trend={kpiLoading ? "…" : "On track"}
                />
              </div>
            </section>

            {/* Lead Follow-ups Calendar */}
            <section className="mt-6">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-5 sm:p-6">
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
            </section>

            {/* Floating FAB for quick add (hidden on xs) */}
            <Link
              href={quickHref("fab")}
              className="fixed right-4 bottom-20 sm:bottom-6 inline-flex items-center justify-center h-12 w-12 rounded-full bg-white text-black shadow-lg shadow-white/10 active:scale-95 xs:hidden focus:outline-none focus-visible:ring-2 focus-visible:ring-white/30"
              aria-label="Quick add lead"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden>
                <path fill="currentColor" d="M11 11V5h2v6h6v2h-6v6h-2v-6H5v-2z" />
              </svg>
            </Link>
          </>
        )}
      </main>

      <footer className="mt-10 py-6 text-center text-xs opacity-60">
        © {new Date().getFullYear()} GeniusGrid — Made for speed, accuracy & AI.
      </footer>
    </div>
  );
}

/* ───────────────── Small Components ───────────────── */
function KpiCard({ label, value, trend }: { label: string; value: string; trend: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-zinc-900 to-zinc-950 p-4 sm:p-5">
      <p className="text-xs opacity-70">{label}</p>
      <div className="mt-1 flex items-baseline gap-2">
        <p className="text-2xl sm:text-3xl font-extrabold tracking-tight">{value}</p>
        <span className="text-[10px] rounded-full bg-emerald-500/10 px-2 py-0.5 text-emerald-300 border border-emerald-500/20">
          {trend}
        </span>
      </div>
    </div>
  );
}

function PrimaryLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="rounded-xl bg-white text-black px-3 py-2 text-xs font-semibold hover:bg-zinc-100 active:scale-[.98] focus:outline-none focus-visible:ring-2 focus-visible:ring-white/30"
    >
      {label}
    </Link>
  );
}

function GhostLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="rounded-xl border border-white/10 bg-zinc-900 px-3 py-2 text-xs font-semibold hover:bg-zinc-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/30"
    >
      {label}
    </Link>
  );
}
