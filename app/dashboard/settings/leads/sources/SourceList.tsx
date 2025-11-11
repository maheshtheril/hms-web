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
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/components/ui/use-toast";
import { EllipsisVertical } from "lucide-react";

// virtuoso
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
const LOAD_THRESHOLD = 6;

/* -------------------------
 * API
 * ------------------------ */
const fetchSourcesPage = async ({
  pageParam = 1,
  q = "",
}: {
  pageParam?: number;
  q?: string;
}): Promise<PagedResp<Source>> => {
  const res = await apiClient.get(`/leads/sources`, {
    params: { page: pageParam, limit: PAGE_SIZE, q },
  });
  return res.data;
};

/* -------------------------
 * Fallback Menu
 * ------------------------ */
function FallbackMenu({
  onEdit,
  onDelete,
}: {
  onEdit: () => void;
  onDelete: () => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <Button
        size="icon"
        variant="ghost"
        className="hover:bg-white/8"
        aria-label="Actions"
        onClick={() => setOpen((s) => !s)}
      >
        <EllipsisVertical className="w-5 h-5 text-slate-300" />
      </Button>

      {open && (
        <div className="absolute right-0 mt-2 w-40 z-50 bg-neutral-900/95 border border-white/10 rounded-xl shadow-lg p-2">
          <button
            onClick={() => {
              setOpen(false);
              onEdit();
            }}
            className="w-full text-left px-3 py-2 rounded-md hover:bg-white/5"
          >
            ✏️ Edit
          </button>
          <button
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
 * Component
 * ------------------------ */
export default function SourceList(): JSX.Element {
  const [q, setQ] = useState<string>("");
  const [qDebounced, setQDebounced] = useState<string>("");
  const [editing, setEditing] = useState<Source | null>(null);
  const [open, setOpen] = useState<boolean>(false);

  const qc = useQueryClient();
  const { toast } = useToast();

  const listRef = useRef<any>(null);
  const [primitivesAvailable, setPrimitivesAvailable] = useState<boolean>(true);

  // runtime check for dropdown primitives
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const mod = await import("@/components/ui/dropdown-menu");
        const ok =
          Boolean(mod?.DropdownMenu) &&
          Boolean(mod?.DropdownMenuTrigger) &&
          Boolean(mod?.DropdownMenuContent) &&
          Boolean(mod?.DropdownMenuItem);
        if (mounted) setPrimitivesAvailable(Boolean(ok));
      } catch {
        if (mounted) setPrimitivesAvailable(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  // debounce search
  useEffect(() => {
    const t = setTimeout(() => setQDebounced(q.trim()), 250);
    return () => clearTimeout(t);
  }, [q]);

  const infiniteQueryOptions: UseInfiniteQueryOptions<
    PagedResp<Source>,
    Error,
    InfiniteData<PagedResp<Source>>,
    readonly unknown[],
    number
  > = {
    queryKey: ["leads", "sources", qDebounced],
    queryFn: async ({ pageParam = 1 }: { pageParam: number }) =>
      fetchSourcesPage({ pageParam, q: qDebounced }),
    getNextPageParam: (lastPage, pages) => {
      const fetched = pages.flatMap((p) => p.data.rows).length;
      const total = lastPage?.data?.total ?? 0;
      return fetched < total ? pages.length + 1 : undefined;
    },
    staleTime: 30_000,
    initialPageParam: 1,
  };

  const {
    data,
    isLoading,
    isError,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    refetch,
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
  const total = data?.pages?.[0]?.data?.total ?? flattened.length;

  const deleteMut = useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/leads/sources/${id}`);
    },
    onMutate: async (id: string) => {
      await qc.cancelQueries({ queryKey: ["leads", "sources", qDebounced] });
      const previous = qc.getQueryData<any>(["leads", "sources", qDebounced]);
      qc.setQueryData<any>(["leads", "sources", qDebounced], (old: any) => {
        if (!old?.pages) return old;
        const newPages = old.pages.map((pg: any) => ({
          ...pg,
          data: {
            ...pg.data,
            rows: pg.data.rows.filter((r: Source) => r.id !== id),
          },
        }));
        return { ...old, pages: newPages };
      });
      const deletedItem = flattened.find((x) => x.id === id) ?? null;
      return { previous, deletedItem };
    },
    onError: (err: any, _id, ctx: any) => {
      qc.setQueryData(["leads", "sources", qDebounced], ctx?.previous);
      const msg =
        err?.response?.data?.error ?? err?.message ?? "Delete failed";
      toast({
        title: "Delete failed",
        description: msg,
        variant: "destructive",
      });
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ["leads", "sources"] }),
    onSuccess: (_data, _id, ctx: any) => {
      const deleted = ctx?.deletedItem ?? null;

      const undoButton = (
        <button
          onClick={async () => {
            if (!deleted) {
              await qc.invalidateQueries({
                queryKey: ["leads", "sources", qDebounced],
              });
              return;
            }
            try {
              try {
                await apiClient.post(`/leads/sources/${deleted.id}/restore`);
              } catch {
                const recreate = { ...deleted };
                delete (recreate as any).id;
                await apiClient.post(`/leads/sources`, recreate);
              }
              await qc.invalidateQueries({
                queryKey: ["leads", "sources", qDebounced],
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

  const Row = ({ index, style }: { index: number; style: React.CSSProperties }) => {
    const item = flattened[index];
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

    const onEdit = () => {
      setEditing(item);
      setOpen(true);
    };
    const onDelete = () => deleteMut.mutate(item.id);

    return (
      <div
        style={style}
        className="p-4 border border-white/10 bg-white/5 rounded-xl flex items-center justify-between gap-4"
      >
        <div className="flex-1">
          <div className="font-medium text-white tracking-tight">
            {item.name}
          </div>
          <div className="text-xs text-slate-300">
            {item.description ?? "—"}
          </div>
          {item.key && (
            <div className="text-xs text-slate-400 mt-1">Key: {item.key}</div>
          )}
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

          {primitivesAvailable ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  size="icon"
                  variant="ghost"
                  className="hover:bg-white/8"
                  aria-label="Actions"
                >
                  <EllipsisVertical className="w-5 h-5 text-slate-300" />
                </Button>
              </DropdownMenuTrigger>

              <DropdownMenuContent
                align="end"
                className="bg-neutral-900/90 border border-white/10 backdrop-blur-md shadow-xl rounded-xl"
              >
                <DropdownMenuItem onClick={onEdit}>✏️ Edit</DropdownMenuItem>
                <DropdownMenuItem
                  onClick={onDelete}
                  className="text-rose-400"
                >
                  🗑 Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <FallbackMenu onEdit={onEdit} onDelete={onDelete} />
          )}
        </div>
      </div>
    );
  };

  const itemCount =
    total > 0 ? total : flattened.length + (hasNextPage ? PAGE_SIZE : 0);

  const virtuosoRef = useRef<any>(null);

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

      {/* Body */}
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="p-4 border border-white/10 bg-white/4 rounded-xl animate-pulse"
            >
              <div className="h-4 w-1/3 bg-slate-700 rounded mb-2" />
              <div className="h-3 w-1/2 bg-slate-700 rounded" />
            </div>
          ))}
        </div>
      ) : isError ? (
        <div className="text-rose-400">Failed to load sources. Try refreshing.</div>
      ) : (
        <Virtuoso
          ref={virtuosoRef}
          style={{ height: LIST_HEIGHT, width: "100%" }}
          totalCount={itemCount}
          itemContent={(index) => {
            // Wrap Row so style gets respected
            const style: React.CSSProperties = { height: ROW_HEIGHT };
            return (
              <div style={style}>
                <Row index={index} style={style} />
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
          Showing{" "}
          <span className="font-medium">{flattened.length}</span> of{" "}
          <span className="font-medium">{total}</span>
        </div>

        <div className="flex items-center gap-2">
          {isFetchingNextPage && (
            <div className="text-sm text-slate-400">Loading more…</div>
          )}
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            Refresh
          </Button>
        </div>
      </div>

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
