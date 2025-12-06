// app/crm/leads/[id]/edit/page.tsx
import "server-only";
import { cookies, headers } from "next/headers";
import { notFound } from "next/navigation";
import Link from "next/link";
//import TopNav from "@/app/components/TopNav";
import EditLeadFormClient from "./EditLeadFormClient";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const revalidate = 0;

type Lead = {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  company_id?: string | null;
  status?: string | null;
  estimated_value?: number | null;
  probability?: number | null;
  follow_up_date?: string | null;
  meta?: Record<string, any> | null;
};

type ResolvedSearch = Record<string, string | string[] | undefined>;
type PageProps = {
  params: Promise<{ id: string }>;
  searchParams?: Promise<ResolvedSearch>;
};

async function abs(url: string) {
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? (host?.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}${url}`;
}

async function getJSON(url: string, cookieHeader: string, init?: RequestInit) {
  const full = await abs(url);
  const r = await fetch(full, {
    headers: { cookie: cookieHeader, ...(init?.headers || {}) },
    cache: "no-store",
    ...init,
  });
  const text = await r.text();
  let data: any = null;
  try { data = text ? JSON.parse(text) : null; } catch {}
  return { ok: r.ok, status: r.status, data, text };
}

async function buildAuthCookieHeader() {
  const h = await headers();
  const fromHeaders = h.get("cookie") ?? "";
  const map = new Map<string, string>();

  fromHeaders.split(";").forEach((pair) => {
    const [k, ...v] = pair.split("=");
    const key = k?.trim();
    if (!key) return;
    map.set(key, v.join("=").trim());
  });

  const c = await cookies();
  const sid = c.get("sid")?.value;
  const ssr = c.get("ssr_sid")?.value;
  if (sid) map.set("sid", sid);
  if (ssr) map.set("ssr_sid", ssr);

  return Array.from(map.entries())
    .filter(([k, v]) => k && v)
    .map(([k, v]) => `${k}=${v}`)
    .join("; ");
}

// strict YYYY-MM-DD or ""
function toYMD(value?: string | null): string {
  if (!value) return "";
  const s = String(value);
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${m[1]}-${m[2]}-${m[3]}` : "";
}

export default async function LeadEdit({ params, searchParams }: PageProps) {
  const { id } = await params;
  const _sp = (await searchParams) ?? {};

  const cookieHeader = await buildAuthCookieHeader();
  if (!cookieHeader) { /* redirect disabled */ };

  const me = await getJSON("/auth/me", cookieHeader);
  if (!me.ok || !me.data?.user) { /* redirect disabled */ };

  const res = await getJSON(`/api/leads/${encodeURIComponent(id)}`, cookieHeader);
  if (!res.ok) {
    if (res.status === 404) notFound();
    throw new Error(`Failed to load lead ${id} (HTTP ${res.status})`);
  }

  const lead: Lead | null =
    (res.data?.lead as Lead) ??
    (Array.isArray(res.data) ? (res.data.find((x: any) => x?.id === id) as Lead) : (res.data as Lead)) ??
    null;

  if (!lead) notFound();

  const follow = toYMD(lead.follow_up_date ?? (lead.meta as any)?.follow_up_date ?? "");

  return (
    <div className="min-h-dvh bg-gradient-to-b from-zinc-950 via-zinc-900 to-black text-zinc-100">
      {/* <TopNav /> */}
      <main className="mx-auto w-full max-w-screen-lg px-3 sm:px-4 lg:px-6 py-6 sm:py-8">
        <div className="mb-4 flex items-center justify-between">
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Edit Lead</h1>
          <div className="flex gap-2">
            <Link
              href={`/crm/leads/${encodeURIComponent(id)}`}
              className="rounded-lg border border-white/10 px-3 py-2 text-sm hover:bg-white/10"
            >
              View
            </Link>
            <Link
              href={`/crm/leads`}
              className="rounded-lg bg-white text-black px-3 py-2 text-sm font-semibold hover:bg-zinc-100"
            >
              Back to Leads
            </Link>
          </div>
        </div>

        <EditLeadFormClient
          lead={{
            id: lead.id,
            name: lead.name,
            email: lead.email ?? "",
            phone: lead.phone ?? "",
            status: lead.status ?? "",
            estimated_value: lead.estimated_value ?? null,
            probability: lead.probability ?? null,
            follow_up_date: follow,         // normalized for <input type="date">
            meta: lead.meta ?? null,        // pass through for merging
          }}
        />
      </main>
    </div>
  );
}
