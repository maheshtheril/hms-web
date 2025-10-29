// web/app/hms/patients/page.tsx
"use client";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { fetchPatients, deletePatient } from "./hooks";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Search, Plus, Loader2, ChevronDown, ChevronUp, Trash2, FileText } from "lucide-react";

/* ------------------------- Neural Glass primitives ------------------------ */
/**
 * These primitives enforce accessible text colors and consistent glass styling.
 * Use them everywhere to keep the Neural Glass language consistent.
 */
function GlassCard({ children, className = "" }: any) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={`relative overflow-hidden rounded-2xl border border-white/12
        bg-white/85 dark:bg-slate-900/60 backdrop-blur-xl shadow-lg p-6 ${className}
        text-slate-900 dark:text-slate-50`}
      style={{ WebkitFontSmoothing: "antialiased" }}
    >
      {/* subtle sheen layer for depth */}
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none rounded-2xl"
        style={{ background: "linear-gradient(180deg, rgba(255,255,255,0.02), rgba(0,0,0,0.02))" }}
      />
      <div className="relative z-10">{children}</div>
    </motion.div>
  );
}

function GlassButton({ children, className = "", ...rest }: any) {
  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.99 }}
      {...rest}
      className={`px-3 py-2 rounded-xl font-medium
        bg-white/90 dark:bg-slate-800/65 border border-white/12
        shadow-sm backdrop-blur-md transition-all ${className}
        text-slate-900 dark:text-slate-50`}
    >
      {children}
    </motion.button>
  );
}

function GlassInput({ className = "", ...rest }: any) {
  return (
    <input
      {...rest}
      className={`w-full px-3 py-2 rounded-xl border border-white/12
        bg-white/95 dark:bg-slate-800/70 backdrop-blur-md
        text-slate-900 dark:text-slate-50 placeholder:text-slate-400 dark:placeholder:text-slate-500
        focus:outline-none focus:ring-2 focus:ring-sky-400/40 transition ${className}`}
      style={{ caretColor: "#0ea5e9" }}
    />
  );
}

/* ------------------------------- Toasts ---------------------------------- */
/* Lightweight toast system tied to this page only (keeps logic local) */
function useToasts() {
  const [toasts, setToasts] = useState<
    { id: string; message: string; undo?: () => void; tone?: "info" | "success" | "error" }[]
  >([]);
  const push = (message: string, opts: any = {}) => {
    const id = String(Date.now()) + Math.random().toString(36).slice(2, 6);
    setToasts((t) => [...t, { id, message, ...opts }]);
    return id;
  };
  const remove = (id: string) => setToasts((t) => t.filter((x) => x.id !== id));
  return { toasts, push, remove, setToasts };
}

function Toasts({ toasts, remove }: { toasts: any[]; remove: (id: string) => void }) {
  return (
    <div className="fixed right-6 bottom-6 z-50 flex flex-col gap-3">
      {toasts.map((t) => (
        <motion.div
          key={t.id}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 12 }}
          className={`min-w-[220px] rounded-lg p-3 shadow-xl border border-white/12 backdrop-blur-md bg-white/95 dark:bg-slate-900/70 flex items-start justify-between gap-3`}
        >
          <div className="text-sm text-slate-800 dark:text-slate-100">{t.message}</div>
          <div className="flex items-center gap-2">
            {t.undo && (
              <button
                onClick={() => {
                  t.undo();
                  remove(t.id);
                }}
                className="text-xs underline px-2 py-1 rounded"
              >
                Undo
              </button>
            )}
            <button onClick={() => remove(t.id)} className="text-xs px-2 py-1 rounded">
              ✕
            </button>
          </div>
        </motion.div>
      ))}
    </div>
  );
}

