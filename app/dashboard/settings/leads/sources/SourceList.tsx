// app/components/leads/SourceList.tsx
"use client";
import React, { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import apiClient from "@/lib/api-client";
import SourceForm from "./SourceForm";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";
import { motion } from "framer-motion";

export type Source = {
  id: string;
  tenant_id?: string | null;
  key?: string;
  name: string;
  description?: string | null;
  is_active?: boolean;
  created_at?: string;
};

const fetchSources = async (q = "") => {
  const res = await apiClient.get("/leads/sources", { params: { q } });
  // backend sometimes returns { data: rows } or { data: { rows: [...] } }
  // normalize to an array
  return res.data?.data ?? res.data ?? [];
};

/** react-query v4/v5 compatible loading checker for mutations */
function isMutationLoading(mut: any) {
  return Boolean((mut as any)?.isLoading ?? (mut as any)?.isPending ?? (mut as any)?.status === "loading");
}

export default function SourceList() {
  const [q, setQ] = useState("");
  const [qDebounced, setQDebounced] = useState("");
  const [editing, setEditing] = useState<Source | null>(null);
  const [open, setOpen] = useState(false);
  const qc = useQueryClient();
  const { toast } = useToast();

  // debounce search input (200ms)
  useEffect(() => {
    const t = setTimeout(() => setQDebounced(q.trim()), 200);
    return () => clearTimeout(t);
  }, [q]);

  const { data: items = [], isLoading } = useQuery<Source[]>({
    queryKey: ["leads", "sources", qDebounced],
    queryFn: () => fetchSources(qDebounced),
    staleTime: 60_000,
    placeholderData: [],
  });

  const deleteMut = useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/leads/sources/${id}`);
    },
    onSuccess: () => {
      // invalidate all sources queries (prefix ["leads","sources"])
      qc.invalidateQueries({ queryKey: ["leads", "sources"] });
      toast({ title: "Deleted", description: "Source deleted." });
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.error ?? err?.message ?? "Delete failed";
      toast({ title: "Error", description: msg, variant: "destructive" });
    },
  });

  const deleting = isMutationLoading(deleteMut);

  return (
    <div className="rounded-xl bg-slate-900/70 text-slate-100 border border-white/10 p-5 shadow-md">
      <div className="flex flex-col md:flex-row items-center justify-between gap-3 mb-5">
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search sources..."
          className="w-full md:w-1/2 bg-white/6"
        />
        <Button
          onClick={() => {
            setEditing(null);
            setOpen(true);
          }}
        >
          + Create
        </Button>
      </div>

      {isLoading ? (
        <div className="text-sm text-slate-400">Loading sources…</div>
      ) : items.length === 0 ? (
        <div className="text-sm text-slate-500">No sources found.</div>
      ) : (
        <div className="space-y-3">
          {items.map((s: Source) => (
            <motion.div
              key={s.id}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-4 border border-white/6 bg-white/3 rounded-xl flex items-center justify-between"
            >
              <div>
                <div className="font-medium text-white">{s.name}</div>
                <div className="text-xs text-slate-300">{s.description ?? "—"}</div>
                {s.key && <div className="text-xs text-slate-400 mt-1">Key: {s.key}</div>}
              </div>

              <div className="flex items-center gap-2">
                <span className="text-sm text-slate-300">{s.is_active ? "Active" : "Inactive"}</span>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setEditing(s);
                    setOpen(true);
                  }}
                  disabled={deleting}
                >
                  Edit
                </Button>

                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => {
                    if (!confirm("Delete source?")) return;
                    deleteMut.mutate(s.id);
                  }}
                  disabled={deleting}
                >
                  {deleting ? "Deleting…" : "Delete"}
                </Button>
              </div>
            </motion.div>
          ))}
        </div>
      )}

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
