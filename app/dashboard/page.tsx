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
  open_leads?: number | null;
  open_leads_count?: number | null;
  todays_followups?: number | null;
  followups_today?: number | null;
  open_leads_trend?: string;
  conversion_percentage?: number | string | null;
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

type Tenant = {
  id: string;
  name: string;
};

type Activity = {
  id: string;
  title: string;
  meta?: string;
  duration?: string;
};

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
      await delay(200);
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

  const normalizePayload = (data: any): KpisPayload => {
    // be permissive: accept number or string; return number when present, null when missing
    const getNum = (keys: string[]): number | null => {
      for (const k of keys) {
        const v = data?.[k];
        if (v === undefined || v === null) continue;
        if (typeof v === "number") return v;
        if (typeof v === "string" && v.trim() !== "") {
          const parsed = Number(v);
          if (!Number.isNaN(parsed)) return parsed;
        }
        // ignore other types
      }
      return null; // important: null = "no value returned"
    };

    const normalized: KpisPayload = {
      open_leads: getNum(["open_leads", "open_leads_count"]),
      open_leads_count: getNum(["open_leads_count", "open_leads"]),
      todays_followups: getNum(["todays_followups", "followups_today", "followups", "today_followups"]),
      followups_today: getNum(["followups_today", "todays_followups", "followups"]),
      open_leads_trend: data?.open_leads_trend ?? data?.trend ?? "+0%",
      conversion_percentage: data?.conversion_percentage ?? data?.conversion ?? "–",
    };
    return normalized;
  };

  const fetchTodaysFromServer = async (): Promise<number | null> => {
    try {
      const r = await fetch("/kpis/todays", { credentials: "include", cache: "no-store" });
      if (!r.ok) {
        // try /api/kpis/todays as fallback (if you proxy to /api)
        const r2 = await fetch("/api/kpis/todays", { credentials: "include", cache: "no-store" }).catch(() => null);
        if (!r2 || !r2.ok) return null;
        const d2 = await r2.json().catch(() => null);
        if (d2 && (typeof d2.todays_followups === "number" || typeof d2.todays_followups === "string")) {
          const p = Number(d2.todays_followups);
          return Number.isNaN(p) ? null : p;
        }
        return null;
      }
      const data = await r.json().catch(() => null);
      if (!data) return null;
      const v = data.todays_followups ?? data.todaysFollowups ?? data.count ?? null;
      if (v === undefined || v === null) return null;
      const parsed = Number(v);
      return Number.isNaN(parsed) ? null : parsed;
    } catch (e) {
      console.warn("[useKpis] fetchTodaysFromServer failed", e);
      return null;
    }
  };

  const fetchKpis = useMemo(() => {
    return async (): Promise<KpisPayload | null> => {
      if (authed !== true) return null;
      setLoading(true);
      try {
        const url = new URL("/api/kpis", window.location.origin);
        if (mine) url.searchParams.set("mine", "1");
        url.searchParams.set("table", "leads");

        const r = await fetch(url.toString(), { credentials: "include", cache: "no-store" });
        console.debug("[useKpis] GET", url.toString(), "status", r.status);
        const raw = await r.text().catch(() => "");
        let parsed: any = null;
        try {
          parsed = raw ? JSON.parse(raw) : null;
        } catch (parseErr) {
          console.warn("[useKpis] response not JSON:", raw.slice(0, 1000));
          parsed = null;
        }
        console.debug("[useKpis] raw payload:", parsed ?? raw);

        if (!r.ok || !parsed) {
          setKpis(null);
          return null;
        } else {
          const normalized = normalizePayload(parsed);

          // Try to fetch tenant-wide todays count from dedicated endpoint and prefer it when present
          const tenantWide = await fetchTodaysFromServer();
          if (tenantWide !== null) {
            normalized.todays_followups = tenantWide;
            normalized.followups_today = tenantWide;
          }

          setKpis(normalized);
          return normalized;
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
      } catch (e) {
        console.warn("[useKpis] initial fetch failed", e);
      }
    })();

    const poll = setInterval(() => {
      if (!alive) return;
      if (authed !== true) return;
      fetchKpis().catch(() => {});
    }, 30000);

    return () => {
      alive = false;
      clearInterval(poll);
    };
  }, [authed, fetchKpis]);

  return { kpis, loading, mine, refetch: fetchKpis, setKpis };
}

