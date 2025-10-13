"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

// ---------- Types (mirror server types) ----------
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

export type LeadsListResponse =
  | {
      items: Lead[];
      total: number;
      page: number;
      pageSize: number;
    }
  | Lead[];

// ---------- Helpers ----------
const toArray = (data: LeadsListResponse | undefined | null): Lead[] => {
  if (!data) return [];
  if (Array.isArray(data)) return data;
  if (Array.isArray((data as any).items)) return (data as any).items;
  return [];
};

const getTotal = (data: LeadsListResponse | undefined | null): number => {
  if (!data) return 0;
  if (Array.isArray(data)) return data.length;
  return (data as any).total ?? toArray(data).length ?? 0;
};

const getPage = (data: LeadsListResponse | undefined | null): number => {
  if (!data || Array.isArray(data)) return 1;
  return (data as any).page ?? 1;
};

const getPageSize = (data: LeadsListResponse | undefined | null): number => {
  if (!data || Array.isArray(data)) return toArray(data).length || 25;
  return (data as any).pageSize ?? 25;
};

// Build a URL that keeps current filters/sort but replaces/sets one param (e.g., edit=id)
function hrefWithParam(
  pathname: string,
  searchParams: URLSearchParams,
  key: string,
  value: string | null
) {
  const sp = new URLSearchParams(searchParams.toString());
  if (value === null) sp.delete(key);
  else sp.set(key, value);
  return `${pathname}?${sp.toString()}`;
}

// ---------- Component ----------
type Props = {
  initial?: LeadsListResponse; // optional SSR seed from page.tsx
};

