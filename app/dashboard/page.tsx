// app/dashboard/page.tsx
"use client";

import React, { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import LeadCalendar from "@/app/dashboard/components/LeadCalendar";
import PrimaryButton from "@/app/components/ng/PrimaryButton";
import { GhostButton } from "@/app/components/ng/GhostButton";
import QuickLeadDrawer from "@/app/components/leads/QuickLeadDrawer";
import { useToast } from "@/components/ui/use-toast";

/* ───────── Types ───────── */
type KpisPayload = {
  open_leads?: number;
  open_leads_count?: number;
  todays_followups?: number;
  followups_today?: number;
  open_leads_trend?: string;
  conversion_percentage?: number | string;
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
  const [authed, setAuthed] = useState<boolean | null>(null);
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

  const fetchKpis = useMemo(() => {
    return async (): Promise<KpisPayload | null> => {
      if (authed !== true) return null;
      setLoading(true);
      try {
        const url = new URL("/api/kpis", window.location.origin);
        url.searchParams.set(mine ? "mine" : "scope", mine ? "1" : "all");
        url.searchParams.set("table", "leads");
        const r = await fetch(url.toString(), { credentials: "include", cache: "no-store" });
        if (!r.ok) {
          setKpis(null);
          return null;
        } else {
          const data = (await r.json()) as KpisPayload;
          setKpis(data ?? null);
          return data ?? null;
        }
      } catch (e) {
        console.error("[useKpis] fetch error", e);
        setKpis(null);
        return null;
      } finally {
        setLoading(false);
      }
    };
  }, [authed, mine]);

  useEffect(() => {
    let alive = true;
    (async () => {
      if (authed !== true) return;
      try {
        await fetchKpis();
      } catch {
        if (!alive) return;
      }
    })();
    return () => {
      alive = false;
    };
  }, [authed, fetchKpis]);

  return { kpis, loading, mine, refetch: fetchKpis, setKpis };
}

/* ───────── Page ───────── */
export default function DashboardPage() {
  const { authed, me } = useAuthTolerant();
  const { kpis, loading: kpiLoading, mine, refetch, setKpis } = useKpis(authed, me);
  const { toast } = useToast();

  useEffect(() => {
    if (authed === false) {
      window.location.replace("/login");
    }
  }, [authed]);

  const loading = authed === null;
  const displayName = me?.user?.name?.trim() || me?.user?.email || "User";

  // local optimistic KPIs so UI updates instantly while we refetch authoritative numbers
  const [localKpis, setLocalKpis] = useState<KpisPayload | null>(null);
  useEffect(() => {
    if (kpis) setLocalKpis(kpis);
  }, [kpis]);

  const openLeads = String(localKpis?.open_leads ?? localKpis?.open_leads_count ?? "–");
  const todaysFollowups = String(localKpis?.todays_followups ?? localKpis?.followups_today ?? "–");
  const openLeadsTrend = String(localKpis?.open_leads_trend ?? "–");
  const conversion = localKpis?.conversion_percentage ? String(localKpis.conversion_percentage) : "–";

  // local state to show/hide quick lead drawer
  const [showQuick, setShowQuick] = useState(false);

  // key to force LeadCalendar remount (simple reload)
  const [calendarKey, setCalendarKey] = useState(0);

  /* ---------- handler when quick lead created ---------- */
  async function handleCreated(lead: any) {
    try {
      // optimistic local increment of open leads (if present)
      setLocalKpis((prev) => {
        if (!prev) return prev;
        const copy = { ...prev };
        const numeric = Number(prev.open_leads ?? prev.open_leads_count ?? 0);
        if (typeof prev.open_leads === "number") copy.open_leads = numeric + 1;
        if (typeof prev.open_leads_count === "number") copy.open_leads_count = numeric + 1;
        return copy;
      });

      // close drawer immediately
      setShowQuick(false);

      // refetch authoritative KPIs and apply them when returned
      const fresh = await refetch?.();
      if (fresh) {
        setKpis?.(fresh);
        setLocalKpis(fresh);
        toast({ title: "Dashboard updated", description: "KPIs refreshed." });
      } else {
        toast({ title: "Saved", description: "Lead saved. KPIs will update shortly.", variant: "default" });
      }

      // force calendar reload
      setCalendarKey((k) => k + 1);
    } catch (e) {
      console.error("[Dashboard] handleCreated error:", e);
      setCalendarKey((k) => k + 1);
      toast({ title: "Lead saved", description: "Saved but KPI refresh failed.", variant: "destructive" });
    }
  }

  return (
    <div
      className="min-h-dvh text-zinc-100 antialiased"
      style={{
        background:
          "radial-gradient(800px 300px at 50% 8%, rgba(80,100,220,0.12), transparent 12%), radial-gradient(600px 260px at 10% 75%, rgba(60,50,130,0.06), transparent 10%), linear-gradient(180deg,#04050a 0%, #03030b 70%)",
      }}
    >
      <main className="mx-auto w-full max-w-screen-2xl px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        {loading ? (
          <div className="space-y-6">
            <div className="rounded-2xl border border-white/6 bg-white/4/10 p-6 animate-pulse" />
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="h-28 rounded-2xl border border-white/8 bg-white/4 animate-pulse" />
              <div className="h-28 rounded-2xl border border-white/8 bg-white/4 animate-pulse" />
              <div className="h-28 rounded-2xl border border-white/8 bg-white/4 animate-pulse" />
            </div>
          </div>
        ) : authed === true ? (
          <>
            {/* HERO / WELCOME */}
            <section
              className="mx-auto max-w-5xl rounded-3xl p-6 sm:p-8 mb-6 sm:mb-8 shadow-2xl"
              style={{
                background: "linear-gradient(135deg, rgba(12,18,40,0.64), rgba(32,18,48,0.44))",
                border: "1px solid rgba(255,255,255,0.06)",
                backdropFilter: "blur(12px)",
              }}
            >
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="min-w-0">
                  <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight">
                    Welcome back, <span className="text-white/95">{displayName}</span>
                  </h1>
                  <p className="mt-2 text-sm sm:text-base text-white/70 max-w-xl">
                    Secure session active — your tenant and company data are scoped and protected.
                    {mine ? <span className="italic"> Showing KPIs for your assignments.</span> : null}
                  </p>

                  <div className="mt-4 sm:mt-5 flex flex-col sm:flex-row sm:items-center gap-3">
                    <PrimaryButton
                      type="button"
                      onClick={() => setShowQuick(true)}
                      className="w-full sm:w-auto justify-center"
                    >
                      + Quick Lead
                    </PrimaryButton>

                    <GhostButton href={detailedHref("welcome_detailed")} className="w-full sm:w-auto justify-center">
                      + Detailed Lead
                    </GhostButton>

                    <Link href="/crm/leads" className="w-full sm:w-auto">
                      <GhostButton className="w-full sm:w-auto justify-center">Open Leads</GhostButton>
                    </Link>

                    <Link href={quickHref("welcome_schedule_call")} className="w-full sm:w-auto">
                      <GhostButton className="w-full sm:w-auto justify-center">Schedule Call</GhostButton>
                    </Link>
                  </div>
                </div>

                <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-end">
                  <div className="rounded-full px-3 py-2 text-xs font-medium min-w-[96px] text-center" style={{ background: "linear-gradient(90deg, rgba(255,255,255,0.02), rgba(255,255,255,0.01))", border: "1px solid rgba(255,255,255,0.04)" }}>
                    <span className="block text-[11px] text-white/80">Tenant</span>
                    <span className="block text-sm font-semibold">Acme Corp</span>
                  </div>

                  <div className="flex flex-col items-end text-right sm:text-right">
                    <span className="text-xs text-white/60">Last login</span>
                    <span className="text-sm font-medium">Today</span>
                  </div>
                </div>
              </div>
            </section>

            {/* KPI grid */}
            <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
              <KpiCardEnhanced label="Open Leads" value={kpiLoading ? "…" : openLeads} trend={kpiLoading ? "…" : openLeadsTrend} icon={<IconLeads />} />
              <KpiCardEnhanced label="Today’s Follow-ups" value={kpiLoading ? "…" : todaysFollowups} trend={kpiLoading ? "…" : "On track"} icon={<IconCalendar />} />
              <KpiCardEnhanced label="Conversion (est.)" value={kpiLoading ? "…" : conversion} trend={kpiLoading ? "…" : "+1.2%"} icon={<IconGauge />} />
            </section>

            {/* Main: calendar + aside (stack on mobile) */}
            <section className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
              <div className="lg:col-span-2 rounded-2xl p-4 sm:p-6" style={{ background: "linear-gradient(180deg, rgba(12,16,30,0.55), rgba(8,10,16,0.5))", border: "1px solid rgba(255,255,255,0.04)", backdropFilter: "blur(10px)" }}>
                <div className="mb-3 flex items-center justify-between">
                  <h2 className="text-sm sm:text-base font-semibold tracking-wide">Lead Follow-ups Calendar</h2>
                  <span className="text-xs text-white/50">Drag to reschedule • Tap to edit</span>
                </div>

                <Suspense fallback={<div className="mt-2 animate-pulse space-y-3"><div className="h-6 w-40 rounded bg-white/10" /><div className="h-64 rounded-xl border border-white/10 bg-white/5" /></div>}>
                  <div className="min-h-[280px] sm:min-h-[360px]">
                    <LeadCalendar key={calendarKey} />
                  </div>
                </Suspense>
              </div>

              <aside className="rounded-2xl p-3 sm:p-4" style={{ background: "linear-gradient(180deg, rgba(10,12,20,0.5), rgba(8,8,12,0.45))", border: "1px solid rgba(255,255,255,0.04)" }}>
                <h3 className="text-sm font-semibold">Today</h3>
                <div className="mt-3 space-y-3 max-h-[48vh] sm:max-h-[60vh] overflow-auto pr-2">
                  <div className="rounded-md p-3 bg-white/5 border border-white/10">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-sm font-medium">Call: John Doe</div>
                        <div className="text-xs text-white/60">At 3:30 PM • Reminder set</div>
                      </div>
                      <div className="text-xs text-white/60">10m</div>
                    </div>
                  </div>

                  <div className="rounded-md p-3 bg-white/5 border border-white/10">
                    <div className="text-sm font-medium">Invoice #234 overdue</div>
                    <div className="text-xs text-white/60">Customer: Acme Ltd</div>
                  </div>
                </div>

                <div className="mt-4"><Link href="/activities" className="text-xs underline">View all activities</Link></div>
              </aside>
            </section>

            <footer className="mt-6 sm:mt-10 py-6 text-center text-xs opacity-60">© {new Date().getFullYear()} GeniusGrid — Made for speed, accuracy & AI.</footer>

            {/* Quick lead drawer portal */}
            <QuickLeadDrawer
              open={showQuick}
              onClose={() => setShowQuick(false)}
              onCreated={handleCreated}
            />
          </>
        ) : null}
      </main>
    </div>
  );
}

