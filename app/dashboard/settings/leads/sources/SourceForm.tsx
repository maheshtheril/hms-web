"use client";

import React, { useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import apiClient from "@/lib/api-client";
import { Label } from "@/components/ui/label";
import { DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";

const Schema = z.object({
  name: z.string().min(2),
  description: z.string().optional(),
  is_active: z.boolean().optional(),
});
type FormData = z.infer<typeof Schema>;

/** Helper: react-query v4/v5 compatible loading checker */
function isMutationLoading(mut: any) {
  return Boolean(mut?.isLoading ?? mut?.isPending ?? mut?.status === "loading");
}

export default function SourceForm({
  open,
  onClose,
  source,
}: {
  open: boolean;
  onClose: () => void;
  source?: any | null;
}) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const form = useForm<FormData>({
    resolver: zodResolver(Schema),
    defaultValues: { name: "", description: "", is_active: true },
  });

  // focus name when opened
  useEffect(() => {
    if (open) {
      form.reset({
        name: source?.name ?? "",
        description: source?.description ?? "",
        is_active: source?.is_active ?? true,
      });
      // slight delay to ensure DOM mounted
      setTimeout(() => form.setFocus("name"), 50);
    }
  }, [open, source, form]);

  // close on Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && open) onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const saveMut = useMutation({
    mutationFn: async (payload: FormData) => {
      if (source?.id) {
        await apiClient.put(`/leads/sources/${source.id}`, payload);
      } else {
        await apiClient.post(`/leads/sources`, payload);
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["leads", "sources"] });
      toast({
        title: source ? "Updated" : "Created",
        description: source ? "Source updated." : "Source created.",
      });
      onClose();
    },
    onError: (err: any) =>
      toast({ title: "Error", description: err?.message ?? "Save failed", variant: "destructive" }),
  });

  function onSubmit(data: FormData) {
    saveMut.mutate(data);
  }

  const saving = isMutationLoading(saveMut);

  if (!open) return null;

  return (
    <>
      {/* overlay */}
      <div
        className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm"
        onMouseDown={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
        aria-hidden
      />

      {/* dialog */}
      <DialogContent
        role="dialog"
        aria-modal="true"
        aria-label={source ? "Edit Source" : "Create Source"}
        className="fixed left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2 w-[560px] max-w-[95%]"
      >
        <DialogHeader>
          <div>
            <DialogTitle>{source ? "Edit Source" : "Create Source"}</DialogTitle>
            <p className="text-sm text-neutral-300 mt-1">Manage lead source entries.</p>
          </div>

          {/* close button */}
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="ml-3 rounded p-1 hover:bg-white/6 transition-colors"
          >
            <svg className="w-5 h-5 text-neutral-200" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M6 18L18 6M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 mt-3">
          <div>
            <Label className="text-sm text-neutral-200">Name <span className="text-rose-500">*</span></Label>
            <input
              {...form.register("name")}
              className="mt-1 w-full p-3 rounded-lg bg-neutral-800/50 border border-neutral-700 text-neutral-100 placeholder:text-neutral-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30 outline-none transition"
              placeholder="Source name"
              autoComplete="off"
            />
            {form.formState.errors.name && (
              <p className="text-xs text-rose-400 mt-1">{String(form.formState.errors.name.message)}</p>
            )}
          </div>

          <div>
            <Label className="text-sm text-neutral-200">Description</Label>
            <textarea
              {...form.register("description")}
              className="mt-1 w-full p-3 rounded-lg bg-neutral-800/50 border border-neutral-700 text-neutral-100 placeholder:text-neutral-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30 outline-none transition resize-none h-28"
              placeholder="Optional description"
            />
          </div>

          <label className="flex items-center gap-2 text-sm text-neutral-200">
            <input type="checkbox" {...form.register("is_active")} className="accent-indigo-500 w-4 h-4" />
            <span>Active</span>
          </label>

          <DialogFooter className="flex items-center justify-end gap-3 mt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-neutral-800 text-neutral-300 border border-neutral-700 hover:bg-neutral-700 transition"
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
