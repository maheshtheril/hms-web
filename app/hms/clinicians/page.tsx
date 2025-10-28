"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Plus, User, Loader2, Eye, Mail, Phone, Check, X } from "lucide-react";
import apiClient from "@/lib/api-client";
import Link from "next/link";

function Button({ children, className = "", ...rest }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...rest}
      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-shadow focus:outline-none focus:ring-2 focus:ring-offset-2 ${className}`}
    >
      {children}
    </button>
  );
}

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`p-4 rounded-2xl bg-white/6 border border-white/10 ${className}`}>{children}</div>
  );
}

function CardHeader({ children }: { children: React.ReactNode }) {
  return <div className="mb-2">{children}</div>;
}
function CardContent({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`text-sm ${className}`}>{children}</div>;
}
function CardTitle({ children }: { children: React.ReactNode }) {
  return <h3 className="text-lg font-semibold">{children}</h3>;
}

type Clinician = {
  id: string;
  first_name: string;
  last_name: string;
  email?: string;
  phone?: string;
  role?: string;
  specialization?: string;
  department_name?: string;
  experience_years?: number;
  is_active: boolean;
};

function debounce<T extends (...args: any[]) => void>(fn: T, wait = 250) {
  let t: ReturnType<typeof setTimeout> | null = null;
  return (...args: Parameters<T>) => {
    if (t) clearTimeout(t);
    t = setTimeout(() => fn(...args), wait);
  };
}

export default function CliniciansPage() {
  const [clinicians, setClinicians] = useState<Clinician[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [showActiveOnly, setShowActiveOnly] = useState(false);
  const [page, setPage] = useState(1);
  const perPage = 9;
  const [sortByExpDesc, setSortByExpDesc] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await apiClient.get("/hms/clinicians");
        const data = (res && res.data && res.data.data) || [];
        if (!cancelled) setClinicians(data);
      } catch (err: any) {
        console.error("Failed to load clinicians", err);
        setError(err?.message || "Failed to fetch clinicians");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = useMemo(() => {
    let list = clinicians.slice();
    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter((c) => {
        return (
          c.first_name.toLowerCase().includes(q) ||
          c.last_name.toLowerCase().includes(q) ||
          (c.email ?? "").toLowerCase().includes(q) ||
          (c.phone ?? "").toLowerCase().includes(q) ||
          (c.specialization ?? "").toLowerCase().includes(q) ||
          (c.department_name ?? "").toLowerCase().includes(q)
        );
      });
    }
    if (showActiveOnly) list = list.filter((c) => c.is_active);
    list.sort((a, b) => {
      const ae = a.experience_years || 0;
      const be = b.experience_years || 0;
      return sortByExpDesc ? be - ae : ae - be;
    });
    return list;
  }, [clinicians, query, showActiveOnly, sortByExpDesc]);

  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / perPage));
  const paginated = filtered.slice((page - 1) * perPage, page * perPage);

  useEffect(() => {
    setPage(1);
  }, [query, showActiveOnly, sortByExpDesc]);

  async function copyToClipboard(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      alert("Copied to clipboard");
    } catch (e) {
      console.error("copy failed", e);
    }
  }

  async function toggleActive(id: string) {
    setClinicians((prev) => prev.map((c) => (c.id === id ? { ...c, is_active: !c.is_active } : c)));
    try {
      await apiClient.patch(`/hms/clinicians/${id}`, {});
    } catch (e) {
      console.error("Failed to persist toggle", e);
    }
  }

  const onSearch = debounce((v: string) => setQuery(v), 200);

  return (
    <div className="min-h-screen p-8 rounded-3xl">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-semibold">All Clinicians</h1>
          <p className="text-sm opacity-60 mt-1">Total: {clinicians.length} • Showing: {total}</p>
        </div>

        <div className="flex items-center gap-3">
          <Link href="/hms/clinicians/new">
            <Button className="bg-white/10 hover:bg-white/12 border border-white/10">
              <Plus className="h-4 w-4" /> New Clinician
            </Button>
          </Link>
        </div>
      </div>

      <div className="flex flex-col md:flex-row md:items-center gap-3 mb-6">
        <div className="flex-1">
          <input
            aria-label="Search clinicians"
            onChange={(e) => onSearch(e.target.value)}
            placeholder="Search by name, email, phone, specialization, department..."
            className="w-full rounded-lg px-3 py-2 bg-white/4 border border-white/6 placeholder:text-sm"
          />
        </div>

        <div className="flex gap-2">
          <label className="inline-flex items-center gap-2">
            <input
              type="checkbox"
              checked={showActiveOnly}
              onChange={(e) => setShowActiveOnly(e.target.checked)}
            />
            <span className="text-sm">Active only</span>
          </label>

          <Button onClick={() => setSortByExpDesc((s) => !s)} className="border">
            {sortByExpDesc ? "Sort: Exp ↓" : "Sort: Exp ↑"}
          </Button>

          <Button
            onClick={() => {
              setQuery("");
              (document.querySelector('input[aria-label="Search clinicians"]') as HTMLInputElement | null)?.focus();
            }}
            className="border"
          >
            Reset
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {Array.from({ length: perPage }).map((_, i) => (
            <Card key={i} className="animate-pulse">
              <div className="h-6 w-48 bg-white/6 rounded mb-3" />
              <div className="h-3 bg-white/6 rounded mb-2" />
              <div className="h-3 bg-white/6 rounded w-3/4" />
            </Card>
          ))}
        </div>
      ) : error ? (
        <div className="p-6 rounded-lg bg-red-600/10 border border-red-600/10">
          <p className="text-red-600 font-medium mb-3">Failed to load clinicians — {error}</p>
          <div className="flex gap-2">
            <Button onClick={() => window.location.reload()} className="border">Reload</Button>
            <Button onClick={() => setError(null)} className="border">Dismiss</Button>
          </div>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {paginated.map((c) => (
              <Card key={c.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <User className="h-8 w-8" />
                      <div>
                        <CardTitle>
                          {c.first_name} {c.last_name}
                        </CardTitle>
                        <div className="text-xs opacity-70">{c.department_name || "—"}</div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button onClick={() => toggleActive(c.id)} className="text-sm border px-2">
                        {c.is_active ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
                      </Button>

                      <Link href={`/hms/clinicians/${c.id}`}>
                        <Button className="text-sm border px-2">
                          <Eye className="h-4 w-4" />
                        </Button>
                      </Link>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="space-y-2">
                  {c.specialization && <div className="text-sm">🩺 {c.specialization}</div>}
                  {c.role && <div className="text-sm">👔 {c.role}</div>}

                  <div className="flex items-center gap-2 text-sm opacity-80">
                    {c.email && (
                      <button onClick={() => copyToClipboard(c.email ?? "")} className="inline-flex items-center gap-2">
                        <Mail className="h-4 w-4" />
                        <span className="truncate max-w-40">{c.email}</span>
                      </button>
                    )}

                    {c.phone && (
                      <button onClick={() => copyToClipboard(c.phone ?? "")} className="inline-flex items-center gap-2">
                        <Phone className="h-4 w-4" />
                        <span className="truncate max-w-32">{c.phone}</span>
                      </button>
                    )}
                  </div>

                  <div className="flex items-center justify-between text-xs opacity-70 pt-2">
                    <div>{c.experience_years ? `${c.experience_years} yrs` : "—"}</div>
                    <div className="flex items-center gap-2">
                      <Link href={`/hms/clinicians/${c.id}/edit`}>
                        <Button className="text-xs border px-2">Edit</Button>
                      </Link>
                      <Link href={`/hms/appointments/new?clinician_id=${c.id}`}>
                        <Button className="text-xs border px-2">New Appt</Button>
                      </Link>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="flex items-center justify-between mt-6">
            <div className="text-sm opacity-70">Page {page} of {totalPages}</div>

            <div className="flex items-center gap-2">
              <Button onClick={() => setPage((p) => Math.max(1, p - 1))} className="border" disabled={page === 1}>
                Prev
              </Button>
              <Button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} className="border" disabled={page === totalPages}>
                Next
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}