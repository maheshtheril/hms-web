"use client";
import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import apiClient from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";
import { motion } from "framer-motion";
import Link from "next/link";
import PipelineForm from "./PipelineForm";

export interface Pipeline {
  id: string;
  tenant_id: string | null;
  name: string;
  description?: string | null;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

/* ---------------- FETCH HOOKS ---------------- */
const fetchPipelines = async (q: string) => {
  const res = await apiClient.get("/leads/pipelines", { params: { q } });
  return res.data?.rows ?? res.data?.data ?? [];
};

export default function PipelineList() {
  const [q, setQ] = useState("");
  const [editing, setEditing] = useState<Pipeline | null>(null);
  const [open, setOpen] = useState(false);
  const qc = useQueryClient();
  const { toast } = useToast();

  const { data: items = [], isLoading } = useQuery({
  queryKey: ["pipelines", q],
  queryFn: () => fetchPipelines(q),
  // make data "fresh" for 60s to avoid refetch flicker
  staleTime: 1000 * 60,
  // optionally show previous data until the new data arrives
  placeholderData: () => {
    // you can return [] or previous cached value here if you want
    return [];
  },
});


  const deleteMut = useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/leads/pipelines/${id}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pipelines"] });
      toast({ title: "Deleted", description: "Pipeline deleted successfully." });
    },
    onError: (err: any) =>
      toast({
        title: "Error",
        description: err?.message ?? "Delete failed.",
        variant: "destructive",
      }),
  });

  return (
    <div className="rounded-xl bg-white/40 backdrop-blur-lg border border-white/20 p-5 shadow-md">
      <div className="flex flex-col md:flex-row items-center justify-between gap-3 mb-5">
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search pipelines..."
          className="w-full md:w-1/2 bg-white/70 border-white/30"
        />
        <Button onClick={() => { setEditing(null); setOpen(true); }}>
          + Create
        </Button>
      </div>

      {isLoading ? (
        <div className="text-sm text-slate-500">Loading pipelines…</div>
      ) : items.length === 0 ? (
        <div className="text-sm text-slate-400">No pipelines found.</div>
      ) : (
        <div className="space-y-3">
          {items.map((p: Pipeline) => (

            <motion.div
              key={p.id}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-4 border border-white/30 bg-white/60 backdrop-blur-xl rounded-xl flex items-center justify-between"
            >
              <div>
                <div className="font-medium">{p.name}</div>
                <div className="text-xs text-slate-500">
                  {p.description ?? "No description"} • {p.tenant_id ?? "Global"}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-slate-600">
                  {p.is_active ? "Active" : "Inactive"}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => { setEditing(p); setOpen(true); }}
                >
                  Edit
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => {
                    if (confirm("Delete pipeline? This action is irreversible."))
                      deleteMut.mutate(p.id);
                  }}
                >
                  Delete
                </Button>
                <Link
                  href={`/dashboard/settings/leads/stages?pipeline_id=${p.id}`}
                  className="text-sm px-2 py-1 border rounded hover:bg-white/50"
                >
                  Manage Stages
                </Link>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      <PipelineForm open={open} onOpenChange={setOpen} pipeline={editing} />
    </div>
  );
}