/* ───────── Page ───────── */
export default function DashboardPage() {
  const { authed, me } = useAuthTolerant();
  const { kpis, loading: kpiLoading, mine, refetch, setKpis } = useKpis(authed, me);
  const { toast } = useToast();

  const [tenant, setTenant] = useState<Tenant | null>(null);

  const calendarRef = React.useRef<HTMLDivElement | null>(null);
  const [calendarFocused, setCalendarFocused] = useState(false);

  useEffect(() => {
    if (authed === false) {
      window.location.replace("/login");
    }
  }, [authed]);

  const loading = authed === null;
  const displayName = me?.user?.name?.trim() || me?.user?.email || "User";

  const [localKpis, setLocalKpis] = useState<KpisPayload | null>(null);
  useEffect(() => {
    if (kpis) setLocalKpis(kpis);
  }, [kpis]);

  const openLeads = (() => {
    const n = localKpis?.open_leads ?? localKpis?.open_leads_count ?? null;
    return n === null || n === undefined ? "–" : String(n);
  })();

  const todaysFollowups = (() => {
    const n = localKpis?.todays_followups ?? localKpis?.followups_today ?? null;
    // previously you hid zero as "–"; now show 0 explicitly. Only missing values are "–"
    if (n === null || n === undefined) return "–";
    return String(n);
  })();

  const openLeadsTrend = String(localKpis?.open_leads_trend ?? "–");
  const conversion = localKpis?.conversion_percentage ? String(localKpis.conversion_percentage) : "–";

  const [showQuick, setShowQuick] = useState(false);
  const [calendarKey, setCalendarKey] = useState(0);

  useEffect(() => {
    let alive = true;
    (async () => {
      if (authed !== true) return;
      try {
        const tResp = await fetch("/api/tenants", { credentials: "include", cache: "no-store" }).catch(() => null);

        if (!alive) return;

        if (tResp && tResp.ok) {
          const td = await tResp.json().catch(() => null);
          if (td) {
            if (td.tenant) setTenant(td.tenant as Tenant);
            else if (td.id) setTenant(td as Tenant);
          }
        }
      } catch (e) {
        console.warn("[Dashboard] auxiliary data load failed", e);
      }
    })();
    return () => {
      alive = false;
    };
  }, [authed]);

  async function handleCreated(lead: any) {
    try {
      setLocalKpis((prev) => {
        if (!prev) return prev;
        const copy = { ...prev };
        const numeric = Number(prev.open_leads ?? prev.open_leads_count ?? 0);
        if (typeof prev.open_leads === "number" || prev.open_leads === null) copy.open_leads = numeric + 1;
        if (typeof prev.open_leads_count === "number" || prev.open_leads_count === null) copy.open_leads_count = numeric + 1;
        return copy;
      });

      setShowQuick(false);

      const fresh = await refetch?.();
      if (fresh) {
        setKpis?.(fresh);
        setLocalKpis(fresh);
        toast({ title: "Dashboard updated", description: "KPIs refreshed." });
      } else {
        toast({ title: "Saved", description: "Lead saved. KPIs will update shortly.", variant: "default" });
      }

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
          'radial-gradient(800px 300px at 50% 8%, rgba(80,100,220,0.12), transparent 12%), radial-gradient(600px 260px at 10% 75%, rgba(60,50,130,0.06), transparent 10%), linear-gradient(180deg,#04050a 0%, #03030b 70%)',
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
                    <GhostButton
                      onClick={() => setShowQuick(true)}
                      className="w-full sm:w-auto justify-center ring-1 ring-indigo-500/20 hover:ring-indigo-500/40"
                    >
                      + Quick Lead
                    </GhostButton>

                    <GhostButton href={detailedHref("welcome_detailed")} className="w-full sm:w-auto justify-center">
                      + Detailed Lead
                    </GhostButton>

                    <Link href="/crm/leads" className="w-full sm:w-auto">
                      <GhostButton className="w-full sm:w-auto justify-center">Open Leads</GhostButton>
                    </Link>

                    <button
                      type="button"
                      onClick={() => {
                        try {
                          const el = calendarRef.current || document.getElementById("lead-calendar");
                          if (el) {
                            el.scrollIntoView({ behavior: "smooth", block: "center" });
                            setTimeout(() => {
                              try {
                                (el as HTMLElement).focus();
                                setCalendarFocused(true);
                                setTimeout(() => setCalendarFocused(false), 1600);
                              } catch {
                                // ignore focus errors
                              }
                            }, 220);
                          }
                        } catch (err) {
                          console.warn("focus calendar failed", err);
                        }
                      }}
                      className="w-full sm:w-auto"
                    >
                      <GhostButton className="w-full sm:w-auto justify-center">Schedule Call</GhostButton>
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-end">
                  <div
                    className="rounded-full px-3 py-2 text-xs font-medium min-w-[96px] text-center"
                    style={{
                      background: "linear-gradient(90deg, rgba(255,255,255,0.02), rgba(255,255,255,0.01))",
                      border: "1px solid rgba(255,255,255,0.04)",
                    }}
                  >
                    <span className="block text-[11px] text-white/80">Tenant</span>
                    <span className="block text-sm font-semibold">{tenant?.name ?? "—"}</span>
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

            {/* Main: full-width calendar (aside removed) */}
            <section className="grid grid-cols-1 gap-6 mb-8">
              <div className="rounded-2xl p-4 sm:p-6" style={{ background: "linear-gradient(180deg, rgba(12,16,30,0.55), rgba(8,10,16,0.5))", border: "1px solid rgba(255,255,255,0.04)", backdropFilter: "blur(10px)" }}>
                <div className="mb-3 flex items-center justify-between">
                  <h2 className="text-sm sm:text-base font-semibold tracking-wide">Lead Follow-ups Calendar</h2>
                  <span className="text-xs text-white/50">Drag to reschedule • Tap to edit</span>
                </div>

                <Suspense fallback={<div className="mt-2 animate-pulse space-y-3"><div className="h-6 w-40 rounded bg-white/10" /><div className="h-64 rounded-xl border border-white/10 bg-white/5" /></div>}>
                  <div
                    id="lead-calendar"
                    ref={calendarRef}
                    tabIndex={-1}
                    className={`min-h-[280px] sm:min-h-[360px] outline-none transition-shadow duration-300 ${calendarFocused ? "ring-2 ring-indigo-500/60 rounded-xl" : ""}`}
                  >
                    <LeadCalendar key={calendarKey} />
                  </div>
                </Suspense>
              </div>
            </section>

            <footer className="mt-6 sm:mt-10 py-6 text-center text-xs opacity-60">© {new Date().getFullYear()} GeniusGrid — Made for speed, accuracy & AI.</footer>

            {/* Quick lead drawer portal */}
            <QuickLeadDrawer open={showQuick} onClose={() => setShowQuick(false)} onCreated={handleCreated} />
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
