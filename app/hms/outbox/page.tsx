// app/hms/outbox/OutboxMonitor.tsx
"use client";

import React, { useEffect, useState, useRef } from "react";

type OutboxRow = {
  id: string;
  event_type: string;
  tenant_id?: string | null;
  aggregate_type?: string | null;
  aggregate_id?: string | null;
  payload?: unknown;
  attempts?: number;
  created_at?: string;
  status?: string;
};

type Filter = {
  status: string;
  tenant: string;
  event_type: string;
  limit: number;
};

export default function OutboxMonitor(): JSX.Element {
  const [rows, setRows] = useState<OutboxRow[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [filter, setFilter] = useState<Filter>({
    status: "unprocessed",
    tenant: "",
    event_type: "",
    limit: 25,
  });
  const [selected, setSelected] = useState<OutboxRow | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    fetchRows();
    // cleanup on unmount
    return () => {
      abortRef.current?.abort();
      abortRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter.status, filter.tenant, filter.event_type, filter.limit]);

  async function fetchRows() {
    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;

    setLoading(true);
    try {
      const q = new URLSearchParams();
      if (filter.status) q.set("status", filter.status);
      if (filter.tenant) q.set("tenant", filter.tenant);
      if (filter.event_type) q.set("event_type", filter.event_type);
      q.set("limit", String(filter.limit || 25));

      const res = await fetch("/api/admin/outbox?" + q.toString(), {
        signal: ac.signal,
      });

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        console.error("Failed fetch /api/admin/outbox", res.status, text);
        setRows([]);
        return;
      }

      const data = await res.json().catch(() => null);
      if (data && Array.isArray(data.rows)) {
        setRows(data.rows as OutboxRow[]);
      } else if (Array.isArray(data)) {
        // some endpoints return array directly
        setRows(data as OutboxRow[]);
      } else {
        setRows([]);
      }
    } catch (err: any) {
      if (err.name === "AbortError") {
        // aborted — ignore
      } else {
        console.error("Error fetching outbox rows:", err);
      }
      setRows([]);
    } finally {
      setLoading(false);
    }
  }

  async function claimAndEnqueue(id: string) {
    try {
      const res = await fetch(`/api/admin/outbox/${encodeURIComponent(id)}/enqueue`, {
        method: "POST",
      });
      if (!res.ok) {
        console.error("Requeue failed", res.status);
      }
      await fetchRows();
    } catch (e) {
      console.error(e);
    }
  }

  async function markProcessedUi(id: string) {
    try {
      const res = await fetch(`/api/admin/outbox/${encodeURIComponent(id)}/mark_processed`, {
        method: "POST",
      });
      if (!res.ok) console.error("Mark processed failed", res.status);
      await fetchRows();
      // if selected was the same id, update selection (refresh)
      if (selected?.id === id) {
        const updated = rows.find((r) => r.id === id) ?? null;
        setSelected(updated);
      }
    } catch (e) {
      console.error(e);
    }
  }

  return (
    <div className="p-6 min-h-screen bg-gradient-to-b from-white/60 to-slate-50 backdrop-blur-sm">
      <div className="max-w-6xl mx-auto">
        <header className="mb-6">
          <h1 className="text-3xl font-semibold">Outbox Monitor</h1>
          <p className="text-sm text-slate-500">Transactional outbox — monitor, requeue, and inspect events</p>
        </header>

        <section className="mb-4 flex gap-3 items-center">
          <select
            className="p-2 rounded-2xl shadow-sm"
            value={filter.status}
            onChange={(e) => setFilter({ ...filter, status: e.target.value })}
          >
            <option value="unprocessed">Unprocessed</option>
            <option value="all">All</option>
            <option value="processed">Processed</option>
            <option value="failed">Failed</option>
          </select>

          <input
            placeholder="tenant id"
            className="p-2 rounded-2xl shadow-sm"
            value={filter.tenant}
            onChange={(e) => setFilter({ ...filter, tenant: e.target.value })}
          />

          <input
            placeholder="event type"
            className="p-2 rounded-2xl shadow-sm"
            value={filter.event_type}
            onChange={(e) => setFilter({ ...filter, event_type: e.target.value })}
          />

          <input
            type="number"
            min={1}
            className="w-20 p-2 rounded-2xl shadow-sm"
            value={filter.limit}
            onChange={(e) => setFilter({ ...filter, limit: Number(e.target.value || 25) })}
          />

          <button className="ml-auto px-4 py-2 rounded-2xl bg-slate-900 text-white" onClick={fetchRows}>
            Refresh
          </button>
        </section>

        <div className="grid grid-cols-3 gap-4">
          <div className="col-span-2">
            <div className="space-y-3">
              {loading ? <div className="p-6 bg-white/60 rounded-2xl">Loading...</div> : null}

              {rows.map((r) => (
                <div key={r.id} className="p-4 bg-white/60 rounded-2xl shadow-sm flex justify-between items-start">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-slate-600">
                      {r.event_type} • {r.tenant_id ?? "—"}
                    </div>

                    <div className="mt-1 font-medium truncate">
                      {/* safe access: aggregate_type may be undefined or null */}
                      {(r.aggregate_type ?? "unknown").toString()} • {r.aggregate_id ?? "—"}
                    </div>

                    <pre className="mt-2 text-xs max-w-prose overflow-x-auto bg-slate-50 p-2 rounded">
                      {JSON.stringify(r.payload ?? {}, null, 2)}
                    </pre>

                    <div className="mt-2 text-xs text-slate-500">
                      Attempts: {r.attempts ?? 0} • Created:{" "}
                      {r.created_at ? new Date(r.created_at).toLocaleString() : "—"}
                    </div>
                  </div>

                  <div className="flex flex-col gap-2 ml-4">
                    <button onClick={() => setSelected(r)} className="px-3 py-1 rounded-2xl border">
                      Inspect
                    </button>
                    <button onClick={() => claimAndEnqueue(r.id)} className="px-3 py-1 rounded-2xl bg-emerald-600 text-white">
                      Requeue
                    </button>
                    <button onClick={() => markProcessedUi(r.id)} className="px-3 py-1 rounded-2xl bg-slate-700 text-white">
                      Mark done
                    </button>
                  </div>
                </div>
              ))}

              {rows.length === 0 && !loading ? <div className="p-6 bg-white/60 rounded-2xl">No rows</div> : null}
            </div>
          </div>

          <aside className="p-4 bg-white/60 rounded-2xl shadow-sm">
            <h3 className="text-lg font-medium">Selected</h3>

            {!selected ? (
              <div className="mt-4 text-sm text-slate-500">Select a row to inspect payload & actions</div>
            ) : (
              <div className="mt-3 text-sm">
                <div className="text-xs text-slate-500">ID</div>
                <div className="break-words font-mono text-sm bg-slate-50 p-2 rounded mt-1">{selected.id}</div>

                <div className="mt-3 text-xs text-slate-500">Payload</div>
                <pre className="mt-1 text-xs bg-slate-50 p-2 rounded max-h-64 overflow-auto">
                  {JSON.stringify(selected.payload ?? {}, null, 2)}
                </pre>

                <div className="mt-3 flex gap-2">
                  <button
                    className="px-3 py-1 rounded-2xl bg-emerald-600 text-white"
                    onClick={() => claimAndEnqueue(selected.id)}
                  >
                    Requeue
                  </button>
                  <button
                    className="px-3 py-1 rounded-2xl bg-slate-700 text-white"
                    onClick={() => markProcessedUi(selected.id)}
                  >
                    Mark done
                  </button>
                </div>
              </div>
            )}
          </aside>
        </div>
      </div>
    </div>
  );
}