export default function LeadsTableClient({ initial }: Props) {
  const router = useRouter();
  const pathname = usePathname(); // should be "/leads"
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const [data, setData] = useState<LeadsListResponse | null>(initial ?? null);
  const [loading, setLoading] = useState(!initial);
  const [err, setErr] = useState<string | null>(null);

  const items = useMemo(() => toArray(data), [data]);
  const total = useMemo(() => getTotal(data), [data]);
  const page = useMemo(() => getPage(data), [data]);
  const pageSize = useMemo(() => getPageSize(data), [data]);

  // Client fetch on mount / when URL params change (filters, pagination)
  useEffect(() => {
    let cancelled = false;
    async function run() {
      if (initial) {
        // If SSR gave us data for the current params, avoid immediate refetch on first paint
        // but refetch when URL changes away from the SSR'd params.
        setLoading(false);
      } else {
        setLoading(true);
        setErr(null);
        try {
          const qs = searchParams?.toString() ?? "";
          const r = await fetch(`/api/leads${qs ? `?${qs}` : ""}`, { cache: "no-store" });
          if (!r.ok) throw new Error(`HTTP ${r.status}`);
          const json = (await r.json()) as LeadsListResponse;
          if (!cancelled) setData(json);
        } catch (e: any) {
          if (!cancelled) setErr(e?.message || "Failed to load leads");
        } finally {
          if (!cancelled) setLoading(false);
        }
      }
    }
    run();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]); // refetch on URL changes

  // Force refresh (eg after delete)
  const refresh = () => {
    startTransition(() => {
      router.refresh();
    });
  };

  // Delete lead (optimistic update)
  async function onDelete(id: string) {
    const ok = confirm("Delete this lead? This action cannot be undone.");
    if (!ok) return;
    const previous = items;
    try {
      // Optimistic
      setData((curr) => {
        const arr = toArray(curr).filter((l) => l.id !== id);
        if (!curr) return arr;
        if (Array.isArray(curr)) return arr;
        return { ...curr, items: arr, total: Math.max(0, (curr.total ?? arr.length) - 1) };
      });

      const r = await fetch(`/api/leads/${id}`, { method: "DELETE" });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      refresh();
    } catch (e: any) {
      alert(`Delete failed: ${e?.message || "Unknown error"}`);
      // Revert
      setData(previous as any);
    }
  }

  // Build Edit href keeping current filters/pagination
  const editHref = (id: string) =>
    hrefWithParam(pathname, new URLSearchParams(searchParams?.toString()), "edit", id);

  // Build New href (used by optional "Add" shortcut in header toolbars)
  const newHref = hrefWithParam(pathname, new URLSearchParams(searchParams?.toString()), "new", "1");

  return (
    <div className="w-full">
      {/* Toolbar (optional) */}
      <div className="flex items-center justify-between gap-3 p-4 border-b border-white/10">
        <div className="text-sm text-white/70">
          {loading ? "Loading…" : `${total} result${total === 1 ? "" : "s"}`}
          {isPending && <span className="ml-2 opacity-70">(updating)</span>}
        </div>
        <div className="flex items-center gap-2">
          <a
            href={newHref}
            className="inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-semibold bg-white text-black hover:bg-zinc-100 active:scale-[.98] transition"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden className="opacity-80">
              <path fill="currentColor" d="M11 11V5h2v6h6v2h-6v6h-2v-6H5v-2z" />
            </svg>
            Add
          </a>
          <button
            onClick={refresh}
            className="inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium bg-zinc-900 text-white border border-white/10 hover:bg-zinc-800"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden className="opacity-80">
              <path
                fill="currentColor"
                d="M12 6V3L8 7l4 4V8c2.757 0 5 2.243 5 5a5 5 0 1 1-9.9-1h-2.05A7 7 0 1 0 12 6z"
              />
            </svg>
            Refresh
          </button>
        </div>
      </div>

      {err && (
        <div className="px-4 py-3 text-amber-200 bg-amber-500/10 border-t border-amber-400/20">
          {err}
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-white/5 border-b border-white/10">
            <tr className="text-left text-white/70">
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Company</th>
              <th className="px-4 py-3 font-medium">Email</th>
              <th className="px-4 py-3 font-medium">Phone</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Score</th>
              <th className="px-4 py-3 font-medium">Owner</th>
              <th className="px-4 py-3 font-medium text-right">Actions</th>
            </tr>
          </thead>

          <tbody>
            {loading && !items.length ? (
              Array.from({ length: 8 }).map((_, i) => (
                <tr key={i} className="border-b border-white/5 animate-pulse">
                  <td className="px-4 py-3">
                    <div className="h-4 w-40 rounded bg-white/10" />
                  </td>
                  <td className="px-4 py-3">
                    <div className="h-4 w-28 rounded bg-white/10" />
                  </td>
                  <td className="px-4 py-3">
                    <div className="h-4 w-44 rounded bg-white/10" />
                  </td>
                  <td className="px-4 py-3">
                    <div className="h-4 w-28 rounded bg-white/10" />
                  </td>
                  <td className="px-4 py-3">
                    <div className="h-4 w-20 rounded bg-white/10" />
                  </td>
                  <td className="px-4 py-3">
                    <div className="h-4 w-14 rounded bg-white/10" />
                  </td>
                  <td className="px-4 py-3">
                    <div className="h-4 w-32 rounded bg-white/10" />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="h-8 w-28 rounded bg-white/10 inline-block" />
                  </td>
                </tr>
              ))
            ) : items.length ? (
              items.map((lead) => (
                <tr key={lead.id} className="border-b border-white/5 hover:bg-white/[0.03]">
                  <td className="px-4 py-3 font-medium text-white">{lead.name}</td>
                  <td className="px-4 py-3 text-white/80">{lead.company || "—"}</td>
                  <td className="px-4 py-3 text-white/80">{lead.email || "—"}</td>
                  <td className="px-4 py-3 text-white/80">{lead.phone || "—"}</td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-white/10">
                      {lead.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">{lead.score ?? "—"}</td>
                  <td className="px-4 py-3 text-white/80">{lead.owner_name || "—"}</td>

                  {/* Actions */}
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      {/* Edit (opens drawer via ?edit=<id>) */}
                      <a
                        href={editHref(lead.id)}
                        className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold bg-zinc-800 text-white hover:bg-zinc-700"
                        title="Edit"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden>
                          <path
                            fill="currentColor"
                            d="M3 17.25V21h3.75l11.06-11.06-3.75-3.75L3 17.25zm14.81-10.06c.39-.39.39-1.02 0-1.41l-2.59-2.59a.9959.9959 0 10-1.41 1.41l2.59 2.59c.39.39 1.02.39 1.41 0z"
                          />
                        </svg>
                        Edit
                      </a>

                      {/* Delete */}
                      <button
                        onClick={() => onDelete(lead.id)}
                        className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold bg-red-600/90 text-white hover:bg-red-600"
                        title="Delete"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden>
                          <path
                            fill="currentColor"
                            d="M6 7h12v2H6V7zm2 3h2v8H8v-8zm6 0h2v8h-2v-8zM9 4h6l1 1h4v2H4V5h4l1-1z"
                          />
                        </svg>
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td className="px-4 py-10 text-center text-white/60" colSpan={8}>
                  No leads found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination footer (simple) */}
      <div className="flex items-center justify-between gap-3 p-4 border-t border-white/10 text-sm">
        <div className="text-white/60">
          Page <span className="text-white">{page}</span> ·{" "}
          <span className="text-white">{pageSize}</span> per page
        </div>
        <div className="flex items-center gap-2">
          <PageButton
            disabled={page <= 1}
            onClick={() => pushWithParam(router, pathname, searchParams, "page", String(page - 1))}
          >
            Prev
          </PageButton>
          <PageButton
            disabled={items.length < pageSize}
            onClick={() => pushWithParam(router, pathname, searchParams, "page", String(page + 1))}
          >
            Next
          </PageButton>
        </div>
      </div>
    </div>
  );
}

// ---------- Small UI bits ----------
function PageButton({
  disabled,
  onClick,
  children,
}: {
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      disabled={disabled}
      onClick={onClick}
      className={`inline-flex items-center rounded-lg px-3 py-1.5 border text-xs font-medium ${
        disabled
          ? "opacity-50 cursor-not-allowed border-white/10 text-white/60"
          : "border-white/10 text-white hover:bg-white/5"
      }`}
    >
      {children}
    </button>
  );
}

function pushWithParam(
  router: ReturnType<typeof useRouter>,
  pathname: string,
  searchParams: ReturnType<typeof useSearchParams>,
  key: string,
  value: string | null
) {
  const href = hrefWithParam(pathname, new URLSearchParams(searchParams?.toString()), key, value);
  router.push(href);
}
