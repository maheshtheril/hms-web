// web/app/crm/leads/page.tsx
import "server-only";
import { cookies, headers } from "next/headers";
import BackToDashboardButton from "../../components/BackToDashboardButton";

// import { redirect } from "next/navigation";
import Link from "next/link";
// TopNav removed to avoid duplicate nav bar

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const revalidate = 0;

/* ───────────────── Types ───────────────── */
type LeadMeta = {
  follow_up_date?: string | null;
  expected_revenue?: number | null;
  profession?: string | null;
  notes?: string | null;
  address?: Record<string, any> | null;
  [k: string]: any;
};

type Lead = {
  id: string;
  tenant_id?: string | null;
  company_id?: string | null;
  owner_id?: string | null;
  pipeline_id?: string | null;
  stage_id?: string | null;
  name: string;
  email?: string | null;
  phone?: string | null;
  primary_phone_e164?: string | null;
  status?: string | null;
  stage?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  estimated_value?: number | null;
  probability?: number | null;
  source_id?: string | null;
  tags?: string[] | null;
  meta?: LeadMeta | null;
  follow_up_date?: string | null;
  expected_revenue?: number | null;
  deleted?: boolean;
  deleted_at?: string | null;
  deleted_by?: string | null;
};

type Insight = { next_action: string; reason: string; score: number };
type InsightMap = Record<string, Insight>;

/* ───────────────── Helpers: HTTP ───────────────── */
async function makeCookieHeader() {
  const c = await cookies();
  const ssr = c.get("ssr_sid")?.value;
  const sid = c.get("sid")?.value;
  if (ssr && sid) return `ssr_sid=${ssr}; sid=${sid}`;
  if (ssr) return `ssr_sid=${ssr}`;
  if (sid) return `sid=${sid}`;
  return "";
}

