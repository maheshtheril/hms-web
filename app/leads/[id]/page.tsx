// app/crm/leads/[id]/page.tsx
import { cookies } from "next/headers";
// import { redirect } from "next/navigation";

const ORIGIN = process.env.NEXT_PUBLIC_APP_ORIGIN ?? "http://localhost:3000";
export const dynamic = "force-dynamic"; // always fresh

async function getLead(id: string, sid: string) {
  const r = await fetch(`${ORIGIN}/api/leads/${id}`, {
    headers: { cookie: `ssr_sid=${sid}` },
    cache: "no-store",
  });
  if (r.status === 404) return null;
  if (!r.ok) throw new Error("Failed to load lead");
  return r.json();
}

export default async function LeadDetailPage({ params }: { params: { id: string } }) {
  const cookieStore = await cookies();
  const sid = cookieStore.get("ssr_sid")?.value;
  if (!sid) { /* redirect disabled */ };

  // auth check (optional if /api/leads/:id already enforces auth)
  const meRes = await fetch(`${ORIGIN}/auth/me`, {
    headers: { cookie: `ssr_sid=${sid}` },
    cache: "no-store",
  });
  if (!meRes.ok) { /* redirect disabled */ };
  const { user } = await meRes.json();
  if (!user) { /* redirect disabled */ };

  const lead = await getLead(params.id, sid);
  if (!lead) {
    // Soft "not found" UX, keep it simple
    redirect("/crm/leads");
  }

  return (
    <div className="mx-auto max-w-screen-lg px-3 sm:px-4 lg:px-6 py-6 sm:py-8">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight">
          {lead.name || "Lead"} <span className="opacity-60 text-sm">#{lead.id}</span>
        </h1>
        <a
          href={`/crm/leads?ret=${encodeURIComponent(`/crm/leads/${lead.id}`)}`}
          className="rounded-lg border border-white/10 bg-zinc-900 px-3 py-2 text-sm hover:bg-zinc-800"
        >
          Back to Leads
        </a>
      </div>

      {/* Summary header */}
      <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <div className="text-sm opacity-70">Contact</div>
          <div className="mt-2 text-sm">
            <div><span className="opacity-70">Email:</span> {lead.email || "—"}</div>
            <div><span className="opacity-70">Phone:</span> {lead.phone || "—"}</div>
            <div><span className="opacity-70">Company:</span> {lead.company || "—"}</div>
            <div><span className="opacity-70">Owner:</span> {lead.owner || "—"}</div>
            <div><span className="opacity-70">Status:</span> {lead.status || "New"}</div>
            <div><span className="opacity-70">Created:</span> {lead.created_at ? new Date(lead.created_at).toLocaleString() : "—"}</div>
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <div className="text-sm opacity-70">AI Summary</div>
          <div className="mt-2 text-sm opacity-90">
            {/* Replace with your AI summary field if you have one */}
            {lead.ai_summary || "No AI summary yet."}
          </div>
          <div className="mt-3">
            <form action={`/api/leads/${lead.id}/ai/refresh`} method="post">
              <button className="rounded-lg bg-white text-black px-3 py-2 text-sm font-semibold hover:bg-zinc-100">
                Refresh AI Summary
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* Raw JSON panel for debugging (remove later) */}
      <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-4">
        <div className="text-sm opacity-70">Raw</div>
        <pre className="mt-2 text-xs whitespace-pre-wrap">
{JSON.stringify(lead, null, 2)}
        </pre>
      </div>
    </div>
  );
}
