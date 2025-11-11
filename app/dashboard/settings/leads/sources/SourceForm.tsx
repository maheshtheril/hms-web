"use client";

import React, { useEffect, useRef, useState } from "react";
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
  key: z.string().min(1, "Key is required"),
  name: z.string().min(2, "Name must be at least 2 characters"),
  description: z.string().optional().nullable(),
  is_active: z.boolean().optional(),
});

type FormData = z.infer<typeof Schema>;

export type Source = {
  id: string;
  tenant_id?: string | null;
  key?: string;
  name: string;
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

/** Unicode-safe name→KEY generator */
function makeKeyFromName(name: string) {
  if (!name) return "";
  return name
    .normalize("NFKD")
    .replace(/[^\p{L}\p{N}]+/gu, "_")
    .replace(/^_+|_+$/g, "")
    .replace(/_+/g, "_")
    .toUpperCase();
}

/* -------------------------------------------------------------------------- */
/*  Main Component                                                            */
/* -------------------------------------------------------------------------- */

export default function SourceForm({
  open,
  onClose,
  source,
}: {
  open: boolean;
  onClose: () => void;
  source?: Source | null;
}) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const keyTouchedRef = useRef(false);

  const form = useForm<FormData>({
    resolver: zodResolver(Schema),
    defaultValues: { key: "", name: "", description: "", is_active: true },
    mode: "onChange",
  });

  const watchedName = useWatch({ control: form.control, name: "name" });

  /* ---------------------------- Sync Modal State --------------------------- */
  useEffect(() => {
    if (open) {
      const initialKey = source?.key ?? "";
      form.reset({
        key: initialKey,
        name: source?.name ?? "",
        description: source?.description ?? "",
        is_active: source?.is_active ?? true,
      });
      keyTouchedRef.current = Boolean(initialKey);
      setTimeout(() => form.setFocus("name"), 60);
    } else {
      keyTouchedRef.current = false;
      form.reset({ key: "", name: "", description: "", is_active: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, source]);

  /* --------------------------- Auto Key Generation ------------------------- */
  useEffect(() => {
    if (keyTouchedRef.current) return;
    const gen = makeKeyFromName(watchedName ?? "");
    const current = form.getValues("key");
    if (current !== gen) form.setValue("key", gen, { shouldDirty: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [watchedName]);

  /* ------------------------------- Mutation -------------------------------- */
  const saveMut = useMutation({
    mutationFn: async (payload: FormData) => {
      const data = { ...payload, key: payload.key.toUpperCase() };
      return source?.id
        ? (await apiClient.put(`/leads/sources/${source.id}`, data)).data
        : (await apiClient.post(`/leads/sources`, data)).data;
    },

    onMutate: async (payload) => {
      await qc.cancelQueries({ queryKey: ["leads", "sources"] });
      const prev = qc.getQueryData<any>(["leads", "sources"]);
      const optimistic: Source =
        source?.id
          ? { ...(source as Source), ...payload, key: payload.key.toUpperCase() }
          : {
              id: `tmp-${crypto.randomUUID()}`,
              name: payload.name,
              key: payload.key.toUpperCase(),
              description: payload.description ?? null,
              is_active: payload.is_active ?? true,
              created_at: new Date().toISOString(),
            };

      const applyOptimistic = (old: any) => {
        if (!old?.pages) return old;
        const updatedPages = old.pages.map((pg: any, i: number) => {
          const rows: Source[] = pg.data.rows;
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

      qc.getQueryCache()
        .getAll()
        .filter((q) => Array.isArray(q.queryKey) && q.queryKey[0] === "leads" && q.queryKey[1] === "sources")
        .forEach((q) => qc.setQueryData(q.queryKey, (old: any) => applyOptimistic(old)));

      return { prev, optimistic };
    },

    onError: (err, _vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(["leads", "sources"], ctx.prev);
      toast({
        title: "Save failed",
        description:
          err?.response?.data?.error ?? err?.message ?? "An unexpected error occurred.",
        variant: "destructive",
      });
    },

    onSuccess: (res, _vars, ctx) => {
      const canonical: Source = res?.data ?? res;
      qc.getQueryCache()
        .getAll()
        .filter((q) => Array.isArray(q.queryKey) && q.queryKey[0] === "leads" && q.queryKey[1] === "sources")
        .forEach((q) =>
          qc.setQueryData(q.queryKey, (old: any) => {
            if (!old?.pages) return old;
            const newPages = old.pages.map((pg: any) => {
              const rows = pg.data.rows.map((r: Source) =>
                r.id === (ctx?.optimistic?.id || source?.id) ? canonical : r
              );
              return { ...pg, data: { ...pg.data, rows } };
            });
            return { ...old, pages: newPages };
          })
        );

      toast({
        title: source ? "Updated" : "Created",
        description: source ? "Source updated successfully." : "Source created successfully.",
      });
      onClose();
    },

    onSettled: () => qc.invalidateQueries({ queryKey: ["leads", "sources"] }),
  });

  /* ------------------------------- Handlers -------------------------------- */
  function onSubmit(data: FormData) {
    saveMut.mutate(data);
  }

  const saving = isMutationLoading(saveMut);
  const onKeyChange = (v: string) => {
    keyTouchedRef.current = true;
    form.setValue("key", v, { shouldDirty: true });
  };

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
        aria-label={source ? "Edit Source" : "Create Source"}
        className="fixed left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2 w-[560px] max-w-[95%]"
      >
        <DialogHeader>
          <div>
            <DialogTitle className="text-lg font-semibold text-white tracking-tight">
              {source ? "Edit Source" : "Create Source"}
            </DialogTitle>
            <p className="text-sm text-slate-400 mt-1">
              {source ? "Modify existing source details." : "Add a new source to the system."}
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
          {/* Key */}
          <div>
            <Label className="text-sm text-slate-200">
              Key / Code <span className="text-rose-500">*</span>
            </Label>
            <input
              {...form.register("key")}
              onChange={(e) => onKeyChange(e.target.value)}
              className="mt-1 w-full p-3 rounded-lg bg-neutral-800/50 border border-neutral-700 text-white placeholder:text-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30 outline-none transition"
              placeholder="e.g. WEB_FORM"
              autoComplete="off"
            />
            {form.formState.errors.key && (
              <p className="text-xs text-rose-400 mt-1">
                {String(form.formState.errors.key.message)}
              </p>
            )}
          </div>

          {/* Name */}
          <div>
            <Label className="text-sm text-slate-200">
              Name <span className="text-rose-500">*</span>
            </Label>
            <input
              {...form.register("name")}
              className="mt-1 w-full p-3 rounded-lg bg-neutral-800/50 border border-neutral-700 text-white placeholder:text-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30 outline-none transition"
              placeholder="Source name"
              autoComplete="off"
            />
            {form.formState.errors.name && (
              <p className="text-xs text-rose-400 mt-1">
                {String(form.formState.errors.name.message)}
              </p>
            )}
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
              {saving ? "Saving…" : source ? "Update" : "Save"}
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </>
  );
}
