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

  useEffect(() => {
    if (open) {
      form.reset({
        name: source?.name ?? "",
        description: source?.description ?? "",
        is_active: source?.is_active ?? true,
      });
      // Use RHF's setFocus instead of a local ref to avoid ref conflicts
      setTimeout(() => form.setFocus("name"), 50);
    }
  }, [open, source, form]);

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
      <div
        className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
        onMouseDown={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      />
      <DialogContent
        role="dialog"
        aria-modal="true"
        aria-label={source ? "Edit Source" : "Create Source"}
        className="fixed left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2 w-[520px]"
      >
        <DialogHeader>
          <DialogTitle>{source ? "Edit Source" : "Create Source"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 mt-3">
          <div>
            <Label required>Name</Label>
            <input
              {...form.register("name")}
              className="mt-1 w-full p-2 rounded bg-white/6 text-slate-100 border border-white/10"
              placeholder="Source name"
            />
            {form.formState.errors.name && (
              <p className="text-xs text-red-400 mt-1">{String(form.formState.errors.name.message)}</p>
            )}
          </div>

          <div>
            <Label>Description</Label>
            <textarea
              {...form.register("description")}
              className="mt-1 w-full p-2 rounded bg-white/6 text-slate-100 border border-white/10"
              placeholder="Optional description"
            />
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" {...form.register("is_active")} className="accent-indigo-500 w-4 h-4" />
            <span>Active</span>
          </label>

          <DialogFooter className="flex justify-end gap-3 mt-4">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded bg-white/10">
              Cancel
            </button>

            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 rounded bg-gradient-to-r from-indigo-500 to-violet-500 text-white"
            >
              {saving ? "Saving..." : "Save"}
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </>
  );
}