/* -------------------------- Helper utilities ------------------------------ */
function csvDownload(filename: string, rows: any[]) {
  if (!rows.length) return;
  const keys = Object.keys(rows[0]);
  const lines = [keys.join(",")].concat(
    rows.map((r) =>
      keys
        .map((k) => {
          const v = r[k] ?? "";
          const escaped = String(v).replace(/"/g, '""');
          return `"${escaped}"`;
        })
        .join(",")
    )
  );
  const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/* ------------------------------ Main Page -------------------------------- */
export default function PatientsPageAdvanced() {
  const router = useRouter();
  const searchRef = useRef<HTMLInputElement | null>(null);
  const { toasts, push, remove, setToasts } = useToasts();

  // list state
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [q, setQ] = useState("");
  const qRef = useRef("");
  const [offset, setOffset] = useState(0);
  const [limit] = useState(30);
  const [hasMore, setHasMore] = useState(true);

  // selection & sort
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [selectAll, setSelectAll] = useState(false);
  const [sortBy, setSortBy] = useState<{ col: string; dir: "asc" | "desc" } | null>(null);

  // optimistic deletes stack for undo
  const deleteTimers = useRef<Record<string, number>>({});

  // debounce + abort controller
  const searchTimer = useRef<number | null>(null);
  const controllerRef = useRef<AbortController | null>(null);

  // keyboard shortcuts
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "/" && (document.activeElement as HTMLElement)?.tagName !== "INPUT") {
        e.preventDefault();
        searchRef.current?.focus();
      }
      const isMac = navigator.platform.toUpperCase().includes("MAC");
      if ((isMac ? e.metaKey : e.ctrlKey) && e.key.toLowerCase() === "a") {
        e.preventDefault();
        toggleSelectAll();
      }
      if (e.key === "Delete" && Object.keys(selected).length > 0) {
        e.preventDefault();
        handleBulkDelete();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected, rows, selectAll]);

  useEffect(() => {
    resetAndLoad();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sortBy]);

  async function loadMore(nextOffset = offset) {
    setLoading(true);
    try {
      const args: any = { q: qRef.current, limit, offset: nextOffset };
      if (sortBy) args.sort = `${sortBy.col}:${sortBy.dir}`;
      if (controllerRef.current) controllerRef.current.abort();
      const c = new AbortController();
      controllerRef.current = c;
      const res = await fetchPatients(args);
      if (c.signal.aborted) return;
      const incoming = Array.isArray(res) ? res : res.rows ?? [];
      const incomingHasMore = Array.isArray(res) ? incoming.length === limit : !!res.hasMore;
      setRows((r) => (nextOffset === 0 ? incoming : [...r, ...incoming]));
      setOffset(nextOffset + incoming.length);
      setHasMore(incomingHasMore);
    } catch (err: any) {
      if (err?.name === "AbortError") return;
      console.error("fetchPatients failed", err);
      push("Failed to load patients", { tone: "error" });
    } finally {
      setLoading(false);
    }
  }

  function resetAndLoad() {
    setOffset(0);
    setHasMore(true);
    setRows([]);
    loadMore(0);
  }

  function onChangeQ(v: string) {
    setQ(v);
    qRef.current = v;
    if (searchTimer.current) window.clearTimeout(searchTimer.current);
    searchTimer.current = window.setTimeout(() => {
      setOffset(0);
      resetAndLoad();
    }, 300);
  }

  function toggleSelectAll() {
    if (selectAll) {
      setSelected({});
      setSelectAll(false);
      return;
    }
    const map: Record<string, boolean> = {};
    rows.forEach((r) => (map[r.id] = true));
    setSelected(map);
    setSelectAll(true);
  }

  function toggleSelect(id: string) {
    setSelected((s) => {
      const copy = { ...s };
      if (copy[id]) delete copy[id];
      else copy[id] = true;
      setSelectAll(Object.keys(copy).length === rows.length);
      return copy;
    });
  }

  /* ------------------ Optimistic delete with undo ------------------ */
  async function handleDelete(id: string) {
    if (!confirm("Delete patient? (soft-delete)")) return;
    const removed = rows.find((r) => r.id === id);
    setRows((r) => r.filter((x) => x.id !== id));
    const toastId = push("Patient deleted", {
      tone: "info",
      undo: () => {
        setRows((rs) => (removed ? [removed, ...rs] : rs));
      },
    });

    const timer = window.setTimeout(async () => {
      try {
        await deletePatient(id);
        push("Delete confirmed", { tone: "success" });
      } catch (err) {
        console.error("deletePatient failed", err);
        push("Failed to delete on server", { tone: "error" });
        setRows((rs) => (removed ? [removed, ...rs] : rs));
      } finally {
        remove(toastId);
      }
    }, 5000);
    deleteTimers.current[id] = timer as unknown as number;
  }

  async function handleBulkDelete() {
    const ids = Object.keys(selected);
    if (!ids.length) return;
    if (!confirm(`Delete ${ids.length} selected patients? (soft-delete)`)) return;

    const removedRows = rows.filter((r) => ids.includes(r.id));
    setRows((r) => r.filter((x) => !ids.includes(x.id)));
    setSelected({});
    setSelectAll(false);

    const toastId = push(`${ids.length} patients deleted`, {
      undo: () => {
        setRows((rs) => [...removedRows, ...rs]);
      },
    });

    for (const id of ids) {
      const t = window.setTimeout(async () => {
        try {
          await deletePatient(id);
        } catch (err) {
          console.error("bulk delete failed", err);
          push("Bulk delete failed for some items", { tone: "error" });
          setRows((rs) => [...rs, ...removedRows.filter((r) => r.id === id)]);
        }
      }, 5000);
      deleteTimers.current[id] = t as unknown as number;
    }

    window.setTimeout(() => remove(toastId), 5500);
  }

  function exportSelectedOrAllCSV() {
    const selectedIds = Object.keys(selected);
    const payloadRows = selectedIds.length ? rows.filter((r) => selectedIds.includes(r.id)) : rows;
    csvDownload(`patients-${Date.now()}.csv`, payloadRows);
  }

  function toggleSort(col: string) {
    setSortBy((s) => {
      if (!s || s.col !== col) return { col, dir: "asc" };
      return { col, dir: s.dir === "asc" ? "desc" : "asc" };
    });
  }

  useEffect(() => {
    return () => {
      Object.values(deleteTimers.current).forEach((t) => window.clearTimeout(t));
      if (searchTimer.current) window.clearTimeout(searchTimer.current);
      if (controllerRef.current) controllerRef.current.abort();
    };
  }, []);

  const selectedCount = Object.keys(selected).length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100/50 to-slate-200/30 dark:from-slate-900 dark:to-slate-950 p-8">
      <Toasts toasts={toasts} remove={remove} />

      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-sky-600 to-indigo-500">
            Patients
          </h1>

          <div className="flex items-center gap-2">
            <GlassButton onClick={() => exportSelectedOrAllCSV()} className="flex items-center gap-2">
              <FileText size={16} /> Export
            </GlassButton>
            <Link href="/hms/patients/new">
              <GlassButton className="flex items-center gap-2">
                <Plus size={18} /> New Patient
              </GlassButton>
            </Link>
          </div>
        </div>

        {/* Controls */}
        <GlassCard className="flex items-center gap-3">
          <Search className="text-slate-500" size={18} />
          <GlassInput
            ref={searchRef as any}
            placeholder="Search by name, patient number, phone..."
            value={q}
            onChange={(e) => onChangeQ(e.target.value)}
            aria-label="Search patients"
          />

          <div className="ml-auto flex items-center gap-2">
            <div className="text-sm text-slate-500 mr-2">{rows.length} shown</div>

            <GlassButton onClick={() => toggleSelectAll()} aria-pressed={selectAll}>
              {selectAll ? "Unselect all" : "Select all"}
            </GlassButton>

            <GlassButton
              onClick={() => handleBulkDelete()}
              disabled={!selectedCount}
              className={`${selectedCount ? "text-red-600" : "opacity-50 cursor-not-allowed"}`}
            >
              <Trash2 size={14} /> Delete {selectedCount ? `(${selectedCount})` : ""}
            </GlassButton>
          </div>
        </GlassCard>

        {/* Table */}
        <GlassCard className="overflow-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-slate-600 border-b border-white/20">
                <th className="p-3">
                  <input type="checkbox" checked={selectAll} onChange={() => toggleSelectAll()} aria-label="Select all visible" />
                </th>

                <th className="p-3 cursor-pointer" onClick={() => toggleSort("patient_number")}>
                  <div className="flex items-center gap-2">
                    Patient #
                    {sortBy?.col === "patient_number" ? (sortBy.dir === "asc" ? <ChevronUp size={14} /> : <ChevronDown size={14} />) : null}
                  </div>
                </th>

                <th className="p-3 cursor-pointer" onClick={() => toggleSort("name")}>
                  <div className="flex items-center gap-2">
                    Name
                    {sortBy?.col === "name" ? (sortBy.dir === "asc" ? <ChevronUp size={14} /> : <ChevronDown size={14} />) : null}
                  </div>
                </th>

                <th className="p-3 cursor-pointer" onClick={() => toggleSort("dob")}>
                  <div className="flex items-center gap-2">
                    DOB
                    {sortBy?.col === "dob" ? (sortBy.dir === "asc" ? <ChevronUp size={14} /> : <ChevronDown size={14} />) : null}
                  </div>
                </th>

                <th className="p-3">Gender</th>
                <th className="p-3">Status</th>
                <th className="p-3">Actions</th>
              </tr>
            </thead>

            <tbody>
              {loading && rows.length === 0 ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i}>
                    <td colSpan={7} className="p-4">
                      <div className="animate-pulse h-8 rounded bg-white/10" />
                    </td>
                  </tr>
                ))
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-4 text-center text-slate-500">
                    No patients found
                  </td>
                </tr>
              ) : (
                rows.map((r: any, i: number) => (
                  <tr
                    key={r.id}
                    className={`transition-colors ${i % 2 === 0 ? "bg-white/30 dark:bg-slate-800/30" : "bg-white/10 dark:bg-slate-900/30"} hover:bg-white/60 dark:hover:bg-slate-700/40`}
                  >
                    <td className="p-3">
                      <input type="checkbox" checked={!!selected[r.id]} onChange={() => toggleSelect(r.id)} aria-label={`Select ${r.first_name} ${r.last_name}`} />
                    </td>

                    <td className="p-3 text-slate-800 dark:text-slate-100">{r.patient_number}</td>
                    <td className="p-3 text-slate-800 dark:text-slate-100">{r.first_name} {r.last_name}</td>
                    <td className="p-3 text-slate-700 dark:text-slate-200">{r.dob ? new Date(r.dob).toLocaleDateString() : "-"}</td>
                    <td className="p-3 text-slate-700 dark:text-slate-200">{r.gender || "-"}</td>
                    <td className="p-3 text-slate-700 dark:text-slate-200">{r.status || "-"}</td>

                    <td className="p-3">
                      <div className="flex gap-2">
                        <Link href={`/hms/patients/${r.id}`}>
                          <GlassButton className="text-sm">View</GlassButton>
                        </Link>
                        <Link href={`/hms/patients/${r.id}/edit`}>
                          <GlassButton className="text-sm">Edit</GlassButton>
                        </Link>
                        <GlassButton className="text-sm text-red-600" onClick={() => handleDelete(r.id)}>
                          Delete
                        </GlassButton>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>

          <div className="flex items-center justify-center py-4">
            {hasMore ? (
              <GlassButton onClick={() => loadMore(offset)} disabled={loading}>
                {loading ? <Loader2 className="animate-spin" /> : "Load more"}
              </GlassButton>
            ) : (
              <div className="text-sm text-slate-500">End of list</div>
            )}
          </div>
        </GlassCard>
      </div>
    </div>
  );
}
