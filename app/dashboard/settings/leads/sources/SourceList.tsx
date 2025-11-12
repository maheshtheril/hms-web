"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  useInfiniteQuery,
  useMutation,
  useQueryClient,
  type UseInfiniteQueryOptions,
  type InfiniteData,
} from "@tanstack/react-query";
import apiClient from "@/lib/api-client";
import SourceForm from "./SourceForm";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";
import { EllipsisVertical, RefreshCw, X } from "lucide-react";
import { Virtuoso } from "react-virtuoso";

/* -------------------------
 * Types
 * ------------------------ */
export type Source = {
  id: string;
  tenant_id?: string | null;
  key?: string;
  name: string;
  description?: string | null;
  is_active?: boolean;
  created_at?: string;
};

type PagedResp<T> = {
  data: {
    rows: T[];
    total: number;
  };
};

/* -------------------------
 * Config
 * ------------------------ */
const PAGE_SIZE = 30;
const ROW_HEIGHT = 88;
const LIST_HEIGHT = 640;

/* -------------------------
 * Tenant helper
 * ------------------------ */
const getTenantId = (): string => {
  if (typeof window !== "undefined" && (window as any).__TENANT_ID__) return (window as any).__TENANT_ID__;
  if ((apiClient as any)?.defaults?.headers?.["x-tenant-id"]) return (apiClient as any).defaults.headers["x-tenant-id"];
  return "default";
};

const sourcesQueryKey = (tenantId: string, q = "") => ["leads", "sources", tenantId, q] as const;

/* -------------------------
 * API
 * ------------------------ */
const fetchSourcesPage = async ({
  pageParam = 1,
  q = "",
  tenantId,
}: {
  pageParam?: number;
  q?: string;
  tenantId?: string;
}): Promise<PagedResp<Source>> => {
  const res = await apiClient.get(`/leads/sources`, {
    params: { page: pageParam, limit: PAGE_SIZE, q },
    headers: tenantId ? { "x-tenant-id": tenantId } : undefined,
  });

  const payload = res.data ?? {};

  if (payload.data && Array.isArray(payload.data.rows)) {
    return {
      data: {
        rows: payload.data.rows,
        total: Number(payload.data.total ?? payload.data.rows.length),
      },
    };
  }

  if (Array.isArray(payload.data)) {
    return { data: { rows: payload.data, total: payload.data.length } };
  }

  if (Array.isArray(payload.rows)) {
    return { data: { rows: payload.rows, total: Number(payload.total ?? payload.rows.length) } };
  }

  if (Array.isArray(payload)) {
    return { data: { rows: payload, total: payload.length } };
  }

  return { data: { rows: [], total: 0 } };
};

/* -------------------------
 * Fallback Menu (keyboard + ARIA)
 * ------------------------ */
function FallbackMenu({
  onEdit,
  onDelete,
}: {
  onEdit: () => void;
  onDelete: () => void;
}) {
  const [open, setOpen] = useState(false);
  const btnRef = React.useRef<HTMLButtonElement | null>(null);
  const menuRef = React.useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!btnRef.current?.contains(e.target as Node) && !menuRef.current?.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        btnRef.current?.focus();
      }
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        const items = Array.from(menuRef.current?.querySelectorAll('[role="menuitem"]') ?? []) as HTMLElement[];
        if (!items.length) return;
        const active = document.activeElement as HTMLElement | null;
        const idx = active ? items.indexOf(active) : -1;
        const next = e.key === "ArrowDown" ? (idx + 1) % items.length : (idx - 1 + items.length) % items.length;
        items[next]?.focus();
      }
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    const t = setTimeout(() => {
      const first = menuRef.current?.querySelector('[role="menuitem"]') as HTMLElement | null;
      first?.focus();
    }, 0);
    return () => {
      clearTimeout(t);
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className="relative">
      <Button
        ref={btnRef as any}
        size="icon"
        variant="ghost"
        className="hover:bg-white/8"
        aria-label="Actions"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((s) => !s)}
      >
        <EllipsisVertical className="w-5 h-5 text-slate-300" />
      </Button>

      {open && (
        <div
          ref={menuRef}
          role="menu"
          aria-label="Source actions"
          className="absolute right-0 mt-2 w-40 z-50 bg-neutral-900/95 border border-white/10 rounded-xl shadow-lg p-2"
        >
          <button
            role="menuitem"
            tabIndex={0}
            onClick={() => {
              setOpen(false);
              onEdit();
            }}
            className="w-full text-left px-3 py-2 rounded-md hover:bg-white/5"
          >
            ✏️ Edit
          </button>
          <button
            role="menuitem"
            tabIndex={0}
            onClick={() => {
              setOpen(false);
              onDelete();
            }}
            className="w-full text-left px-3 py-2 rounded-md hover:bg-red-600/10 text-rose-400 mt-1"
          >
            🗑 Delete
          </button>
        </div>
      )}
    </div>
  );
}

