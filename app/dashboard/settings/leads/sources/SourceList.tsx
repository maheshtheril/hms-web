// app/components/leads/SourceList.tsx
"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import apiClient from "@/lib/api-client";
import SourceForm from "./SourceForm";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/components/ui/use-toast";
import { motion } from "framer-motion";
import { EllipsisVertical } from "lucide-react";
import InfiniteLoader from "react-window-infinite-loader";
import { FixedSizeList as List, ListOnItemsRenderedProps } from "react-window";

/** -----------------------------
 * Types
 * ------------------------------ */
export type Source = {
  id: string;
  tenant_id?: string | null;
  key?: string;
  name: string;
  description?: string | null;
  is_active?: boolean;
  created_at?: string;
};

/** Response shape we expect from server for paginated lists */
type PagedResp<T> = {
  data: {
    rows: T[];
    total: number;
  };
};

/** -----------------------------
 * Config
 * ------------------------------ */
const PAGE_SIZE = 30;
const ROW_HEIGHT = 88; // px — adjust as needed for your row design
const LIST_HEIGHT = 640; // px — viewport height for list (desktop)

/** -----------------------------
 * Server fetcher: paginated
 * ------------------------------ */
const fetchSourcesPage = async ({ pageParam = 1, queryKey }: any): Promise<PagedResp<Source>> => {
  const q = queryKey[2] ?? "";
  const res = await apiClient.get(`/leads/sources`, {
    params: { page: pageParam, limit: PAGE_SIZE, q },
  });
  return res.data;
};

/** -----------------------------
 * Component
 * ------------------------------ */
