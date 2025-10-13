// path: web/app/dashboard/rbac/users/[id]/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { apiClient } from "@/lib/api-client";

// ---------- helpers ----------
function safePath(raw: string): string {
  const base = (apiClient.defaults.baseURL || "").replace(/\/+$/, "");
  let path = (raw || "").trim();
  if (/^https?:\/\//i.test(path)) return path; // absolute
  if (!path.startsWith("/")) path = "/" + path;
  if (base.endsWith("/api") && path.startsWith("/api/")) path = path.slice(4);
  return path.replace(/\/{2,}/g, "/");
}

type ProbeResult<T = any> =
  | { kind: "ok"; url: string; data: T }
  | { kind: "notfound"; url: string }
  | { kind: "blocked"; url: string; status: number; data?: any }
  | { kind: "error"; url: string; status?: number; message: string; data?: any };

async function tryGetFirstOk<T = any>(candidates: string[]): Promise<ProbeResult<T>> {
  let lastUrl = "";
  for (const raw of candidates) {
    const url = safePath(raw);
    lastUrl = url;
    try {
      const r = await apiClient.get<T>(url);
      return { kind: "ok", url, data: r.data };
    } catch (e: any) {
      const status = e?.response?.status;
      const data = e?.response?.data;
      const msg = e?.message || "Request failed";
      if (status === 401 || status === 403 || status === 405) return { kind: "blocked", url, status, data };
      if (status === 404 || data?.error === "not_found") continue;
      return { kind: "error", url, status, message: msg, data };
    }
  }
  return { kind: "notfound", url: lastUrl };
}

type ListShape<T> = { items?: T[] } | T[];
function extractItems<T>(data: any): T[] {
  if (!data) return [];
  if (Array.isArray(data)) return data;
  if (Array.isArray(data.items)) return data.items;
  return [];
}
function matchById<T extends Record<string, any>>(rows: T[], id: string): T | undefined {
  const keys = ["id", "userId", "uuid", "uid", "pk", "ID"];
  return rows.find((r) => keys.some((k) => String(r?.[k]) === id));
}
async function findUserViaList<T = any>(id: string, tried: string[]) {
  const listCandidates = ["/admin/users", "/rbac/users", "/users", "/accounts", "/members"];
  const paramNames = ["id", "userId", "uuid"];
  for (const base of listCandidates) {
    for (const p of paramNames) {
      const url = `${base}?${p}=${encodeURIComponent(id)}&pageSize=1`;
      tried.push(safePath(url));
      const res = await tryGetFirstOk<ListShape<T>>([url]);
      if (res.kind === "ok") {
        const rows = extractItems<T>(res.data);
        if (rows.length) return rows[0];
      }
      if (res.kind === "blocked" || res.kind === "error") return res;
    }
  }
  for (const base of listCandidates) {
    const url = `${base}?page=1&pageSize=100`;
    tried.push(safePath(url));
    const res = await tryGetFirstOk<ListShape<T>>([url]);
    if (res.kind === "ok") {
      const hit = matchById(extractItems<T>(res.data) as any[], id);
      if (hit) return hit;
    }
    if (res.kind === "blocked" || res.kind === "error") return res;
  }
  return undefined;
}

async function tryPatchFirstOk<T = any>(candidates: string[], body: any): Promise<ProbeResult<T>> {
  let lastUrl = "";
  for (const raw of candidates) {
    const url = safePath(raw);
    lastUrl = url;
    try {
      const r = await apiClient.patch<T>(url, body);
      return { kind: "ok", url, data: r.data };
    } catch (e: any) {
      const status = e?.response?.status;
      const data = e?.response?.data;
      const msg = e?.message || "Request failed";
      if (status === 404 || data?.error === "not_found") continue;
      if (status === 401 || status === 403 || status === 405) return { kind: "blocked", url, status, data };
      return { kind: "error", url, status, message: msg, data };
    }
  }
  return { kind: "notfound", url: lastUrl };
}

// ---------- component ----------
export default function EditUserPage() {
  const params = useParams<{ id: string }>();
  const id = useMemo(() => params?.id, [params]);

  // 1) declare ALL state hooks first (unconditional, stable order)
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [errMsg, setErrMsg] = useState<string | null>(null);
  const [debug, setDebug] = useState<{ userTried: string[] }>({ userTried: [] });
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);

  // form fields (initialized empty, then synced from user)
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [isActive, setIsActive] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  // 2) effects (still unconditional)
  useEffect(() => {
    if (!id) return;
    let cancelled = false;

    setLoading(true);
    setErrMsg(null);

    (async () => {
      const userDetailCandidates = [
        `/admin/users/${id}`,
        `/rbac/users/${id}`,
        `/users/${id}`,
        `/admin/user/${id}`,
        `/rbac/user/${id}`,
        `/user/${id}`,
        `/admin/rbac/users/${id}`,
        `/accounts/${id}`,
        `/members/${id}`,
      ];
      const userTried: string[] = userDetailCandidates.map(safePath);

      let userRes = await tryGetFirstOk<any>(userDetailCandidates);
      if (userRes.kind === "notfound") {
        const viaList = await findUserViaList<any>(id, userTried);
        if (viaList && (viaList as any).kind === undefined) {
          userRes = { kind: "ok", url: "(via list)", data: viaList } as const;
        } else if (viaList && (viaList as any).kind) {
          userRes = viaList as any;
        }
      }

      if (cancelled) return;

      setDebug({ userTried });

      if (userRes.kind !== "ok") {
        const reason =
          userRes.kind === "blocked"
            ? `User endpoint exists but returned ${userRes.status} at ${userRes.url}`
            : userRes.kind === "error"
            ? `User error at ${userRes.url} (${userRes.status ?? "no status"})`
            : `User endpoint not found for all tried variants`;
        setErrMsg(reason);
        setLoading(false);
        return;
      }

      setUser(userRes.data);
      setLoading(false);
    })().catch((e) => {
      if (cancelled) return;
      setLoading(false);
      setErrMsg(e?.message || "Unknown error");
    });

    return () => {
      cancelled = true;
    };
  }, [id]);

  // 3) sync form fields whenever `user` changes
  useEffect(() => {
    if (!user) return;
    setEmail(user.email ?? "");
    setName(user.name ?? "");
    setIsActive(Boolean(user.is_active ?? user.active));
    setIsAdmin(Boolean(user.is_admin ?? user.admin));
  }, [user]);

  // 4) event handlers (no hooks inside)
  async function onSave(updates: Partial<any>) {
    setSaving(true);
    setSaveMsg(null);
    const candidates = [
      `/admin/users/${id}`,
      `/rbac/users/${id}`,
      `/users/${id}`,
      `/admin/user/${id}`,
      `/rbac/user/${id}`,
      `/user/${id}`,
      `/admin/rbac/users/${id}`,
      `/accounts/${id}`,
      `/members/${id}`,
    ];
    const res = await tryPatchFirstOk<any>(candidates, updates);
    if (res.kind === "ok") {
      setUser(res.data);
      setSaveMsg(`Saved via ${res.url}`);
    } else if (res.kind === "blocked") {
      setSaveMsg(`Save blocked (${res.status}) at ${res.url}`);
    } else if (res.kind === "notfound") {
      setSaveMsg("No PATCH endpoint found for user.");
    } else {
      setSaveMsg(`Save failed at ${res.url} (${res.status ?? "no status"}).`);
    }
    setSaving(false);
  }

  // 5) now the early returns (AFTER all hooks)
  if (loading) return <div className="p-4 text-black dark:text-white">Loading…</div>;
  if (errMsg) {
    return (
      <div className="p-4 space-y-3 text-black dark:text-white">
        <div className="text-red-600 dark:text-red-400 font-medium">Failed to load user</div>
        <div className="text-sm">{errMsg}</div>
        <details className="mt-2">
          <summary className="cursor-pointer">Endpoints I tried</summary>
          <pre className="mt-2 p-2 rounded text-xs overflow-auto bg-gray-100 text-black dark:bg-zinc-900 dark:text-white">
{JSON.stringify(debug, null, 2)}
          </pre>
        </details>
      </div>
    );
  }
  if (!user) return <div className="p-4 text-black dark:text-white">User not found.</div>;

  // 6) UI
  return (
    <div className="p-4 space-y-6 text-black dark:text-white">
      <h1 className="text-xl font-semibold">Edit User</h1>

      <div className="grid gap-4 max-w-xl">
        <label className="grid gap-1">
          <span className="text-sm text-gray-700 dark:text-gray-300">Email</span>
          <input
            className="border rounded p-2 bg-white text-black placeholder-gray-400 border-gray-300
                       dark:bg-zinc-900 dark:text-white dark:placeholder-zinc-400 dark:border-zinc-700"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </label>

        <label className="grid gap-1">
          <span className="text-sm text-gray-700 dark:text-gray-300">Name</span>
          <input
            className="border rounded p-2 bg-white text-black placeholder-gray-400 border-gray-300
                       dark:bg-zinc-900 dark:text-white dark:placeholder-zinc-400 dark:border-zinc-700"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </label>

        <label className="inline-flex items-center gap-2">
          <input
            type="checkbox"
            checked={isActive}
            onChange={(e) => setIsActive(e.target.checked)}
          />
          <span>Active</span>
        </label>

        <label className="inline-flex items-center gap-2">
          <input
            type="checkbox"
            checked={isAdmin}
            onChange={(e) => setIsAdmin(e.target.checked)}
          />
          <span>Admin</span>
        </label>

        <button
          className="px-4 py-2 rounded bg-black text-white disabled:opacity-50 dark:bg-white dark:text-black"
          disabled={saving}
          onClick={() =>
            onSave({
              email,
              name,
              is_active: isActive,
              is_admin: isAdmin,
            })
          }
        >
          {saving ? "Saving…" : "Save"}
        </button>

        {saveMsg && <div className="text-sm text-gray-700 dark:text-gray-300">{saveMsg}</div>}
      </div>

      <details className="mt-4">
        <summary className="cursor-pointer">Raw user payload</summary>
        <pre className="mt-2 p-3 rounded overflow-auto bg-gray-100 text-black dark:bg-zinc-900 dark:text-white">
{JSON.stringify(user, null, 2)}
        </pre>
      </details>
    </div>
  );
}
