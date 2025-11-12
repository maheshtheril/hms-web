// app/hms/products/product-editor/GeneralTab.tsx
"use client";

import React, { useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import apiClient from "@/lib/api-client";
import { useToast } from "@/components/toast/ToastProvider";
import { Loader2, ImageIcon, Sparkles, RefreshCw } from "lucide-react";

type ProductDraft = {
  id?: string;
  name?: string;
  sku?: string;
  description?: string;
  price?: number | null;
  currency?: string | null;
  is_stockable?: boolean;
  metadata?: Record<string, any> | null;
  images?: string[]; // URLs
};

const schema = z.object({
  name: z.string().min(2, "Name is required"),
  sku: z.string().min(1, "SKU required"),
  description: z.string().optional(),
  price: z.number().nonnegative().optional().nullable(),
  currency: z.string().optional().nullable(),
  is_stockable: z.boolean().optional(),
});

type FormValues = z.infer<typeof schema>;

interface Props {
  draft: ProductDraft;
  onChange: (patch: Partial<ProductDraft>) => void;
  onRequestSave?: () => void;
}

export default function GeneralTab({ draft, onChange, onRequestSave }: Props) {
  const toast = useToast();

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    control,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: draft?.name ?? "",
      sku: draft?.sku ?? "",
      description: draft?.description ?? "",
      price: draft?.price ?? undefined,
      currency: draft?.currency ?? "USD",
      is_stockable: draft?.is_stockable ?? true,
    },
  });

  // keep local values synced when outer draft changes (e.g. load)
  useEffect(() => {
    setValue("name", draft?.name ?? "");
    setValue("sku", draft?.sku ?? "");
    setValue("description", draft?.description ?? "");
    setValue("price", draft?.price ?? undefined);
    setValue("currency", draft?.currency ?? "USD");
    setValue("is_stockable", draft?.is_stockable ?? true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft?.id]);

  // push changes up to parent draft when fields change
  const watched = watch();
  useEffect(() => {
    // minimal patch — only fields we care about
    onChange({
      name: watched.name,
      sku: watched.sku,
      description: watched.description,
      price: watched.price ?? null,
      currency: watched.currency ?? "USD",
      is_stockable: watched.is_stockable ?? true,
    });
  }, [watched, onChange]);

  async function onSubmit(values: FormValues) {
    // parent handles save; optionally trigger parent save
    try {
      onRequestSave?.();
      toast.info("Saving general info…");
    } catch (err: any) {
      toast.error(err?.message ?? "Save failed");
    }
  }

  // SKU generator (opinionated best practice): name-based + random suffix
  function generateSKU() {
    const name = (watch("name") || "").trim();
    const base = name
      ? name
          .toUpperCase()
          .replace(/[^A-Z0-9]+/g, "-")
          .replace(/(^-|-$)+/g, "")
          .slice(0, 12)
      : "PRD";
    const suffix = Math.random().toString(36).slice(2, 6).toUpperCase();
    const sku = `${base}-${suffix}`;
    setValue("sku", sku, { shouldDirty: true, shouldValidate: true });
    toast.success("SKU generated", "Generated");
  }

  // AI description helper (calls backend API that proxies OpenAI or your AI service)
  async function aiGenerateDescription() {
    const name = watch("name");
    if (!name) return toast.error("Provide a name first");
    try {
      toast.info("Generating description…");
      // NOTE: implement backend endpoint /hms/ai/generate (POST) that accepts { prompt, maxTokens } and returns { text }
      const res = await apiClient.post("/hms/ai/generate", {
        prompt: `Write a concise, SEO-friendly product description for: ${name}. Keep it 1-2 sentences, emphasize use cases and benefits.`,
        max_tokens: 120,
      });
      const text = res.data?.text ?? res.data?.result ?? "";
      if (text) {
        setValue("description", text, { shouldDirty: true });
        onChange({ description: text });
        toast.success("AI description added");
      } else {
        toast.error("AI returned no text");
      }
    } catch (err: any) {
      console.error("aiGenerateDescription", err);
      toast.error(err?.message ?? "AI generation failed");
    }
  }

  // Simple image uploader stub: you should wire to your actual storage API
  async function uploadImage(file: File) {
    try {
      const form = new FormData();
      form.append("file", file);
      // backend should return { url }
      const res = await apiClient.post("/hms/uploads", form, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      const url = res.data?.url ?? res.data?.data?.url;
      if (!url) throw new Error("Upload failed");
      // update draft images
      const existing = draft?.images ?? [];
      const next = [...existing, url];
      onChange({ images: next });
      toast.success("Image uploaded");
    } catch (err: any) {
      console.error("uploadImage", err);
      toast.error(err?.message ?? "Upload failed");
    }
  }

  // remove image
  function removeImage(idx: number) {
    const existing = draft?.images ?? [];
    const next = existing.filter((_, i) => i !== idx);
    onChange({ images: next });
  }

  return (
    <div className="p-4">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-12 gap-4 items-start">
          <div className="col-span-9">
            <label className="block text-sm text-slate-700 mb-1">Product name</label>
            <input
              {...register("name")}
              className="w-full rounded-2xl border border-white/20 bg-white/60 px-3 py-2 outline-none focus:ring-2 focus:ring-blue-300"
              placeholder="e.g. Premium Cotton T-Shirt"
            />
            {errors.name && <p className="text-xs text-rose-600 mt-1">{errors.name.message}</p>}
          </div>

          <div className="col-span-3">
            <label className="block text-sm text-slate-700 mb-1">SKU</label>
            <div className="flex gap-2">
              <input
                {...register("sku")}
                className="flex-1 rounded-2xl border border-white/20 bg-white/60 px-3 py-2 outline-none"
                placeholder="SKU"
              />
              <button type="button" onClick={generateSKU} className="px-3 py-2 rounded-2xl bg-slate-800 text-white">
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
            {errors.sku && <p className="text-xs text-rose-600 mt-1">{errors.sku.message}</p>}
          </div>
        </div>

        <div>
          <label className="block text-sm text-slate-700 mb-1">Short description</label>
          <textarea
            {...register("description")}
            rows={3}
            className="w-full rounded-2xl border border-white/20 bg-white/60 px-3 py-2 outline-none focus:ring-2 focus:ring-blue-300"
            placeholder="Describe the product benefits..."
          />
          <div className="mt-2 flex items-center gap-2">
            <button type="button" onClick={aiGenerateDescription} className="inline-flex items-center gap-2 px-3 py-1 rounded-xl bg-gradient-to-br from-indigo-600 to-blue-600 text-white text-sm">
              <Sparkles className="w-4 h-4" /> AI Suggest
            </button>
            <button type="button" onClick={() => { setValue("description", "", { shouldDirty: true }); onChange({ description: "" }); }} className="px-3 py-1 rounded-xl border text-sm">
              Clear
            </button>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-sm text-slate-700 mb-1">Price</label>
            <input
              type="number"
              step="0.01"
              {...register("price", { valueAsNumber: true })}
              className="w-full rounded-2xl border border-white/20 bg-white/60 px-3 py-2 outline-none"
              placeholder="0.00"
            />
            {errors.price && <p className="text-xs text-rose-600 mt-1">{errors.price.message}</p>}
          </div>

          <div>
            <label className="block text-sm text-slate-700 mb-1">Currency</label>
            <Controller
              control={control}
              name="currency"
              render={({ field }) => (
                <select {...field} className="w-full rounded-2xl border border-white/20 bg-white/60 px-3 py-2 outline-none">
                  <option value="USD">USD</option>
                  <option value="EUR">EUR</option>
                  <option value="INR">INR</option>
                </select>
              )}
            />
          </div>

          <div className="flex items-end">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input type="checkbox" {...register("is_stockable")} className="w-4 h-4" />
              <span className="text-sm text-slate-700">Stockable</span>
            </label>
          </div>
        </div>

        <div>
          <label className="block text-sm text-slate-700 mb-2">Images</label>
          <div className="flex gap-3 items-center">
            <label className="flex flex-col items-center justify-center w-28 h-20 rounded-xl border border-dashed border-white/20 bg-white/30 cursor-pointer">
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) uploadImage(f);
                }}
              />
              <ImageIcon className="w-6 h-6 text-slate-700" />
              <span className="text-xs text-slate-600 mt-1">Upload</span>
            </label>

            <div className="flex gap-2 overflow-x-auto">
              {(draft?.images ?? []).map((url, i) => (
                <div key={i} className="relative w-28 h-20 rounded-xl overflow-hidden border">
                  <img src={url} alt={`img-${i}`} className="object-cover w-full h-full" />
                  <button
                    onClick={() => removeImage(i)}
                    className="absolute top-1 right-1 p-1 rounded-full bg-white/60 text-rose-600"
                    aria-label="remove image"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3">
          <button type="button" onClick={() => { setValue("name", draft?.name ?? ""); setValue("sku", draft?.sku ?? ""); }} className="px-4 py-2 rounded-xl border">
            Reset fields
          </button>

          <button type="submit" disabled={isSubmitting} className="px-4 py-2 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white inline-flex items-center gap-2">
            {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            {isSubmitting ? "Saving…" : (isDirty ? "Save" : "Save")}
          </button>
        </div>
      </form>
    </div>
  );
}
