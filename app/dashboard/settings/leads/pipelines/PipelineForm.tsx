"use client";
import React, { useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import apiClient from "@/lib/api-client";
import { Pipeline } from "./PipelineList";

const Schema = z.object({
  name: z.string().min(2, "Name is required"),
  description: z.string().optional().nullable(),
  is_active: z.boolean().optional(),
});
type FormData = z.infer<typeof Schema>;

export default function PipelineForm({
  open,
  onOpenChange,
  pipeline,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pipeline?: Pipeline | null;
}) {
  const { toast } = useToast();
  const qc = useQueryClient();

  const form = useForm<FormData>({
    resolver: zodResolver(Schema),
    defaultValues: {
      name: pipeline?.name ?? "",
      description: pipeline?.description ?? "",
      is_active: pipeline?.is_active ?? true,
    },
  });

  useEffect(() => {
    form.reset({
      name: pipeline?.name ?? "",
      description: pipeline?.description ?? "",
      is_active: pipeline?.is_active ?? true,
    });
  }, [pipeline]);

  const saveMut = useMutation({
    mutationFn: async (data: FormData) => {
      const payload = { ...data };
      if (pipeline?.id) {
        await apiClient.put(`/leads/pipelines/${pipeline.id}`, payload);
      } else {
        await apiClient.post(`/leads/pipelines`, payload);
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pipelines"] });
      toast({
        title: pipeline ? "Updated" : "Created",
        description: pipeline
          ? "Pipeline updated successfully."
          : "Pipeline created successfully.",
      });
      onOpenChange(false);
    },
    onError: (err: any) =>
      toast({
        title: "Error",
        description: err?.message ?? "Save failed.",
        variant: "destructive",
      }),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-lg backdrop-blur-xl bg-white/50 border border-white/10 shadow-xl"
        aria-label={pipeline ? "Edit Pipeline" : "Create Pipeline"}
      >
        <DialogHeader>
          <DialogTitle>{pipeline ? "Edit Pipeline" : "Create Pipeline"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={form.handleSubmit((d) => saveMut.mutate(d))} className="space-y-4 mt-2">
          <div>
            <Label>Name</Label>
            <Input {...form.register("name")} placeholder="Pipeline name" />
            {form.formState.errors.name && (
              <p className="text-xs text-red-600 mt-1">
                {form.formState.errors.name.message}
              </p>
            )}
          </div>

          <div>
            <Label>Description</Label>
            <Textarea {...form.register("description")} rows={3} placeholder="Short description" />
          </div>

          <div className="flex items-center gap-2">
            <input type="checkbox" {...form.register("is_active")} id="is_active" />
            <label htmlFor="is_active" className="text-sm">
              Active
            </label>
          </div>

          <DialogFooter className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saveMut.isPending}>
              {saveMut.isPending ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