async function abs(url: string) {
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? (host?.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}${url}`;
}

async function getJSON(url: string, cookieHeader: string, init?: RequestInit) {
  const full = await abs(url);
  const r = await fetch(full, { headers: { cookie: cookieHeader, ...(init?.headers || {}) }, cache: "no-store", ...init });
  const text = await r.text();
  let data: any = null;
  try { data = text ? JSON.parse(text) : null; } catch {}
  return { ok: r.ok, status: r.status, data, text };
}

/* ───────────────── Coercion + fmt ───────────────── */
function coerceLeads(body: any): Lead[] {
  const arr = Array.isArray(body?.leads) ? body.leads
    : Array.isArray(body?.items) ? body.items
    : Array.isArray(body) ? body
    : [];
  return arr as Lead[];
}

const inr0 = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });
const inr2 = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 });

function fmtMoney(n?: number | null, fraction: 0 | 2 = 0) {
  if (n === null || n === undefined || isNaN(Number(n))) return "—";
  return (fraction === 0 ? inr0 : inr2).format(Number(n));
}

function clampPct(p?: number | null) {
  if (p === null || p === undefined || isNaN(Number(p))) return null;
  return Math.min(100, Math.max(0, Math.round(Number(p))));
}

function fmtPct(p?: number | null) {
  const v = clampPct(p);
  return v === null ? "—" : `${v}%`;
}

function fmtDate(d?: string | null) {
  if (!d) return "—";
  const dt = d.length <= 10 ? new Date(`${d}T00:00:00`) : new Date(d);
  if (isNaN(dt.getTime())) return d;
  return dt.toLocaleDateString("en-IN", { year: "numeric", month: "short", day: "2-digit" });
}

function daysUntil(dateStr?: string | null) {
  if (!dateStr) return null;
  const dt = new Date(dateStr.length <= 10 ? `${dateStr}T00:00:00` : dateStr);
  if (isNaN(dt.getTime())) return null;
  const now = new Date();
  const ms = dt.getTime() - new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  return Math.round(ms / (1000 * 60 * 60 * 24));
}

function expectedRevenueOf(lead: Lead) {
  if (lead.expected_revenue !== undefined && lead.expected_revenue !== null) return Number(lead.expected_revenue);
  const metaVal = lead?.meta?.expected_revenue;
  if (metaVal !== undefined && metaVal !== null) return Number(metaVal);
  const v = Number(lead?.estimated_value ?? NaN);
  const p = clampPct(lead?.probability);
  if (!isFinite(v) || p === null) return null;
  return Math.round((v * (p / 100)) * 100) / 100;
}

function followUpOf(lead: Lead) {
  return lead.follow_up_date ?? lead?.meta?.follow_up_date ?? null;
}

function isDeleted(l: Lead) {
  return Boolean((l as any)?.deleted === true || (l as any)?.deleted_at || l?.meta?.deleted_at);
}

/* ───────────────── AI heuristics (fallback) ───────────────── */
function heuristicInsight(lead: Lead): Insight {
  const exp = expectedRevenueOf(lead) ?? 0;
  const p = clampPct(lead.probability) ?? 0;
  const fup = followUpOf(lead);
  const d = daysUntil(fup);

  let reasonBits: string[] = [];
  let next = "Review details";

  let score = Math.min(100, Math.round((Math.log10(Math.max(exp, 1) + 1) * 25) + p * 0.6));
  if (d !== null) {
    if (d < 0) { score -= Math.min(30, Math.abs(d) * 3); reasonBits.push(`${Math.abs(d)}d overdue`); next = "Call now"; }
    else if (d === 0) { score += 10; reasonBits.push("due today"); next = "Confirm meeting"; }
    else if (d <= 3) { score += 5; reasonBits.push(`due in ${d}d`); next = "Send reminder"; }
    else { reasonBits.push(`follow-up ${fmtDate(fup)}`); }
  } else {
    score -= 10; reasonBits.push("no follow-up date"); next = "Set follow-up";
  }
  if (p >= 70) reasonBits.push("high probability");
  if ((lead.estimated_value ?? 0) >= 100000) reasonBits.push("high value");

  score = Math.max(0, Math.min(100, score));
  return { next_action: next, reason: reasonBits.join(" · ") || "—", score };
}

async function getAIInsights(leads: Lead[], cookieHeader: string): Promise<InsightMap> {
  const ids = leads.map(l => l.id);
  try {
    const r = await getJSON("/api/ai/leads/next-actions", cookieHeader, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ids }),
    } as any);
    if (r.ok && r.data?.insights && typeof r.data.insights === "object") {
      return r.data.insights as InsightMap;
    }
  } catch {}
  const map: InsightMap = {};
  for (const l of leads) map[l.id] = heuristicInsight(l);
  return map;
}

/* ───────────────── Filters / Sorting ───────────────── */
type ResolvedSearch = Record<string, string | string[] | undefined>;
type PageProps = { searchParams?: Promise<ResolvedSearch> };

function getParam(sp: ResolvedSearch, key: string) {
  const v = sp?.[key];
  if (Array.isArray(v)) return v[0];
  return v || undefined;
}

function normalize(x?: string | null) {
  return (x ?? "").toString().toLowerCase().trim();
}

function applyFilter(leads: Lead[], sp: ResolvedSearch) {
  const filter = getParam(sp, "filter");
  const qRaw = getParam(sp, "q");
  const q = normalize(qRaw);

  // Text search first
  let res = leads;
  if (q) {
    res = res.filter((l) => {
      const hay: string[] = [
        normalize(l.name),
        normalize(l.email),
        normalize(l.phone),
        normalize(l.status),
        ...(Array.isArray(l.tags) ? l.tags.map(t => normalize(t)) : []),
      ];
      if (l.meta) {
        hay.push(normalize((l.meta as any).notes));
        hay.push(normalize((l.meta as any).profession));
      }
      return hay.some((s) => s.includes(q));
    });
  }

  // Quick filter chips next
  if (!filter) return res;

  return res.filter(l => {
    const fup = followUpOf(l);
    const d = daysUntil(fup);
    const exp = expectedRevenueOf(l) ?? 0;
    switch (filter) {
      case "deleted": return isDeleted(l);
      case "overdue": return d !== null && d < 0;
      case "week": return d !== null && d >= 0 && d <= 7;
      case "high": return exp >= 100000;
      case "unassigned": return !l.owner_id;
      default: return true;
    }
  });
}

function applySort(leads: Lead[], sp: ResolvedSearch) {
  const sort = getParam(sp, "sort");
  if (!sort) return leads;
  const dir = getParam(sp, "dir") === "asc" ? 1 : -1;
  const sorted = [...leads];
  sorted.sort((a, b) => {
    const by = (key: string) => {
      switch (key) {
        case "value": return (a.estimated_value ?? 0) - (b.estimated_value ?? 0);
        case "prob": return (a.probability ?? 0) - (b.probability ?? 0);
        case "exp": return (expectedRevenueOf(a) ?? 0) - (expectedRevenueOf(b) ?? 0);
        case "follow": {
          const da = daysUntil(followUpOf(a)) ?? 9e9;
          const db = daysUntil(followUpOf(b)) ?? 9e9;
          return da - db;
        }
        case "score": {
          const sa = heuristicInsight(a).score;
          const sb = heuristicInsight(b).score;
          return sa - sb;
        }
        default: {
          const ta = a.created_at ? new Date(a.created_at).getTime() : 0;
          const tb = b.created_at ? new Date(b.created_at).getTime() : 0;
          return ta - tb;
        }
      }
    };
    return by(sort) * dir;
  });
  return sorted;
}

/* ───────────────── Pagination ───────────────── */
function parsePositiveInt(s?: string, fallback = 1) {
  const n = Number(s ?? "");
  return Number.isFinite(n) && n >= 1 ? Math.floor(n) : fallback;
}

function mkLinkFrom(sp: ResolvedSearch, params: Record<string, string | undefined>) {
  const cur = new URLSearchParams();
  for (const [k, v] of Object.entries(sp || {})) {
    if (v !== undefined) cur.set(k, Array.isArray(v) ? v[0] : v);
  }
  for (const [k, v] of Object.entries(params)) {
    if (!v) cur.delete(k);
    else cur.set(k, v);
  }
  const qs = cur.toString();
  return `/crm/leads${qs ? `?${qs}` : ""}`;
}

/* ───────────────── Company name lookup ───────────────── */
type CompanyLite = { id: string; name: string };
type CompanyMap = Record<string, string>;

async function fetchCompanyNames(leads: Lead[], cookieHeader: string): Promise<CompanyMap> {
  const ids = Array.from(new Set(leads.map(l => l.company_id).filter(Boolean))) as string[];
  if (ids.length === 0) return {};
  // Try a bulk endpoint first: /api/companies?ids=...
  const qs = new URLSearchParams();
  qs.set("ids", ids.join(","));
  const r = await getJSON(`/api/companies?${qs.toString()}`, cookieHeader);
  const map: CompanyMap = {};
  if (r.ok && Array.isArray(r.data?.items)) {
    for (const c of r.data.items as CompanyLite[]) {
      if (c?.id) map[c.id] = c.name ?? "";
    }
    return map;
  }
  // Fallback: try admin list (first page) and map what we can
  const r2 = await getJSON(`/api/admin/companies?limit=${Math.max(100, ids.length)}`, cookieHeader);
  if (r2.ok && Array.isArray(r2.data?.items)) {
    for (const c of r2.data.items as CompanyLite[]) {
      if (c?.id) map[c.id] = c.name ?? "";
    }
  }
  return map;
}

/* ───────────────── Status badge helper ───────────────── */
/**
 * Returns a tailwind class string for different lead statuses.
 * Adjust or expand this map as your app uses more statuses.
 */
function statusBadge(status?: string | null, deleted = false) {
  if (deleted) {
    return {
      label: "Deleted",
      cls: "rounded-full px-2 py-0.5 text-xs border border-red-500/30 bg-red-500/10 text-red-200",
    };
  }
  const s = (status ?? "new").toString().toLowerCase();
  switch (s) {
    case "new":
      return { label: "New", cls: "rounded-full px-2 py-0.5 text-xs border border-blue-500/30 bg-blue-500/8 text-blue-200" };
    case "contacted":
    case "in contact":
      return { label: "Contacted", cls: "rounded-full px-2 py-0.5 text-xs border border-amber-500/30 bg-amber-500/8 text-amber-200" };
    case "qualified":
    case "opportunity":
      return { label: "Qualified", cls: "rounded-full px-2 py-0.5 text-xs border border-emerald-500/30 bg-emerald-500/8 text-emerald-200" };
    case "won":
      return { label: "Won", cls: "rounded-full px-2 py-0.5 text-xs border border-green-500/30 bg-green-500/8 text-green-200" };
    case "lost":
    case "lost lead":
      return { label: "Lost", cls: "rounded-full px-2 py-0.5 text-xs border border-red-500/30 bg-red-500/10 text-red-200" };
    case "nurture":
      return { label: "Nurture", cls: "rounded-full px-2 py-0.5 text-xs border border-violet-500/30 bg-violet-500/8 text-violet-200" };
    default:
      return { label: status ?? "—", cls: "rounded-full px-2 py-0.5 text-xs border border-white/10" };
  }
}

/* ───────────────── Page ───────────────── */
export default async function LeadsPage({ searchParams }: PageProps) {
  const cookieHeader = await makeCookieHeader();
  if (!cookieHeader) { /* redirect disabled */ };

  const spObj: ResolvedSearch = (await searchParams) ?? {};
  const me = await getJSON("/api/auth/me", cookieHeader);
  if (!me.ok || !me.data?.user) { /* redirect disabled */ };

  const wantTrash = getParam(spObj, "filter") === "deleted";
  const list = await getJSON(`/api/leads${wantTrash ? "?only_deleted=1" : ""}`, cookieHeader);
  const rawLeads = list.ok ? coerceLeads(list.data) : [];

  // server-side filter/sort → paginate
  const filtered = applySort(applyFilter(rawLeads, spObj), spObj);

  const page = parsePositiveInt(getParam(spObj, "page"), 1);
  const size = Math.min(200, parsePositiveInt(getParam(spObj, "size"), 25));
  const total = filtered.length;
  const pages = Math.max(1, Math.ceil(total / size));
  const curPage = Math.min(page, pages);
  const startIdx = (curPage - 1) * size;
  const endIdx = Math.min(startIdx + size, total);
  const pageItems = filtered.slice(startIdx, endIdx);

  // optional AI insights for current page only
  const insights = await getAIInsights(pageItems, cookieHeader);

  // company name map for current page
  const companyMap = await fetchCompanyNames(pageItems, cookieHeader);

  const returnTo = encodeURIComponent("/crm/leads");
  const mk = (params: Record<string, string | undefined>) => mkLinkFrom(spObj, params);

  return (
    <div className="min-h-dvh bg-gradient-to-b from-zinc-950 via-zinc-900 to-black text-zinc-100">
      {/* header area — removed TopNav (assume app layout supplies it). */}
      <main className="mx-auto w-full max-w-screen-2xl px-3 sm:px-4 lg:px-6 py-6 sm:py-8">
        {/* Header (Neural Glass) */}
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Leads</h1>
            <p className="text-sm text-white/60 mt-1">Smart filters, search, AI next-steps, and pagination.</p>

            {/* Search bar (glass) */}
            <form action="/crm/leads" className="mt-3 flex items-center gap-2">
              {/* preserve existing params */}
              {["filter","sort","dir","size"].map((k) => {
                const v = getParam(spObj, k);
                return v ? <input key={k} type="hidden" name={k} value={v} /> : null;
              })}
              <input type="hidden" name="page" value="1" />
              <input
                type="search"
                name="q"
                defaultValue={getParam(spObj, "q") ?? ""}
                placeholder="Search name, email, phone, status, tags…"
                className="w-72 rounded-full border border-white/6 bg-white/3 px-3 py-2 text-sm placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-white/10 backdrop-blur-sm"
              />
              <button
                type="submit"
                className="rounded-full border border-white/10 px-3 py-2 text-sm hover:bg-white/6 shadow-sm"
              >
                Search
              </button>
              {getParam(spObj, "q") ? (
                <Link href={mk({ q: undefined, page: "1" })} className="text-xs opacity-70 underline">
                  Clear
                </Link>
              ) : null}
            </form>
          </div>

          <div className="flex flex-wrap gap-2 items-center">
            {/* Back to Dashboard button (client-side push to fixed dashboard route) */}
            <BackToDashboardButton />

            <Link
              href={`/crm/leads/new?mode=detailed&src=leads_page_detailed&return=${returnTo}`}
              className="rounded-full bg-white text-black px-4 py-2 text-sm font-semibold hover:bg-zinc-100 shadow-2xl shadow-black/30"
            >
              + Detailed Lead
            </Link>
            <Link
              href={`/crm/leads/new?mode=quick&src=leads_page_quick&return=${returnTo}`}
              className="rounded-full border border-white/10 px-4 py-2 text-sm hover:bg-white/6"
            >
              Quick Lead
            </Link>
          </div>
        </div>

        {/* Smart filters (glass chips) */}
        <div className="mb-4 flex flex-wrap gap-2 text-xs">
          <span className="opacity-70 self-center">Quick filters:</span>
          <Link href={mk({ filter: undefined, page: "1" })} className="rounded-full border border-white/8 px-2 py-1 hover:bg-white/6">All</Link>
          <Link href={mk({ filter: "overdue", page: "1" })} className="rounded-full border border-white/8 px-2 py-1 hover:bg-white/6">Overdue</Link>
          <Link href={mk({ filter: "week", page: "1" })} className="rounded-full border border-white/8 px-2 py-1 hover:bg-white/6">Due this week</Link>
          <Link href={mk({ filter: "high", page: "1" })} className="rounded-full border border-white/8 px-2 py-1 hover:bg-white/6">High value</Link>
          <Link href={mk({ filter: "unassigned", page: "1" })} className="rounded-full border border-white/8 px-2 py-1 hover:bg-white/6">Unassigned</Link>
          <Link href={mk({ filter: "deleted", page: "1" })} className="rounded-full border border-red-500/30 px-2 py-1 hover:bg-red-500/10 text-red-200">Trash</Link>

          <span className="opacity-70 self-center ml-3">Sort:</span>
          <Link href={mk({ sort: "exp", dir: "desc", page: "1" })} className="rounded-full border border-white/8 px-2 py-1 hover:bg-white/6">Expected Rev ↓</Link>
          <Link href={mk({ sort: "follow", dir: "asc", page: "1" })} className="rounded-full border border-white/8 px-2 py-1 hover:bg-white/6">Soonest Follow-up</Link>
          <Link href={mk({ sort: "prob", dir: "desc", page: "1" })} className="rounded-full border border-white/8 px-2 py-1 hover:bg-white/6">Probability ↓</Link>
          <Link href={mk({ sort: "score", dir: "desc", page: "1" })} className="rounded-full border border-white/8 px-2 py-1 hover:bg-white/6">AI Score ↓</Link>

          <span className="opacity-70 self-center ml-3">Page size:</span>
          {["10","25","50","100"].map(s => (
            <Link key={s} href={mk({ size: s, page: "1" })} className="rounded-full border border-white/8 px-2 py-1 hover:bg-white/6">{s}</Link>
          ))}
        </div>

        {!list.ok && (
          <div className="mb-4 rounded-2xl border border-red-500/30 bg-red-500/8 p-3 text-sm">
            <div className="font-semibold">Couldn’t load leads</div>
            <div className="opacity-80">HTTP {list.status}</div>
            {list.text && (
              <pre className="mt-2 max-h-40 overflow-auto whitespace-pre-wrap text-xs opacity-80">{list.text.slice(0, 800)}</pre>
            )}
          </div>
        )}

        {/* Table wrapper (Neural Glass) */}
        <div className="group relative overflow-x-auto rounded-2xl border border-white/6 bg-white/4 backdrop-blur-md shadow-[0_6px_30px_rgba(0,0,0,0.6)]">
          <div className="pointer-events-none absolute right-0 top-0 h-full w-6 bg-gradient-to-l from-black/40 to-transparent z-30" />
          <table className="w-full text-sm min-w-[1120px]">
            <colgroup>
              <col /><col /><col /><col /><col /><col /><col /><col /><col /><col />
              <col /><col style={{ width: "6.5rem" }} />
            </colgroup>
            <thead className="bg-white/6 sticky top-0 z-20 backdrop-blur supports-[backdrop-filter]:bg-white/6">
              <tr className="text-left text-xs uppercase tracking-wide">
                <th className="px-4 py-3">Lead</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Phone</th>
                <th className="px-4 py-3">Company</th>
                <th className="px-4 py-3">Est. Value</th>
                <th className="px-4 py-3">Prob.</th>
                <th className="px-4 py-3">Expected Rev.</th>
                <th className="px-4 py-3">Follow-up</th>
                <th className="px-4 py-3">AI Score</th>
                <th className="px-4 py-3">AI Next Step</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 sticky right-0 z-40 bg-zinc-900/80 backdrop-blur supports-[backdrop-filter]:bg-zinc-900/70">Actions</th>
              </tr>
            </thead>
            <tbody>
              {list.ok && pageItems.length > 0 ? (
                pageItems.map((l) => {
                  const exp = expectedRevenueOf(l);
                  const follow = followUpOf(l);
                  const d = daysUntil(follow);
                  const ai = insights[l.id] ?? heuristicInsight(l);
                  const deleted = isDeleted(l);

                  const chip = d === null
                    ? <span className="rounded-full border border-white/10 px-2 py-0.5 text-[11px] opacity-80">—</span>
                    : d < 0
                      ? <span className="rounded-full border border-red-500/30 bg-red-500/10 px-2 py-0.5 text-[11px] text-red-200">{Math.abs(d)}d overdue</span>
                      : d === 0
                        ? <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[11px] text-amber-200">today</span>
                        : d <= 7
                          ? <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[11px] text-amber-200">{d}d</span>
                          : <span className="rounded-full border border-white/10 px-2 py-0.5 text-[11px] opacity-80">{fmtDate(follow)}</span>;

                  const companyName =
                    (l.company_id && companyMap[l.company_id]) ||
                    (l.company_id ? `#${l.company_id.slice(0, 8)}…` : "—");

                  const status = statusBadge(l.status, deleted);

                  return (
                    <tr
                      key={l.id}
                      className={`border-t border-white/8 hover:bg-white/[0.03] align-top transition-colors ${deleted ? "opacity-60" : ""}`}
                    >
                      <td className="px-4 py-3 font-medium max-w-[240px] truncate">
                        {deleted ? <span className="line-through">{l.name}</span> : l.name}
                      </td>
                      <td className="px-4 py-3 max-w-[240px] truncate">{l.email ?? "—"}</td>
                      <td className="px-4 py-3 whitespace-nowrap">{l.phone ?? "—"}</td>
                      <td className="px-4 py-3">{companyName || "—"}</td>
                      <td className="px-4 py-3 whitespace-nowrap">{fmtMoney(l.estimated_value ?? null)}</td>
                      <td className="px-4 py-3">{fmtPct(l.probability ?? null)}</td>
                      <td className="px-4 py-3 whitespace-nowrap">{fmtMoney(exp, 2)}</td>
                      <td className="px-4 py-3">{chip}</td>
                      <td className="px-4 py-3">
                        <div className="grid place-items-center">
                          <div className="h-2 w-14 rounded bg-white/10 overflow-hidden" aria-label={`AI score ${ai.score}`}>
                            <div className="h-2" style={{ width: `${ai.score}%`, background: "linear-gradient(90deg,#7C3AED,#06B6D4)" }} />
                          </div>
                          <div className="text-[10px] opacity-70 mt-1">{ai.score}</div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-xs">{ai.next_action}</div>
                        <div className="text-[11px] opacity-60">{ai.reason}</div>
                      </td>
                      <td className="px-4 py-3">
                        {/* status with variant colors */}
                        <span className={status.cls}>
                          {status.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 sticky right-0 z-30 bg-black/70 backdrop-blur supports-[backdrop-filter]:bg-black/50">
                        <div className="flex gap-2 whitespace-nowrap">
                          {deleted ? (
                            <span className="text-xs opacity-60">—</span>
                          ) : (
                            <>
                              <Link href={`/crm/leads/${encodeURIComponent(l.id)}`} className="text-xs underline">Open</Link>
                              <Link href={`/crm/leads/${encodeURIComponent(l.id)}/edit`} className="text-xs underline">Edit</Link>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={12} className="px-4 py-8 text-center text-white/70">
                    {list.ok ? (wantTrash ? "Trash is empty." : "No leads yet.") : " "}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination bar */}
        <div className="mt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-sm">
          <div className="opacity-70">
            {total > 0 ? (
              <>Showing <span className="font-medium">{startIdx + 1}</span>–<span className="font-medium">{endIdx}</span> of <span className="font-medium">{total}</span></>
            ) : <>No results</>}
          </div>
          <div className="flex items-center gap-2">
            <Link
              href={mk({ page: curPage > 1 ? String(curPage - 1) : "1" })}
              className={`rounded-lg border border-white/10 px-3 py-1.5 hover:bg-white/6 ${curPage <= 1 ? "pointer-events-none opacity-40" : ""}`}
            >
              Prev
            </Link>
            <span className="text-xs opacity-70">Page</span>
            <span className="rounded-md border border-white/10 px-2 py-1 text-xs">
              {curPage} / {pages}
            </span>
            <Link
              href={mk({ page: curPage < pages ? String(curPage + 1) : String(pages) })}
              className={`rounded-lg border border-white/10 px-3 py-1.5 hover:bg-white/6 ${curPage >= pages ? "pointer-events-none opacity-40" : ""}`}
            >
              Next
            </Link>
          </div>
        </div>

        {/* Debug shortcuts */}
        <div className="mt-3 text-xs opacity-60 flex items-center gap-3 flex-wrap">
          <span>Debug:</span>
          <a className="underline" href="/api/leads" target="_blank">open /api/leads</a>
          <a className="underline" href="/api/auth/me" target="_blank">open /api/auth/me</a>
          <a className="underline" href={mk({ sort: "exp", dir: "desc", page: "1" })}>sort=exp</a>
          <a className="underline" href={mk({ filter: "overdue", page: "1" })}>filter=overdue</a>
          <a className="underline" href={mk({ filter: "deleted", page: "1" })}>filter=deleted</a>
        </div>
      </main>
    </div>
  );
}
