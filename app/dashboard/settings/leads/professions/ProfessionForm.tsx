"use client";

import React, { useEffect, useRef } from "react";
import { useForm, useWatch } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import apiClient from "@/lib/api-client";
import { Label } from "@/components/ui/label";
import { DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";

/* -------------------------------------------------------------------------- */
/*  Schema & Types                                                            */
/* -------------------------------------------------------------------------- */

const Schema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  category: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  is_active: z.boolean().optional(),
});

type FormData = z.infer<typeof Schema>;

export type Profession = {
  id: string;
  tenant_id?: string | null;
  name: string;
  category?: string | null;
  description?: string | null;
  is_active?: boolean;
  created_at?: string;
};

/* -------------------------------------------------------------------------- */
/*  Helpers                                                                   */
/* -------------------------------------------------------------------------- */

function isMutationLoading(mut: any) {
  return Boolean(mut?.isLoading ?? mut?.isPending ?? mut?.status === "loading");
}

/* -------------------------------------------------------------------------- */
/*  Component                                                                 */
/* -------------------------------------------------------------------------- */

export default function ProfessionForm({
  open,
  onClose,
  profession,
}: {
  open: boolean;
  onClose: () => void;
  profession?: Profession | null;
}) {
  const qc = useQueryClient();
  const { toast } = useToast();

  const form = useForm<FormData>({
    resolver: zodResolver(Schema),
    defaultValues: { name: "", category: "", description: "", is_active: true },
    mode: "onChange",
  });

  const watchedName = useWatch({ control: form.control, name: "name" });
  const focusRef = useRef<HTMLInputElement | null>(null);

  /* Sync modal open / initial values */
  useEffect(() => {
    if (open) {
      form.reset({
        name: profession?.name ?? "",
        category: profession?.category ?? "",
        description: profession?.description ?? "",
        is_active: profession?.is_active ?? true,
      });
      setTimeout(() => {
        focusRef.current?.focus();
      }, 60);
    } else {
      form.reset({ name: "", category: "", description: "", is_active: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, profession]);

  /* ------------------------------- Mutation -------------------------------- */
  const saveMut = useMutation({
    mutationFn: async (payload: FormData) => {
      return profession?.id
        ? (await apiClient.put(`/leads/professions/${profession.id}`, payload)).data
        : (await apiClient.post(`/leads/professions`, payload)).data;
    },

    onMutate: async (payload) => {
      await qc.cancelQueries({ queryKey: ["leads", "professions"] });
      const prev = qc.getQueryData<any>(["leads", "professions"]);

      const optimistic: Profession =
        profession?.id
          ? { ...(profession as Profession), ...payload }
          : {
              id: `tmp-${crypto.randomUUID()}`,
              name: payload.name,
              category: payload.category ?? null,
              description: payload.description ?? null,
              is_active: payload.is_active ?? true,
              created_at: new Date().toISOString(),
            };

      const applyOptimistic = (old: any) => {
        if (!old?.pages) return old;
        const updatedPages = old.pages.map((pg: any, i: number) => {
          const rows: Profession[] = pg.data.rows;
          const idx = rows.findIndex((r) => r.id === optimistic.id);
          if (idx !== -1) {
            const newRows = [...rows];
            newRows[idx] = optimistic;
            return { ...pg, data: { ...pg.data, rows: newRows } };
          }
          if (i === 0 && optimistic.id.startsWith("tmp-")) {
            return { ...pg, data: { ...pg.data, rows: [optimistic, ...rows] } };
          }
          return pg;
        });
        return { ...old, pages: updatedPages };
      };

      // Apply to all cached queries that look like ["leads","professions", ...]
      qc.getQueryCache()
        .getAll()
        .filter((q) => Array.isArray(q.queryKey) && q.queryKey[0] === "leads" && q.queryKey[1] === "professions")
        .forEach((q) => qc.setQueryData(q.queryKey, (old: any) => applyOptimistic(old)));

      return { prev, optimistic };
    },

    onError: (err: any, _vars, ctx: any) => {
      if (ctx?.prev) qc.setQueryData(["leads", "professions"], ctx.prev);
      toast({
        title: "Save failed",
        description: err?.response?.data?.error ?? err?.message ?? "An unexpected error occurred.",
        variant: "destructive",
      });
    },

    onSuccess: (res: any, _vars, ctx: any) => {
      const canonical: Profession = res?.data ?? res;
      // Replace optimistic with canonical across all cached professions queries
      qc.getQueryCache()
        .getAll()
        .filter((q) => Array.isArray(q.queryKey) && q.queryKey[0] === "leads" && q.queryKey[1] === "professions")
        .forEach((q) =>
          qc.setQueryData(q.queryKey, (old: any) => {
            if (!old?.pages) return old;
            const newPages = old.pages.map((pg: any) => {
              const rows = pg.data.rows.map((r: Profession) =>
                r.id === (ctx?.optimistic?.id || profession?.id) ? canonical : r
              );
              return { ...pg, data: { ...pg.data, rows } };
            });
            return { ...old, pages: newPages };
          })
        );

      toast({
        title: profession ? "Updated" : "Created",
        description: profession ? "Profession updated successfully." : "Profession created successfully.",
      });
      onClose();
    },

    onSettled: () => qc.invalidateQueries({ queryKey: ["leads", "professions"] }),
  });

  /* ------------------------------- Handlers -------------------------------- */
  function onSubmit(data: FormData) {
    saveMut.mutate(data);
  }

  const saving = isMutationLoading(saveMut);

  if (!open) return null;

  /* -------------------------------------------------------------------------- */
  /*  Render                                                                    */
  /* -------------------------------------------------------------------------- */

  return (
    <>
      {/* overlay */}
      <div
        className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm"
        onMouseDown={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      />

      <DialogContent
        role="dialog"
        aria-modal="true"
        aria-label={profession ? "Edit Profession" : "Create Profession"}
        className="fixed left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2 w-[640px] max-w-[95%]"
      >
        <DialogHeader>
          <div>
            <DialogTitle className="text-lg font-semibold text-white tracking-tight">
              {profession ? "Edit Profession" : "Create Profession"}
            </DialogTitle>
            <p className="text-sm text-slate-400 mt-1">
              {profession ? "Modify existing profession details." : "Add a new profession to the system."}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded p-1 hover:bg-white/6 transition-colors"
          >
            <svg
              className="w-5 h-5 text-slate-300"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M6 18L18 6M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5 mt-3">
          {/* Name */}
          <div>
            <Label className="text-sm text-slate-200">
              Name <span className="text-rose-500">*</span>
            </Label>
            <input
              {...form.register("name")}
              ref={(el) => {
                form.register("name").ref(el);
                if (el) focusRef.current = el;
              }}
              className="mt-1 w-full p-3 rounded-lg bg-neutral-800/50 border border-neutral-700 text-white placeholder:text-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30 outline-none transition"
              placeholder="Profession name"
              autoComplete="off"
            />
            {form.formState.errors.name && (
              <p className="text-xs text-rose-400 mt-1">{String(form.formState.errors.name.message)}</p>
            )}
          </div>

          {/* Category */}
          <div>
            <Label className="text-sm text-slate-200">Category</Label>
            <input
              {...form.register("category")}
              className="mt-1 w-full p-3 rounded-lg bg-neutral-800/50 border border-neutral-700 text-white placeholder:text-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30 outline-none transition"
              placeholder="Optional category"
              autoComplete="off"
            />
          </div>

          {/* Description */}
          <div>
            <Label className="text-sm text-slate-200">Description</Label>
            <textarea
              {...form.register("description")}
              className="mt-1 w-full p-3 rounded-lg bg-neutral-800/50 border border-neutral-700 text-white placeholder:text-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30 outline-none transition resize-none h-24"
              placeholder="Optional description"
            />
          </div>

          {/* Active */}
          <label className="flex items-center gap-2 text-sm text-slate-200">
            <input type="checkbox" {...form.register("is_active")} className="accent-indigo-500 w-4 h-4" />
            Active
          </label>

          <DialogFooter className="flex justify-end gap-3 mt-5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-neutral-800 text-slate-300 border border-neutral-700 hover:bg-neutral-700 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 rounded-lg bg-gradient-to-r from-indigo-500 to-violet-500 text-white font-semibold shadow-md disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {saving ? "Saving…" : profession ? "Update" : "Save"}
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </>
  );
}