/* -------------------------
 * Row component (stable, memoized)
 * ------------------------ */
type RowProps = {
  item?: Source | null;
  style: React.CSSProperties;
  onEdit: (item: Source) => void;
  onDelete: (id: string) => void;
};

function RowInnerStatic({ item, style, onEdit, onDelete }: RowProps) {
  if (!item) {
    return (
      <div
        style={style}
        className="p-4 border border-white/8 bg-white/3 rounded-xl animate-pulse"
      >
        <div className="h-4 w-1/3 bg-slate-700 rounded mb-2" />
        <div className="h-3 w-1/2 bg-slate-700 rounded mb-1" />
      </div>
    );
  }

  return (
    <div
      style={style}
      className="p-4 border border-white/10 bg-white/5 rounded-xl flex items-center justify-between gap-4"
      data-source-id={item.id}
    >
      <div className="flex-1">
        <div className="font-medium text-white tracking-tight">{item.name}</div>
        <div className="text-xs text-slate-300">{item.description ?? "—"}</div>
        {item.key && <div className="text-xs text-slate-400 mt-1">Key: {item.key}</div>}
      </div>

      <div className="flex items-center gap-2">
        <span
          className={`text-xs px-2 py-1 rounded-full ${
            item.is_active
              ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/20"
              : "bg-slate-700/50 text-slate-400 border border-slate-600/40"
          }`}
        >
          {item.is_active ? "Active" : "Inactive"}
        </span>

        <FallbackMenu
          onEdit={() => onEdit(item)}
          onDelete={() => onDelete(item.id)}
        />
      </div>
    </div>
  );
}

export const Row = React.memo(RowInnerStatic);

/* -------------------------
 * Component
 * ------------------------ */