/* ───────── UI helpers ───────── */
function KpiCardEnhanced({ label, value, trend, icon }: { label: string; value: string; trend: string; icon?: React.ReactNode }) {
  return (
    <div className="group rounded-2xl p-3 sm:p-4 transform transition-transform duration-200 hover:-translate-y-1" style={{ background: "linear-gradient(180deg, rgba(18,24,40,0.5), rgba(8,10,18,0.45))", border: "1px solid rgba(255,255,255,0.04)", boxShadow: "0 6px 18px rgba(15,23,42,0.4)" }}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 min-w-0">
          <div className="h-11 w-11 rounded-xl flex items-center justify-center" style={{ background: "linear-gradient(90deg, rgba(255,255,255,0.03), rgba(255,255,255,0.02))", border: "1px solid rgba(255,255,255,0.03)" }}>{icon}</div>
          <div className="min-w-0">
            <div className="text-xs text-white/70">{label}</div>
            <div className="mt-1 flex items-baseline gap-3">
              <div className="text-xl sm:text-2xl md:text-3xl font-extrabold tracking-tight">{value}</div>
              <div className="text-[11px] rounded-full px-2 py-0.5" style={{ background: "rgba(16,185,129,0.08)", color: "#86efac", border: "1px solid rgba(16,185,129,0.12)" }}>{trend}</div>
            </div>
          </div>
        </div>

        <div className="hidden md:block">
          <svg width="64" height="28" viewBox="0 0 64 28" className="opacity-60" aria-hidden>
            <polyline fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="2" points="0,20 12,12 24,16 36,8 48,14 64,6" />
            <polyline fill="none" stroke="rgba(99,102,241,0.7)" strokeWidth="2" points="0,20 12,12 24,16 36,8 48,14 64,6" />
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
      <path fill="currentColor" d="M12 12a5 5 0 1 0 0-10 5 5 0 0 0 0 10zM2 20c0-3.3 4.3-6 10-6s10 2.7 10 6v2H2v-2z" />
    </svg>
  );
}
function IconCalendar() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden>
      <path fill="currentColor" d="M7 10h5v5H7zM3 5h2V3h2v2h8V3h2v2h2a1 1 0 0 1 1 1v13a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a1 1 0 0 1 1-1z" />
    </svg>
  );
}
function IconGauge() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden>
      <path fill="currentColor" d="M12 3a9 9 0 1 0 9 9 9 9 0 0 0-9-9zm1 5h-2v6l5 2 .7-1.2L13 13V8z" />
    </svg>
  );
}
