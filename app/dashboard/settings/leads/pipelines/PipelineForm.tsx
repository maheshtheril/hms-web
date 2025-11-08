"use client";
import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

export default function PipelineForm({
  pipeline,
  onClose,
}: {
  pipeline?: any;
  onClose: () => void;
}) {
  const [name, setName] = useState(pipeline?.name ?? "");
  const [description, setDescription] = useState(pipeline?.description ?? "");
  const [isActive, setIsActive] = useState(pipeline?.is_active ?? true);
  const [saving, setSaving] = useState(false);
  const [open, setOpen] = useState(true);

  useEffect(() => setOpen(true), []);

  async function save() {
    setSaving(true);
    try {
      const payload = { name, description, is_active: isActive };
      const url = pipeline
        ? `/api/leads/pipelines/${pipeline.id}`
        : `/api/leads/pipelines`;
      const method = pipeline ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(await res.text());
      onClose();
    } catch (e) {
      alert("Error saving pipeline");
      console.error(e);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40" />
      <DialogContent className="fixed left-1/2 top-1/2 z-50 w-[420px] -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-white/20 shadow-2xl p-6 text-slate-900 dark:text-slate-100">
        <DialogHeader>
          <DialogTitle>{pipeline ? "Edit Pipeline" : "Create Pipeline"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          <div>
            <Label required>Name</Label>
            <input
              className="mt-1 w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white/70 dark:bg-slate-800/70 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Pipeline name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div>
            <Label>Description</Label>
            <textarea
              className="mt-1 w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white/70 dark:bg-slate-800/70 px-3 py-2 min-h-[90px] focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Short description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
            />
            <span>Active</span>
          </label>
        </div>

        <DialogFooter>
          <Button
            variant="ghost"
            type="button"
            onClick={onClose}
            className="hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={saving}
            onClick={save}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            {saving ? "Saving..." : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
