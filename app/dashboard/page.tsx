// path: app/dashboard/page.tsx
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import Link from "next/link";
import { Suspense } from "react";
import FireworksOnce from "./FireworksOnce";
import TopNav from "@/app/components/TopNav";
import LeadCalendar from "@/app/dashboard/components/LeadCalendar";

export const dynamic = "force-dynamic";

/* ───────────────── Constants & Types ───────────────── */
const RAW_ORIGIN = process.env.NEXT_PUBLIC_APP_ORIGIN ?? "http://localhost:3000";
const ORIGIN = RAW_ORIGIN.replace(/\/+$/, "");

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
  roles?: string[] | null; // flexible: some backends send array
  role_codes?: string[] | null; // flexible: codes like ["Salesman"]
};

type MeResponse = {
  user?: MeUser | null;
  roles?: string[]; // flexible: some backends put roles at root
};

/* ───────────────── Utils ───────────────── */
function quickHref(src: string, ret = "/dashboard") {
  return `/crm/leads/new?mode=quick&src=${encodeURIComponent(src)}&return=${encodeURIComponent(ret)}`;
}
function detailedHref(src: string, ret = "/dashboard") {
  return `/crm/leads/new?mode=detailed&src=${encodeURIComponent(src)}&return=${encodeURIComponent(ret)}`;
}

async function fetchJSON<T>(url: string, cookie: string, { timeoutMs = 4000 } = {}): Promise<T | null> {
  const ac = new AbortController();
  const t = setTimeout(() => ac.abort(), timeoutMs);
  try {
    const r = await fetch(url, {
      headers: { cookie },
      cache: "no-store",
      signal: ac.signal,
    });
    if (!r.ok) return null;
    return (await r.json()) as T;
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}

async function fetchMe(sid: string): Promise<MeResponse | null> {
  return fetchJSON<MeResponse>(`${ORIGIN}/api/auth/me`, `ssr_sid=${sid}`, { timeoutMs: 3500 });
}

function isSalesRole(me: MeResponse | null): boolean {
  if (!me) return false;
  const pool: string[] = [
    ...(me.roles ?? []),
    ...((me.user?.roles as string[] | null) ?? []),
    ...((me.user?.role_codes as string[] | null) ?? []),
  ];
  if (pool.length > 0) return pool.some((r) => /sales|salesman|salesperson|bd[e]?/i.test(String(r)));
  if (me.user?.role) return /sales|salesman|salesperson|bd[e]?/i.test(me.user.role);
  return false;
}

async function fetchKPIs(sid: string, opts?: { mine?: boolean }): Promise<KpisPayload | null> {
  const url = new URL(`${ORIGIN}/api/kpis`);
  if (opts?.mine) url.searchParams.set("mine", "1");
  else url.searchParams.set("scope", "all");        // ← show all for non-sales / admins
  url.searchParams.set("table", "leads");           // ← force the plural table
  return fetchJSON<KpisPayload>(url.toString(), `ssr_sid=${sid}`, { timeoutMs: 3500 });
}

/* ───────────────── Page ───────────────── */
export default async function DashboardPage() {
  const cookieStore = await cookies();
  const sid = cookieStore.get("ssr_sid")?.value ?? cookieStore.get("sid")?.value;
  if (!sid) redirect("/login");

  const meRes = await fetchMe(sid);
  const user = meRes?.user;
  if (!user) redirect("/login");

  const mine = isSalesRole(meRes); // ⇦ Sales roles see user-wise KPIs
  const kpiRes = await fetchKPIs(sid, { mine });

  const displayName = user.name?.trim() || user.email || "user";

  const openLeads = String(kpiRes?.open_leads ?? kpiRes?.open_leads_count ?? 0);
  const todaysFollowups = String(kpiRes?.todays_followups ?? kpiRes?.followups_today ?? 0);
  const openLeadsTrend = String(kpiRes?.open_leads_trend ?? "+0%");

  return (
    <div className="min-h-dvh bg-gradient-to-b from-zinc-950 via-zinc-900 to-black text-zinc-100">
      <FireworksOnce />
      <TopNav />

      <main className="mx-auto w-full max-w-screen-2xl px-3 sm:px-4 lg:px-6 py-6 sm:py-8">
        {/* Welcome + KPIs */}
        <section className="grid grid-cols-1 xl:grid-cols-3 gap-4 sm:gap-6 mb-6">
          <div className="xl:col-span-2 rounded-2xl border border-white/10 bg-white/5 p-5 sm:p-6">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight">
              Welcome, <span className="text-white/90">{displayName}</span> 👋
            </h1>
            <p className="mt-1 text-sm opacity-80">
              Secure SSR session is active. Your data is scoped to your tenant & company context.
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
            <KpiCard label="Open Leads" value={openLeads} trend={openLeadsTrend} />
            <KpiCard label="Today’s Follow-ups" value={todaysFollowups} trend="On track" />
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
