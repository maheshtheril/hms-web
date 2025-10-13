// path: app/dashboard/rbac/users/page.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePaginatedList } from "@/lib/usePaginatedList";
import { apiClient } from "@/lib/api-client";
import { User } from "@/lib/types";

/** Utility: debounce hook */
function useDebounced<T>(value: T, delay = 350) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return v;
}

/** CSV export (current page) */
function exportCsv(rows: User[]) {
  const header = ["Name", "Email", "Roles", "Flags", "Status"].join(",");
  const lines = rows.map((u) => {
    const roles = (u.roles || []).join("|");
    const flags = [
      u.is_platform_admin ? "platform_admin" : "",
      u.is_tenant_admin ? "tenant_admin" : "",
      u.is_admin ? "admin" : "",
    ]
      .filter(Boolean)
      .join("|");
    const status = u.active ? "Active" : "Disabled";
    const cells = [u.name || "", u.email || "", roles, flags, status];
    // quote cells with commas/quotes
    return cells
      .map((c) =>
        /[",\n]/.test(c) ? `"${String(c).replace(/"/g, '""')}"` : String(c)
      )
      .join(",");
  });
  const csv = [header, ...lines].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `users_${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/** Pill/badge helpers */
const Badge = ({ children }: { children: React.ReactNode }) => (
  <span className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[11px]">
    {children}
  </span>
);
const Chip = ({ children }: { children: React.ReactNode }) => (
  <span className="inline-flex items-center rounded-md border border-white/10 bg-white/5 px-1.5 py-0.5 text-[11px]">
    {children}
  </span>
);

/** Row action button */
function Kebab({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-white/10 hover:bg-white/10"
      aria-label="More actions"
      type="button"
    >
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden>
        <circle cx="5" cy="12" r="2"></circle>
        <circle cx="12" cy="12" r="2"></circle>
        <circle cx="19" cy="12" r="2"></circle>
      </svg>
    </button>
  );
}

export default function UsersPage() {
  // table state
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounced(search, 400);

  const [role, setRole] = useState(""); // single role for now (backend expects 'role')
  const [onlyActive, setOnlyActive] = useState(false);

  const [sortBy, setSortBy] = useState<"name" | "email" | "status">("name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);

  // fetch
  const { data, isLoading, mutate } = usePaginatedList<User>(
    "users",
    "/api/admin/users",
    {
      page,
      pageSize,
      search: debouncedSearch,
      role,
      active: onlyActive ? "true" : "",
      sort: sortBy,
      dir: sortDir,
    }
  );

  // normalize payload
  const items: User[] = useMemo(
    () => (Array.isArray(data) ? (data as User[]) : (data as any)?.items ?? []),
    [data]
  );
  const total: number = useMemo(
    () => (Array.isArray(data) ? items.length : (data as any)?.meta?.total ?? 0),
    [data, items]
  );
  const totalPages = Math.max(1, Math.ceil((total || 0) / pageSize));

  // selection helpers
  const allSelected = items.length > 0 && selectedIds.length === items.length;
  const someSelected = selectedIds.length > 0 && selectedIds.length < items.length;
  const toggleSelectAll = () => {
    setSelectedIds((ids) => (ids.length === items.length ? [] : items.map((x) => x.id)));
  };
  const toggleRow = (id: string) =>
    setSelectedIds((ids) => (ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]));

  // close row menu on outside click
  useEffect(() => {
    const close = (e: MouseEvent) => {
      const t = e.target as HTMLElement;
      if (!t.closest?.("[data-row-menu]")) setMenuOpenId(null);
    };
    window.addEventListener("click", close);
    return () => window.removeEventListener("click", close);
  }, []);

  // actions
  const refresh = () => mutate();

  async function patchUser(id: string, body: any) {
    await apiClient.patch(`/api/admin/users/${id}`, body);
  }

  async function bulkPatch(ids: string[], body: any) {
    // if you have a bulk endpoint, use that; else fire in parallel
    await Promise.all(ids.map((id) => apiClient.patch(`/api/admin/users/${id}`, body)));
  }

  async function onToggleActive(u: User) {
    try {
      await patchUser(u.id, { active: !u.active });
    } finally {
      refresh();
    }
  }

  async function onMakeTenantAdmin(u: User, make = true) {
    try {
      await patchUser(u.id, { is_tenant_admin: make });
    } finally {
      refresh();
    }
  }

  async function onResendInvite(u: User) {
    try {
      await apiClient.post(`/api/admin/users/${u.id}/resend-invite`, {});
    } finally {
      // no data change, but nice to revalidate in case
      refresh();
    }
  }

  async function onBulkEnable() {
    if (selectedIds.length === 0) return;
    await bulkPatch(selectedIds, { active: true });
    setSelectedIds([]);
    refresh();
  }
  async function onBulkDisable() {
    if (selectedIds.length === 0) return;
    await bulkPatch(selectedIds, { active: false });
    setSelectedIds([]);
    refresh();
  }
  async function onBulkMakeTenantAdmin() {
    if (selectedIds.length === 0) return;
    await bulkPatch(selectedIds, { is_tenant_admin: true });
    setSelectedIds([]);
    refresh();
  }
  async function onBulkRemoveTenantAdmin() {
    if (selectedIds.length === 0) return;
    await bulkPatch(selectedIds, { is_tenant_admin: false });
    setSelectedIds([]);
    refresh();
  }

  function toggleSort(col: typeof sortBy) {
    if (sortBy === col) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortBy(col);
      setSortDir("asc");
    }
    setPage(1);
  }

  return (
    <div className="space-y-4">
      {/* toolbar */}
      <div className="flex items-center gap-2">
        <h1 className="text-xl font-semibold">Users</h1>
        <div className="ml-auto flex items-center gap-2">
          <button
            className="inline-flex items-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-sm hover:bg-white/10"
            onClick={() => exportCsv(items)}
            type="button"
          >
            Export CSV
          </button>
          <Link
            href="/dashboard/rbac/users/new"
            className="inline-flex items-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-sm hover:bg-white/10"
          >
            + Invite / Create User
          </Link>
        </div>
      </div>

      {/* filters */}
      <div className="flex flex-wrap items-center gap-2">
        <input
          className="bg-transparent border border-white/10 rounded-lg px-3 py-2 text-sm flex-1 min-w-[220px]"
          placeholder="Search name, email, role…"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
        />
        <select
          className="bg-transparent border border-white/10 rounded-lg px-3 py-2 text-sm"
          value={role}
          onChange={(e) => {
            setRole(e.target.value);
            setPage(1);
          }}
          title="Filter by role"
        >
          <option value="">All roles</option>
          <option value="admin">admin</option>
          <option value="tenant_admin">tenant_admin</option>
          <option value="platform_admin">platform_admin</option>
        </select>
        <select
          className="bg-transparent border border-white/10 rounded-lg px-3 py-2 text-sm"
          value={onlyActive ? "active" : "all"}
          onChange={(e) => {
            setOnlyActive(e.target.value === "active");
            setPage(1);
          }}
          title="Status"
        >
          <option value="all">All statuses</option>
          <option value="active">Active only</option>
        </select>

        {/* sort */}
        <div className="ml-auto flex items-center gap-2">
          <label className="text-sm text-white/60">Sort:</label>
          <select
            className="bg-transparent border border-white/10 rounded-lg px-3 py-2 text-sm"
            value={`${sortBy}:${sortDir}`}
            onChange={(e) => {
              const [by, dir] = e.target.value.split(":") as [typeof sortBy, typeof sortDir];
              setSortBy(by);
              setSortDir(dir);
              setPage(1);
            }}
          >
            <option value="name:asc">Name ↑</option>
            <option value="name:desc">Name ↓</option>
            <option value="email:asc">Email ↑</option>
            <option value="email:desc">Email ↓</option>
            <option value="status:asc">Status (Disabled→Active)</option>
            <option value="status:desc">Status (Active→Disabled)</option>
          </select>
        </div>
      </div>

      {/* bulk actions */}
      {selectedIds.length > 0 && (
        <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm">
          <div className="text-white/80">{selectedIds.length} selected</div>
          <div className="h-4 w-px bg-white/10 mx-1" />
          <button onClick={onBulkEnable} className="rounded border border-white/10 px-2 py-1 hover:bg-white/10">Enable</button>
          <button onClick={onBulkDisable} className="rounded border border-white/10 px-2 py-1 hover:bg-white/10">Disable</button>
          <button onClick={onBulkMakeTenantAdmin} className="rounded border border-white/10 px-2 py-1 hover:bg-white/10">Make Tenant Admin</button>
          <button onClick={onBulkRemoveTenantAdmin} className="rounded border border-white/10 px-2 py-1 hover:bg-white/10">Remove Tenant Admin</button>
          <button onClick={() => setSelectedIds([])} className="ml-auto rounded border border-white/10 px-2 py-1 hover:bg-white/10">Clear</button>
        </div>
      )}

      {/* table */}
      <div className="rounded-xl border border-white/10 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-white/5 sticky top-0 z-10">
            <tr>
              <th className="px-3 py-2 w-10">
                <label className="inline-flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    ref={(el) => {
                      if (el) el.indeterminate = someSelected;
                    }}
                    onChange={toggleSelectAll}
                  />
                </label>
              </th>
              <th className="text-left px-3 py-2">
                <button
                  className="inline-flex items-center gap-1 hover:underline"
                  onClick={() => toggleSort("name")}
                  title="Sort by name"
                >
                  Name
                  {sortBy === "name" && <span className="text-[10px] text-white/50">{sortDir === "asc" ? "↑" : "↓"}</span>}
                </button>
              </th>
              <th className="text-left px-3 py-2">
                <button
                  className="inline-flex items-center gap-1 hover:underline"
                  onClick={() => toggleSort("email")}
                  title="Sort by email"
                >
                  Email
                  {sortBy === "email" && <span className="text-[10px] text-white/50">{sortDir === "asc" ? "↑" : "↓"}</span>}
                </button>
              </th>
              <th className="text-left px-3 py-2">Roles</th>
              <th className="text-left px-3 py-2">Flags</th>
              <th className="text-left px-3 py-2">
                <button
                  className="inline-flex items-center gap-1 hover:underline"
                  onClick={() => toggleSort("status")}
                  title="Sort by status"
                >
                  Status
                  {sortBy === "status" && <span className="text-[10px] text-white/50">{sortDir === "asc" ? "↑" : "↓"}</span>}
                </button>
              </th>
              <th className="text-right px-3 py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <>
                {Array.from({ length: 5 }).map((_, i) => (
                  <tr key={`skeleton-${i}`} className="border-t border-white/10">
                    <td className="px-3 py-3"><div className="h-4 w-4 bg-white/10 rounded" /></td>
                    <td className="px-3 py-3"><div className="h-4 w-40 bg-white/10 rounded" /></td>
                    <td className="px-3 py-3"><div className="h-4 w-56 bg-white/10 rounded" /></td>
                    <td className="px-3 py-3"><div className="h-4 w-32 bg-white/10 rounded" /></td>
                    <td className="px-3 py-3"><div className="h-4 w-36 bg-white/10 rounded" /></td>
                    <td className="px-3 py-3"><div className="h-4 w-16 bg-white/10 rounded" /></td>
                    <td className="px-3 py-3 text-right"><div className="h-8 w-8 bg-white/10 rounded-md ml-auto" /></td>
                  </tr>
                ))}
              </>
            )}

            {!isLoading && items.length === 0 && (
              <tr>
                <td colSpan={7} className="px-3 py-10 text-center text-white/60">
                  No users found. Try adjusting filters or{" "}
                  <Link href="/dashboard/rbac/users/new" className="underline">invite a user</Link>.
                </td>
              </tr>
            )}

            {items.map((u) => {
              const flags = [
                u.is_platform_admin ? <Badge key="p">platform_admin</Badge> : null,
                u.is_tenant_admin ? <Badge key="t">tenant_admin</Badge> : null,
                u.is_admin ? <Badge key="a">admin</Badge> : null,
              ].filter(Boolean);

              return (
                <tr key={u.id} className="border-t border-white/10">
                  <td className="px-3 py-2 align-top">
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(u.id)}
                      onChange={() => toggleRow(u.id)}
                      aria-label={`Select ${u.email}`}
                    />
                  </td>
                  <td className="px-3 py-2 align-top">
                    <div className="flex items-center gap-2">
                      <div className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-white/10 bg-white/5">
                        <span className="text-[10px]">{(u.name || u.email || "?").slice(0, 2).toUpperCase()}</span>
                      </div>
                      <div className="min-w-0">
                        <div className="truncate">{u.name || "—"}</div>
                        <div className="text-[11px] text-white/50 truncate">{u.id}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-2 align-top">
                    <div className="flex items-center gap-2">
                      <span className="truncate">{u.email}</span>
                      <button
                        className="text-[11px] rounded border border-white/10 px-1.5 py-0.5 hover:bg-white/10"
                        onClick={() => navigator.clipboard?.writeText?.(u.email)}
                        title="Copy email"
                        type="button"
                      >
                        Copy
                      </button>
                    </div>
                  </td>
                  <td className="px-3 py-2 align-top">
                    <div className="flex flex-wrap gap-1">
                      {(u.roles || []).length === 0 ? <span className="text-white/50">—</span> : (u.roles || []).map((r: any, i: number) => (
                        <Chip key={`${u.id}-role-${i}`}>{String(r)}</Chip>
                      ))}
                    </div>
                  </td>
                  <td className="px-3 py-2 align-top">
                    <div className="flex flex-wrap gap-1">{flags.length ? flags : <span className="text-white/50">—</span>}</div>
                  </td>
                  <td className="px-3 py-2 align-top">
                    <button
                      onClick={() => onToggleActive(u)}
                      className={`rounded-full px-2 py-0.5 text-[12px] border ${
                        u.active
                          ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-300"
                          : "border-rose-500/20 bg-rose-500/10 text-rose-300"
                      }`}
                      type="button"
                    >
                      {u.active ? "Active" : "Disabled"}
                    </button>
                  </td>
                  <td className="px-3 py-2 text-right align-top">
                    <div className="relative inline-block" data-row-menu>
                      <Kebab onClick={() => setMenuOpenId((id) => (id === u.id ? null : u.id))} />
                      {menuOpenId === u.id && (
                        <div className="absolute right-0 mt-2 min-w-48 rounded-lg border border-white/10 bg-black/95 shadow-xl p-1 z-20">
                          <Link
                            href={`/dashboard/rbac/users/${u.id}`}
                            className="block rounded-md px-3 py-2 text-sm hover:bg-white/10"
                            onClick={() => setMenuOpenId(null)}
                          >
                            Edit user
                          </Link>
                          <button
                            className="w-full text-left rounded-md px-3 py-2 text-sm hover:bg-white/10"
                            onClick={async () => {
                              setMenuOpenId(null);
                              await onToggleActive(u);
                            }}
                            type="button"
                          >
                            {u.active ? "Disable" : "Enable"}
                          </button>
                          <button
                            className="w-full text-left rounded-md px-3 py-2 text-sm hover:bg-white/10"
                            onClick={async () => {
                              setMenuOpenId(null);
                              await onMakeTenantAdmin(u, !u.is_tenant_admin);
                            }}
                            type="button"
                          >
                            {u.is_tenant_admin ? "Remove Tenant Admin" : "Make Tenant Admin"}
                          </button>
                          <button
                            className="w-full text-left rounded-md px-3 py-2 text-sm hover:bg-white/10"
                            onClick={async () => {
                              setMenuOpenId(null);
                              await onResendInvite(u);
                              // Optional: toast here
                            }}
                            type="button"
                          >
                            Resend invite
                          </button>
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* pagination */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between text-sm">
        <div>
          Showing page <strong>{page}</strong> of <strong>{totalPages}</strong> · Total <strong>{total}</strong>
        </div>
        <div className="flex items-center gap-2">
          <button
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="rounded-md border border-white/10 px-2 py-1 disabled:opacity-50"
          >
            Prev
          </button>
          <button
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
            className="rounded-md border border-white/10 px-2 py-1 disabled:opacity-50"
          >
            Next
          </button>
          <select
            value={pageSize}
            onChange={(e) => {
              setPageSize(parseInt(e.target.value, 10));
              setPage(1);
            }}
            className="ml-2 bg-transparent border border-white/10 rounded px-2 py-1"
          >
            <option value={10}>10</option>
            <option value={20}>20</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
        </div>
      </div>
    </div>
  );
}
