// app/crm/leads/page.tsx — MOST ADVANCED SSR + Client hydration + SEO
import "server-only";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import TopNav from "@/app/components/TopNav";
import LeadsTableClient from "./leads/LeadsTableClient";
import { Suspense } from "react";

export const dynamic = "force-dynamic"; // always fresh
export const runtime = "nodejs";        // consistent server runtime
export const revalidate = 0;

/* ───────────────── SEO ───────────────── */
export async function generateMetadata() {
  return {
    title: "Leads — GeniusGrid CRM",
    description: "Search, filter, and manage your CRM leads with AI-powered insights.",
    robots: { index: true, follow: true },
    openGraph: {
      title: "Leads — GeniusGrid CRM",
      description: "Search, filter, and manage your CRM leads with AI-powered insights.",
      type: "website",
    },
  };
}

/* ───────────────── Types expected by LeadsTableClient ───────────────── */
export type Lead = {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  company?: string | null;
  status: "new" | "contacted" | "qualified" | "lost" | "won";
  source?: string | null;
  score?: number | null;
  owner_name?: string | null;
  tags?: string[] | null;
  created_at: string;
  updated_at: string;
};

export type LeadsListResponse = {
  items: Lead[];
  total: number;
  page: number;
  pageSize: number;
};

/* ───────────────── Helpers ───────────────── */
function buildQS(searchParams: Record<string, string | string[] | undefined>) {
  const sp = new URLSearchParams();
  const allow = ["page", "pageSize", "q", "status", "owner", "sort"] as const;
  for (const k of allow) {
    const v = searchParams[k];
    if (Array.isArray(v)) v.forEach((x) => sp.append(k, String(x)));
    else if (v != null) sp.set(k, String(v));
  }
  return sp.toString();
}

function currentOrigin() {
  const h = headers();
  const proto = h.get("x-forwarded-proto") ?? "https";
  const host = h.get("host") ?? "localhost:3000";
  return `${proto}://${host}`.replace(/\/+$/, "");
}

async function fetchMe(sid: string) {
  const ORIGIN = currentOrigin();
  try {
    const r = await fetch(`${ORIGIN}/api/auth/me`, {
      headers: { cookie: `sid=${sid}; ssr_sid=${sid}` }, // send both to be safe
      cache: "no-store",
    });
    if (!r.ok) return null;
    const { user } = (await r.json().catch(() => ({ user: null }))) as { user: any | null };
    return user;
  } catch {
    return null;
  }
}

async function fetchLeadsSSR(sid: string, qs: string): Promise<LeadsListResponse | null> {
  const ORIGIN = currentOrigin();
  try {
    const url = `${ORIGIN}/api/leads${qs ? `?${qs}` : ""}`;
    const r = await fetch(url, {
      headers: { cookie: `sid=${sid}; ssr_sid=${sid}` },
      cache: "no-store",
    });
    if (!r.ok) return null;
    return (await r.json()) as LeadsListResponse;
  } catch {
    return null;
  }
}

/* ───────────────── Page ───────────────── */
export default async function LeadsPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const cookieStore = await cookies();

  // ✅ Prefer the real login cookie; fall back to ssr_sid
  const sid =
    cookieStore.get("sid")?.value ??
    cookieStore.get("ssr_sid")?.value ??
    null;

  if (!sid) redirect("/login");

  const user = await fetchMe(sid);
  if (!user) redirect("/login");

  // SSR prefetch to avoid blank first paint
  const qs = buildQS(searchParams);
  const initial = await fetchLeadsSSR(sid, qs);

  return (
    <div className="min-h-dvh bg-gradient-to-b from-zinc-950 via-zinc-900 to-black text-zinc-100">
      <TopNav />

      <main className="mx-auto w-full max-w-screen-2xl px-4 lg:px-6 py-6 sm:py-8">
        {/* Header row */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">Leads</h1>

          <div className="flex items-center gap-2">
            <a
              href={`/crm/leads/new?mode=detailed&src=leads_list&return=${encodeURIComponent("/crm/leads")}`}
              className="inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold bg-white text-black hover:bg-zinc-100 active:scale-[.98] transition"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden className="opacity-80">
                <path fill="currentColor" d="M11 11V5h2v6h6v2h-6v6h-2v-6H5v-2z" />
              </svg>
              Add Lead
            </a>
          </div>
        </div>

        {/* Table container with SSR hydration + Suspense fallback */}
        <div className="rounded-2xl border border-white/10 bg-white/5 shadow-lg shadow-black/30 backdrop-blur-sm overflow-hidden">
          <Suspense fallback={<LeadsSkeleton />}>
            <LeadsTableClient initial={initial ?? undefined} />
          </Suspense>

          {!initial && (
            <div className="border-t border-white/10 bg-amber-500/10 text-amber-200 px-4 py-3 text-sm">
              Couldn’t prefetch leads on the server. Loading on the client instead…
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

/* ───────────────── Skeleton ───────────────── */
function LeadsSkeleton() {
  return (
    <div className="p-6 animate-pulse">
      <div className="mb-4 h-9 w-80 rounded-xl bg-white/10" />
      <div className="mb-3 h-10 w-full rounded-xl bg-white/10" />
      <div className="space-y-2">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-10 rounded-lg bg-white/5" />
        ))}
      </div>
    </div>
  );
}