export default function SourceList() {
  const [q, setQ] = useState("");
  const [qDebounced, setQDebounced] = useState("");
  const [editing, setEditing] = useState<Source | null>(null);
  const [open, setOpen] = useState(false);
  const qc = useQueryClient();
  const { toast } = useToast();
  const listRef = useRef<List | null>(null);

  // debounce search
  useEffect(() => {
    const t = setTimeout(() => setQDebounced(q.trim()), 250);
    return () => clearTimeout(t);
  }, [q]);

  // useInfiniteQuery for server-driven pagination
  const {
    data,
    isLoading,
    isError,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    refetch,
  } = useInfiniteQuery({
    queryKey: ["leads", "sources", qDebounced],
    queryFn: ({ pageParam = 1 }) => fetchSourcesPage({ pageParam, queryKey: ["leads", "sources", qDebounced] }),
    getNextPageParam: (lastPage, pages) => {
      const fetched = pages.flatMap((p) => p.data.rows).length;
      const total = lastPage?.data?.total ?? 0;
      if (fetched < total) return pages.length + 1; // next page number
      return undefined;
    },
    staleTime: 30_000,
    keepPreviousData: true,
  });

  // flatten rows + total
  const flattened = useMemo(() => data?.pages.flatMap((p) => p.data.rows) ?? [], [data]);
  const total = data?.pages?.[0]?.data?.total ?? flattened.length;

  /** -----------------------------
   * Virtualization helpers for react-window-infinite-loader
   * ------------------------------ */
  const isItemLoaded = (index: number) => index < flattened.length;

  const loadMoreItems = async (startIndex: number, stopIndex: number) => {
    if (!hasNextPage || isFetchingNextPage) return;
    await fetchNextPage();
  };

  /** -----------------------------
   * Optimistic delete + true-undo implementation
   * - onMutate: remove locally and store deleted object
   * - onSuccess: show toast with Undo
   * - onUndo: if server supports restore endpoint, call it; otherwise re-create via POST
   * ------------------------------ */
  const deleteMut = useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/leads/sources/${id}`);
    },
    onMutate: async (id: string) => {
      await qc.cancelQueries({ queryKey: ["leads", "sources", qDebounced] });
      // capture snapshot (pages structure)
      const previousPages = qc.getQueryData<any>(["leads", "sources", qDebounced]);
      // optimistic update: remove from cache pages
      qc.setQueryData<any>(["leads", "sources", qDebounced], (old: any) => {
        if (!old?.pages) return old;
        const newPages = old.pages.map((pg: any) => ({
          ...pg,
          data: { ...pg.data, rows: pg.data.rows.filter((r: Source) => r.id !== id) },
        }));
        return { ...old, pages: newPages };
      });
      // return context containing previousPages and deletedItem (for undo restore)
      const deletedItem = flattened.find((x) => x.id === id) ?? null;
      return { previousPages, deletedItem };
    },
    onError: (err: any, id, context: any) => {
      qc.setQueryData(["leads", "sources", qDebounced], context?.previousPages);
      const msg = err?.response?.data?.error ?? err?.message ?? "Delete failed";
      toast({ title: "Delete failed", description: msg, variant: "destructive" });
    },
    onSettled: () => {
      // always refetch to reconcile
      qc.invalidateQueries({ queryKey: ["leads", "sources"] });
    },
    onSuccess: (_data, id, context: any) => {
      // show undo toast — implement actual restore below
      const deleted = context?.deletedItem ?? null;
      toast({
        title: "Source deleted",
        description: "Undo available for 6 seconds.",
        action: {
          label: "Undo",
          onClick: async () => {
            if (!deleted) {
              // fallback: just refetch
              await qc.invalidateQueries({ queryKey: ["leads", "sources", qDebounced] });
              return;
            }
            try {
              // Preferred: server exposes a restore endpoint
              // try /leads/sources/:id/restore first (soft delete restore)
              try {
                await apiClient.post(`/leads/sources/${deleted.id}/restore`);
              } catch (e) {
                // fallback: re-create (POST) with original payload (remove id if necessary)
                const recreate = { ...deleted };
                // Many servers reject id field on create — remove it
                delete (recreate as any).id;
                await apiClient.post(`/leads/sources`, recreate);
              }
              // refresh UI
              await qc.invalidateQueries({ queryKey: ["leads", "sources", qDebounced] });
              toast({ title: "Restored", description: `${deleted.name} restored.` });
            } catch (errRestore) {
              toast({ title: "Undo failed", description: "Could not restore source.", variant: "destructive" });
            }
          },
        },
        // optionally auto-dismiss after a few seconds — your toast implementation may need props for this
      });
    },
  });

  const restoring = false; // placeholder if you implement separate restore mutation

  const deleting = deleteMut.isLoading || isFetchingNextPage;

  /** -----------------------------
   * Row renderer for virtualized list
   * ------------------------------ */
  const Row = ({ index, style }: { index: number; style: React.CSSProperties }) => {
    // show skeleton placeholder while loading more items
    const item = flattened[index];
    if (!item) {
      return (
        <div style={style} className="p-4 border border-white/8 bg-white/3 rounded-xl animate-pulse">
          <div className="h-4 w-1/3 bg-slate-700 rounded mb-2" />
          <div className="h-3 w-1/2 bg-slate-700 rounded mb-1" />
        </div>
      );
    }

    return (
      <div style={style} className="p-4 border border-white/10 bg-white/5 rounded-xl flex items-center justify-between gap-4">
        <div className="flex-1">
          <div className="font-medium text-white tracking-tight">{item.name}</div>
          <div className="text-xs text-slate-300">{item.description ?? "—"}</div>
          {item.key && <div className="text-xs text-slate-400 mt-1">Key: {item.key}</div>}
        </div>

        <div className="flex items-center gap-2">
          <span className={`text-xs px-2 py-1 rounded-full ${item.is_active ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/20" : "bg-slate-700/50 text-slate-400 border border-slate-600/40"}`}>
            {item.is_active ? "Active" : "Inactive"}
          </span>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="icon" variant="ghost" className="hover:bg-white/8" aria-label="Actions">
                <EllipsisVertical className="w-5 h-5 text-slate-300" />
              </Button>
            </DropdownMenuTrigger>

            <DropdownMenuContent align="end" className="bg-neutral-900/90 border border-white/10 backdrop-blur-md shadow-xl rounded-xl">
              <DropdownMenuItem onClick={() => { setEditing(item); setOpen(true); }}>✏️ Edit</DropdownMenuItem>
              <DropdownMenuItem onClick={() => deleteMut.mutate(item.id)} className="text-rose-400">🗑 Delete</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    );
  };

  /** -----------------------------
   * Hook up react-window + infinite-loader
   * ------------------------------ */
  // itemCount = total if known, otherwise flattened.length + (hasNextPage ? PAGE_SIZE : 0)
  const itemCount = total > 0 ? total : flattened.length + (hasNextPage ? PAGE_SIZE : 0);
  const loaderRef = useRef<any>(null);

  // react-window requires that loadMoreItems returns a promise
  const wrappedLoadMoreItems = (startIndex: number, stopIndex: number) => {
    return loadMoreItems(startIndex, stopIndex);
  };

  return (
    <div className="rounded-2xl bg-gradient-to-b from-slate-900/80 to-slate-950/80 text-slate-100 border border-white/10 p-6 shadow-lg backdrop-blur-xl">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-3 mb-6">
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search sources..."
          className="w-full md:w-1/2 bg-white/10 border-white/20 text-white placeholder:text-slate-400 focus:ring-2 focus:ring-indigo-500/40"
        />
        <Button onClick={() => { setEditing(null); setOpen(true); }} className="bg-gradient-to-r from-indigo-500 to-violet-500 text-white shadow-md">+ Create</Button>
      </div>

      {/* List container */}
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="p-4 border border-white/10 bg-white/4 rounded-xl animate-pulse">
              <div className="h-4 w-1/3 bg-slate-700 rounded mb-2" />
              <div className="h-3 w-1/2 bg-slate-700 rounded" />
            </div>
          ))}
        </div>
      ) : isError ? (
        <div className="text-rose-400">Failed to load sources. Try refreshing.</div>
      ) : (
        <InfiniteLoader
          isItemLoaded={isItemLoaded}
          itemCount={itemCount}
          loadMoreItems={wrappedLoadMoreItems}
          ref={loaderRef}
          threshold={6}
        >
          {({ onItemsRendered, ref }) => (
            <List
              height={LIST_HEIGHT}
              itemCount={itemCount}
              itemSize={ROW_HEIGHT}
              width="100%"
              onItemsRendered={(props: ListOnItemsRenderedProps) => {
                onItemsRendered(props);
              }}
              ref={(list) => {
                // combine refs
                ref(list);
                listRef.current = list;
              }}
            >
              {Row}
            </List>
          )}
        </InfiniteLoader>
      )}

      {/* Footer: show a small loader when next page fetching */}
      <div className="mt-3 flex items-center justify-between">
        <div className="text-sm text-slate-400">
          Showing <span className="font-medium">{flattened.length}</span> of <span className="font-medium">{total}</span>
        </div>

        <div className="flex items-center gap-2">
          {isFetchingNextPage && <div className="text-sm text-slate-400">Loading more…</div>}
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            Refresh
          </Button>
        </div>
      </div>

      {/* Modal */}
      <SourceForm
        open={open}
        onClose={() => {
          setOpen(false);
          setEditing(null);
        }}
        source={editing}
      />
    </div>
  );
}