export default function SourceList(): JSX.Element {
  const tenantId = getTenantId();

  const [q, setQ] = useState<string>("");
  const [qDebounced, setQDebounced] = useState<string>("");
  const [editing, setEditing] = useState<Source | null>(null);
  const [open, setOpen] = useState<boolean>(false);

  const qc = useQueryClient();
  const { toast } = useToast();

  // debounce timer ref so we can cancel on Reset
  const debounceRef = useRef<number | null>(null);

  // debounce search (250ms)
  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    debounceRef.current = window.setTimeout(() => {
      setQDebounced(q.trim());
      debounceRef.current = null;
    }, 250);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
        debounceRef.current = null;
      }
    };
  }, [q]);

  const infiniteQueryOptions: UseInfiniteQueryOptions<
    PagedResp<Source>,
    Error,
    InfiniteData<PagedResp<Source>>,
    readonly unknown[],
    number
  > = {
    queryKey: sourcesQueryKey(tenantId, qDebounced),
    queryFn: async ({ pageParam = 1 }: { pageParam: number }) =>
      fetchSourcesPage({ pageParam, q: qDebounced, tenantId }),
    getNextPageParam: (lastPage, pages) => {
      const allRows = pages.flatMap((p) => p.data.rows);
      const lastRows = lastPage?.data?.rows ?? [];
      const totalFromServer = lastPage?.data?.total;

      if (typeof totalFromServer === "number") {
        return allRows.length < totalFromServer ? pages.length + 1 : undefined;
      }

      return lastRows.length === PAGE_SIZE ? pages.length + 1 : undefined;
    },
    staleTime: 30_000,
    initialPageParam: 1,
    refetchOnWindowFocus: true,
    refetchInterval: false,
  };

  const {
    data,
    isLoading,
    isError,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    refetch,
    isFetching,
  } = useInfiniteQuery<
    PagedResp<Source>,
    Error,
    InfiniteData<PagedResp<Source>>,
    readonly unknown[],
    number
  >(infiniteQueryOptions);

  const flattened = useMemo<Source[]>(
    () => data?.pages.flatMap((p) => p.data.rows) ?? [],
    [data]
  );

  const total = useMemo(() => {
    const firstTotal = data?.pages?.[0]?.data?.total;
    if (typeof firstTotal === "number") return firstTotal;
    return flattened.length;
  }, [data, flattened]);

  type InfiniteCache = {
    pages: PagedResp<Source>[];
    pageParams: number[];
  };

  const deleteMut = useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/leads/sources/${id}`, { headers: { "x-tenant-id": tenantId } });
    },
    onMutate: async (id: string) => {
      // cancel queries for this tenant (broad) to avoid races
      await qc.cancelQueries({
        predicate: (query) =>
          Array.isArray(query.queryKey) &&
          query.queryKey[0] === "leads" &&
          query.queryKey[1] === "sources" &&
          query.queryKey[2] === tenantId,
      });

      const previous = qc.getQueryData<InfiniteCache>(sourcesQueryKey(tenantId, qDebounced));
      qc.setQueryData<InfiniteCache>(sourcesQueryKey(tenantId, qDebounced), (old) => {
        if (!old?.pages) return old ?? { pages: [], pageParams: [] };
        const newPages = old.pages.map((pg) => ({
          ...pg,
          data: {
            ...pg.data,
            rows: pg.data.rows.filter((r) => r.id !== id),
          },
        }));
        return { ...old, pages: newPages };
      });
      const deletedItem = flattened.find((x) => x.id === id) ?? null;
      return { previous, deletedItem };
    },
    onError: (err: any, _id, ctx: any) => {
      qc.setQueryData(sourcesQueryKey(tenantId, qDebounced), ctx?.previous);
      const msg = err?.response?.data?.error ?? err?.message ?? "Delete failed";
      toast({
        title: "Delete failed",
        description: msg,
        variant: "destructive",
      });
    },
    // invalidate by tenant (type-safe predicate) on settled
    onSettled: async () => {
      await qc.invalidateQueries({
        predicate: (query) =>
          Array.isArray(query.queryKey) &&
          query.queryKey[0] === "leads" &&
          query.queryKey[1] === "sources" &&
          query.queryKey[2] === tenantId,
      });
    },
    onSuccess: (_data, _id, ctx: any) => {
      const deleted = ctx?.deletedItem ?? null;

      const undoButton = (
        <button
          onClick={async () => {
            if (!deleted) {
              await qc.invalidateQueries({
                predicate: (query) =>
                  Array.isArray(query.queryKey) &&
                  query.queryKey[0] === "leads" &&
                  query.queryKey[1] === "sources" &&
                  query.queryKey[2] === tenantId,
              });
              return;
            }
            try {
              try {
                await apiClient.post(
                  `/leads/sources/${deleted.id}/restore`,
                  {},
                  { headers: { "x-tenant-id": tenantId } }
                );
              } catch {
                const recreate = { ...deleted };
                delete (recreate as any).id;
                await apiClient.post(`/leads/sources`, recreate, { headers: { "x-tenant-id": tenantId } });
              }

              // Invalidate only the queries for this tenant + current search to refresh UI
              await qc.invalidateQueries({
                predicate: (query) =>
                  Array.isArray(query.queryKey) &&
                  query.queryKey[0] === "leads" &&
                  query.queryKey[1] === "sources" &&
                  query.queryKey[2] === tenantId &&
                  query.queryKey[3] === qDebounced,
              });

              toast({
                title: "Restored",
                description: `${deleted.name} restored.`,
              });
            } catch {
              toast({
                title: "Undo failed",
                description: "Could not restore source.",
                variant: "destructive",
              });
            }
          }}
          className="px-3 py-1 rounded bg-white/5 hover:bg-white/8 text-sm"
        >
          Undo
        </button>
      );

      toast({
        title: "Source deleted",
        description: "Undo available for a short time.",
        action: undoButton,
      });
    },
  });

  const itemCount = total > 0 ? total : flattened.length + (hasNextPage ? PAGE_SIZE : 0);
  const virtuosoRef = useRef<any>(null);

  // local refreshing indicator (separate from react-query isFetching)
  const [refreshing, setRefreshing] = useState(false);

  // ---------- robust refresh handler (keeps current search) ----------
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    console.log("🔥 Manual refresh clicked (manualFetch) — keeping current search:", qDebounced);

    const key = sourcesQueryKey(tenantId, qDebounced);

    try {
      const res = await apiClient.get("/leads/sources", {
        params: { page: 1, limit: PAGE_SIZE, q: qDebounced },
        headers: { "x-tenant-id": tenantId },
      });

      const page: PagedResp<Source> =
        res.data && Array.isArray(res.data.rows ? res.data.rows : res.data)
          ? {
              data: {
                rows: res.data.rows ?? res.data,
                total: Number(res.data.total ?? (res.data.rows?.length ?? res.data.length ?? 0)),
              },
            }
          : await fetchSourcesPage({ pageParam: 1, q: qDebounced, tenantId });

      // write into cache in the infinite-query shape (typed)
      qc.setQueryData<InfiniteCache>(key, {
        pages: [page],
        pageParams: [1],
      });

      console.log("Manual fetch + cache prime done ✅", page);
      virtuosoRef.current?.scrollToIndex?.({ index: 0, align: "start" });
    } catch (err) {
      console.error("❌ Manual fetch failed", err);
      toast({
        title: "Refresh failed",
        description: "Could not refresh sources. Check network or server.",
        variant: "destructive",
      });
    } finally {
      setRefreshing(false);
    }
  }, [qDebounced, tenantId, qc, toast]);

  // ---------- reset handler (explicitly clear filter) ----------
  const handleResetSearch = useCallback(() => {
    // cancel pending debounce and immediately clear both states
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
    setQ("");
    setQDebounced("");
    // optional: scroll top and prime empty query quickly
    const key = sourcesQueryKey(tenantId, "");
    (async () => {
      try {
        const res = await apiClient.get("/leads/sources", {
          params: { page: 1, limit: PAGE_SIZE, q: "" },
          headers: { "x-tenant-id": tenantId },
        });
        const page: PagedResp<Source> =
          res.data && Array.isArray(res.data.rows ? res.data.rows : res.data)
            ? {
                data: {
                  rows: res.data.rows ?? res.data,
                  total: Number(res.data.total ?? (res.data.rows?.length ?? res.data.length ?? 0)),
                },
              }
            : await fetchSourcesPage({ pageParam: 1, q: "", tenantId });

        qc.setQueryData<InfiniteCache>(key, {
          pages: [page],
          pageParams: [1],
        });
        virtuosoRef.current?.scrollToIndex?.({ index: 0, align: "start" });
      } catch (err) {
        console.error("Reset fetch failed", err);
      }
    })();
  }, [qc, tenantId]);

  // stable callbacks for Row
  const onEdit = useCallback(
    (item: Source) => {
      setEditing(item);
      setOpen(true);
    },
    [setEditing, setOpen]
  );

  const onDelete = useCallback(
    (id: string) => {
      deleteMut.mutate(id);
    },
    [deleteMut]
  );

  return (
    <div className="rounded-2xl bg-gradient-to-b from-slate-900/80 to-slate-950/80 text-slate-100 border border-white/10 p-6 shadow-lg backdrop-blur-xl">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-3 mb-6">
        <div className="flex-1 flex items-center gap-3">
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search sources..."
            className="w-full md:w-1/2 bg-white/10 border-white/20 text-white placeholder:text-slate-400 focus:ring-2 focus:ring-indigo-500/40"
            aria-label="Search sources"
          />
          {/* Clear / Reset button — explicit reset of filter */}
          <Button
            size="icon"
            variant="ghost"
            onClick={handleResetSearch}
            title="Reset search"
            aria-label="Reset search"
            className="hover:bg-white/6"
          >
            <X className="w-4 h-4 text-slate-300" />
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <Button
            onClick={handleRefresh}
            variant="ghost"
            size="icon"
            aria-label={isFetching || refreshing ? "Refreshing sources" : "Refresh sources"}
            className="hover:bg-white/6"
            title={isFetching || refreshing ? "Refreshing…" : "Refresh"}
            disabled={isFetching || refreshing}
          >
            <RefreshCw className={`w-4 h-4 ${isFetching || refreshing ? "animate-spin" : ""}`} />
          </Button>

          <Button
            onClick={() => {
              setEditing(null);
              setOpen(true);
            }}
            className="bg-gradient-to-r from-indigo-500 to-violet-500 text-white shadow-md"
          >
            + Create
          </Button>
        </div>
      </div>

      {/* Body */}
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={`skeleton-${i}`}
              className="p-4 border border-white/10 bg-white/4 rounded-xl animate-pulse"
            >
              <div className="h-4 w-1/3 bg-slate-700 rounded mb-2" />
              <div className="h-3 w-1/2 bg-slate-700 rounded" />
            </div>
          ))}
        </div>
      ) : isError ? (
        <div className="text-rose-400">Failed to load sources. Try the refresh button above.</div>
      ) : (
        <Virtuoso
          ref={virtuosoRef}
          style={{ height: LIST_HEIGHT, width: "100%" }}
          totalCount={itemCount}
          computeItemKey={(index) => flattened[index]?.id ?? `skeleton-${index}`}
          itemContent={(index) => {
            const style: React.CSSProperties = { height: ROW_HEIGHT };
            const item = flattened[index] ?? null;
            return (
              <div key={item?.id ?? `s-${index}`} style={style}>
                <Row item={item} style={style} onEdit={onEdit} onDelete={onDelete} />
              </div>
            );
          }}
          endReached={() => {
            if (hasNextPage && !isFetchingNextPage) {
              fetchNextPage();
            }
          }}
        />
      )}

      {/* Footer */}
      <div className="mt-3 flex items-center justify-between">
        <div className="text-sm text-slate-400">
          Showing <span className="font-medium">{flattened.length}</span> of{" "}
          <span className="font-medium">{total}</span>
        </div>

        <div className="flex items-center gap-2">
          {isFetchingNextPage && <div className="text-sm text-slate-400">Loading more…</div>}
        </div>
      </div>

      <SourceForm
        open={open}
        onClose={async () => {
          setOpen(false);
          setEditing(null);
          // Invalidate tenant queries after create/update
          await qc.invalidateQueries({
            predicate: (query) =>
              Array.isArray(query.queryKey) &&
              query.queryKey[0] === "leads" &&
              query.queryKey[1] === "sources" &&
              query.queryKey[2] === tenantId,
          });
        }}
        source={editing}
      />
    </div>
  );
}
