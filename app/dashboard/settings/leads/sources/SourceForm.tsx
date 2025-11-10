// app/components/leads/SourceForm.tsx
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

const Schema = z.object({
  key: z.string().min(1),
  name: z.string().min(2),
  description: z.string().optional(),
  is_active: z.boolean().optional(),
});
type FormData = z.infer<typeof Schema>;

/** Helper: react-query v4/v5 compatible loading checker */
function isMutationLoading(mut: any) {
  return Boolean(mut?.isLoading ?? mut?.isPending ?? mut?.status === "loading");
}

/** Turn a name into a reasonable KEY: uppercase, letters/numbers/_ only */
function makeKeyFromName(name: string) {
  return (
    name
      .trim()
      .replace(/[^a-zA-Z0-9]+/g, "_") // non-alnum -> underscore
      .replace(/^_+|_+$/g, "") // trim underscores
      .toUpperCase() || ""
  );
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
  const [keyTouched, setKeyTouched] = useState(false);
  const keyTouchedRef = useRef(false);

  const form = useForm<FormData>({
    resolver: zodResolver(Schema),
    defaultValues: { key: "", name: "", description: "", is_active: true },
  });

  // useWatch for the name field only (prevents infinite watch->setValue loops)
  const watchedName = useWatch({ control: form.control, name: "name" });

  // sync form when modal opens or source changes
  useEffect(() => {
    if (open) {
      const initialKey = source?.key ?? "";
      form.reset({
        key: initialKey,
        name: source?.name ?? "",
        description: source?.description ?? "",
        is_active: source?.is_active ?? true,
      });
      keyTouchedRef.current = Boolean(initialKey); // if source has key, treat it as touched
      setKeyTouched(Boolean(initialKey));
      // slight delay to ensure DOM mounted
      setTimeout(() => form.setFocus("name"), 50);
    } else {
      // reset touched tracker when closed
      keyTouchedRef.current = false;
      setKeyTouched(false);
      // also reset the form to defaults to avoid stale values when reopened blank
      form.reset({ key: "", name: "", description: "", is_active: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, source]);

  // auto-generate key from name until user edits key
  useEffect(() => {
    if (keyTouchedRef.current) return; // user already edited key — don't auto-change
    const gen = makeKeyFromName(String(watchedName ?? ""));
    const currentKey = form.getValues("key") ?? "";
    if (currentKey !== gen) {
      // only update if different — prevents feedback loop
      form.setValue("key", gen, { shouldTouch: false, shouldDirty: true });
    }
    // intentionally only depends on watchedName
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [watchedName]);

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
      // IMPORTANT: apiClient must include credentials (cookies). If it doesn't,
      // replace with fetch(..., { credentials: "include" })
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
    onError: (err: any) => {
      // Try to show helpful server-side error messages
      const serverMessage =
        err?.response?.data?.error ??
        err?.response?.data?.message ??
        err?.message ??
        String(err);
      // if details provided, include them
      const details = err?.response?.data?.details ? JSON.stringify(err.response.data.details) : undefined;
      toast({
        title: "Error",
        description: details ? `${serverMessage} — ${details}` : serverMessage,
        variant: "destructive",
      });
    },
  });

  function onSubmit(data: FormData) {
    // ensure key normalized to upper-case (server also normalizes)
    const payload = {
      ...data,
      key: (data.key ?? "").toString().trim().toUpperCase(),
    };
    saveMut.mutate(payload);
  }

  const saving = isMutationLoading(saveMut);

  // handlers
  const onKeyChange = (val: string) => {
    keyTouchedRef.current = true;
    setKeyTouched(true);
    // only set when value actually differs
    if (form.getValues("key") !== val) {
      form.setValue("key", val, { shouldTouch: true, shouldDirty: true });
    }
  };

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
            <Label className="text-sm text-neutral-200">
              Key / Code <span className="text-rose-500">*</span>
            </Label>
            <input
              {...form.register("key")}
              onChange={(e) => onKeyChange(e.target.value)}
              className="mt-1 w-full p-3 rounded-lg bg-neutral-800/50 border border-neutral-700 text-neutral-100 placeholder:text-neutral-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30 outline-none transition"
              placeholder="Unique key (e.g. WEB_FORM)"
              autoComplete="off"
            />
            {form.formState.errors.key && (
              <p className="text-xs text-rose-400 mt-1">{String(form.formState.errors.key.message)}</p>
            )}
            <p className="text-xs text-neutral-400 mt-1">Automatically generated from name unless edited.</p>
          </div>

          <div>
            <Label className="text-sm text-neutral-200">
              Name <span className="text-rose-500">*</span>
            </Label>
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
