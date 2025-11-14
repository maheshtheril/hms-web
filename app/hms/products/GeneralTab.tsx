// app/hms/products/product-editor/GeneralTab.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import apiClient from "@/lib/api-client";
import { useToast } from "@/components/toast/ToastProvider";
import { Loader2, ImageIcon, Sparkles, RefreshCw } from "lucide-react";
import type { ProductDraft } from "./types"; // corrected path

// Zod schema (match canonical ProductDraft shape + tax helpers)
const schema = z.object({
  name: z.string().min(2, "Name is required"),
  sku: z.string().min(1, "SKU required"),
  description: z.string().optional(),
  price: z.number().nonnegative().optional(),
  currency: z.string().optional(),
  is_stockable: z.boolean().optional(),
  // tax fields (local editor convenience)
  tax_percent: z.number().nonnegative().optional(),
  tax_code_id: z.string().optional(),
  tax_inclusive: z.boolean().optional(),
});

type FormValues = z.infer<typeof schema>;

interface Defaults {
  currency?: string;
  tax_inclusive?: boolean;
}

interface Props {
  draft: ProductDraft;
  onChange: (patch: Partial<ProductDraft>) => void;
  onRequestSave?: () => void;
  defaults?: Defaults;
}

export default function GeneralTab({ draft, onChange, onRequestSave, defaults }: Props) {
  const toast = useToast();
  const [taxCodes, setTaxCodes] = useState<Array<{ id: string; code: string; name: string; percent: number }>>([]);
  const [loadingTaxes, setLoadingTaxes] = useState(false);

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
      currency: draft?.currency ?? defaults?.currency ?? "USD",
      is_stockable: draft?.is_stockable ?? true,
      tax_percent: draft?.pricing?.tax_percent ?? undefined,
      tax_code_id: (draft?.metadata?.tax?.code_id as string) ?? undefined,
      tax_inclusive: draft?.metadata?.tax?.inclusive ?? defaults?.tax_inclusive ?? false,
    },
  });

  // load tax codes once
  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoadingTaxes(true);
      try {
        const res = await apiClient.get("/hms/tax-codes");
        if (!mounted) return;
        setTaxCodes(res.data?.data ?? res.data ?? []);
      } catch (e) {
        console.error("load tax codes", e);
      } finally {
        if (mounted) setLoadingTaxes(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  // keep local values synced when parent draft changes (safe)
  useEffect(() => {
    setValue("name", draft?.name ?? "");
    setValue("sku", draft?.sku ?? "");
    setValue("description", draft?.description ?? "");
    setValue("price", draft?.price ?? undefined);
    setValue("currency", draft?.currency ?? defaults?.currency ?? "USD");
    setValue("is_stockable", draft?.is_stockable ?? true);
    setValue("tax_percent", draft?.pricing?.tax_percent ?? draft?.metadata?.tax?.percent ?? undefined);
    setValue("tax_code_id", (draft?.metadata?.tax?.code_id as string) ?? undefined);
    setValue("tax_inclusive", draft?.metadata?.tax?.inclusive ?? defaults?.tax_inclusive ?? false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft?.id]);

  // push changes up to parent draft when fields change
  const watched = watch();
  useEffect(() => {
    const priceVal =
      typeof watched.price === "number" && Number.isFinite(watched.price) ? watched.price : undefined;
    const currencyVal = watched.currency === "" ? undefined : watched.currency ?? undefined;
    const taxPercentVal =
      typeof watched.tax_percent === "number" && Number.isFinite(watched.tax_percent)
        ? watched.tax_percent
        : undefined;

    // Put canonical things in appropriate fields:
    // - price & currency on root
    // - tax_percent into pricing.tax_percent (keeps types consistent)
    // - tax code & inclusive into metadata.tax (flexible extension)
    onChange({
      name: watched.name,
      sku: watched.sku,
      description: watched.description,
      price: priceVal,
      currency: currencyVal,
      is_stockable: watched.is_stockable ?? true,
      pricing: {
        ...(draft.pricing ?? {}),
        tax_percent: taxPercentVal ?? draft.pricing?.tax_percent,
        base_price: draft.pricing?.base_price ?? priceVal,
      },
      metadata: {
        ...(draft.metadata ?? {}),
        tax: {
          ...(draft.metadata?.tax ?? {}),
          code_id: watched.tax_code_id ?? null,
          percent: taxPercentVal ?? null,
          inclusive: watched.tax_inclusive ?? false,
        },
      },
    });
  }, [watched, onChange, draft.pricing, draft.metadata]);

  async function onSubmit(_values: FormValues) {
    try {
      onRequestSave?.();
      toast.info("Saving general info…");
    } catch (err: any) {
      toast.error(err?.message ?? "Save failed");
    }
  }

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
    toast.success("SKU generated");
  }

  async function aiGenerateDescription() {
    const name = watch("name");
    if (!name) return toast.error("Provide a name first");
    try {
      toast.info("Generating description…");
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

  // Simple image uploader stub
  async function uploadImage(file: File) {
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await apiClient.post("/hms/uploads", form, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      const url = res.data?.url ?? res.data?.data?.url;
      if (!url) throw new Error("Upload failed");
      const existing = draft?.images ?? [];
      const next = [...existing, url];
      onChange({ images: next });
      toast.success("Image uploaded");
    } catch (err: any) {
      console.error("uploadImage", err);
      toast.error(err?.message ?? "Upload failed");
    }
  }

  function removeImage(idx: number) {
    const existing = draft?.images ?? [];
    const next = existing.filter((_, i) => i !== idx);
    onChange({ images: next });
  }

  // small helpers
  const selectedTax = useMemo(() => taxCodes.find((t) => t.id === watch("tax_code_id")), [taxCodes, watch("tax_code_id")]);

  return (
    <div className="p-4">
      {/* theme tokens (Neural Glass) */}
      <style>{`
        :root {
          --ng-surface: rgba(255,255,255,0.9);
          --ng-border: rgba(15,23,42,0.06);
          --ng-muted: rgba(15,23,42,0.45);
          --ng-accent-from: #2563eb; /* blue-600 */
          --ng-accent-to: #7c3aed;   /* indigo-600 */
        }
      `}</style>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-12 gap-4 items-start">
          <div className="col-span-9">
            <label className="block text-sm text-slate-700 mb-1">Product name</label>
            <input
              {...register("name")}
              className="w-full rounded-2xl border px-3 py-2 outline-none"
              style={{ background: "var(--ng-surface)", borderColor: "var(--ng-border)" }}
              placeholder="e.g. Premium Cotton T-Shirt"
            />
            {errors.name && <p className="text-xs text-rose-600 mt-1">{errors.name.message}</p>}
          </div>

          <div className="col-span-3">
            <label className="block text-sm text-slate-700 mb-1">SKU</label>
            <div className="flex gap-2">
              <input
                {...register("sku")}
                className="flex-1 rounded-2xl border px-3 py-2 outline-none"
                style={{ background: "var(--ng-surface)", borderColor: "var(--ng-border)" }}
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
            className="w-full rounded-2xl border px-3 py-2 outline-none"
            style={{ background: "var(--ng-surface)", borderColor: "var(--ng-border)" }}
            placeholder="Describe the product benefits..."
          />
          <div className="mt-2 flex items-center gap-2">
            <button
              type="button"
              onClick={aiGenerateDescription}
              className="inline-flex items-center gap-2 px-3 py-1 rounded-xl bg-gradient-to-br"
              style={{ backgroundImage: "linear-gradient(to bottom right, var(--ng-accent-from), var(--ng-accent-to))", color: "white" }}
            >
              <Sparkles className="w-4 h-4" /> AI Suggest
            </button>
            <button
              type="button"
              onClick={() => {
                setValue("description", "", { shouldDirty: true });
                onChange({ description: "" });
              }}
              className="px-3 py-1 rounded-xl border"
            >
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
              className="w-full rounded-2xl px-3 py-2 border outline-none"
              style={{ background: "var(--ng-surface)", borderColor: "var(--ng-border)" }}
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
                <select
                  {...field}
                  className="w-full rounded-2xl px-3 py-2 border outline-none"
                  style={{ background: "var(--ng-surface)", borderColor: "var(--ng-border)" }}
                >
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

        {/* Tax settings */}
        <div className="grid grid-cols-12 gap-4 items-end">
          <div className="col-span-4">
            <label className="block text-sm text-slate-700 mb-1">Tax code</label>
            <Controller
              control={control}
              name="tax_code_id"
              render={({ field }) => (
                <select
                  {...field}
                  className="w-full rounded-2xl px-3 py-2 border outline-none"
                  style={{ background: "var(--ng-surface)", borderColor: "var(--ng-border)" }}
                >
                  <option value="">— None —</option>
                  {loadingTaxes ? <option disabled>Loading…</option> : taxCodes.map((t) => (
                    <option key={t.id} value={t.id}>{t.code} · {t.name} · {t.percent}%</option>
                  ))}
                </select>
              )}
            />
            <div className="text-xs text-slate-500 mt-1">Choose tax code for this product (optional)</div>
          </div>

          <div className="col-span-3">
            <label className="block text-sm text-slate-700 mb-1">Tax %</label>
            <Controller
              control={control}
              name="tax_percent"
              render={({ field }) => (
                <input
                  {...field}
                  type="number"
                  step="0.01"
                  className="w-full rounded-2xl px-3 py-2 border outline-none"
                  style={{ background: "var(--ng-surface)", borderColor: "var(--ng-border)" }}
                />
              )}
            />
            <div className="text-xs text-slate-500 mt-1">Overrides tax code percent if set</div>
          </div>

          <div className="col-span-5 flex items-center gap-4">
            <label className="flex items-center gap-2">
              <input type="checkbox" {...register("tax_inclusive")} className="w-4 h-4" />
              <span className="text-sm text-slate-700">Tax inclusive pricing</span>
            </label>

            <div className="text-xs text-slate-500">
              {watch("tax_inclusive") ? "Displayed prices include tax." : "Displayed prices exclude tax."}
            </div>
          </div>
        </div>

        <div>
          <label className="block text-sm text-slate-700 mb-2">Images</label>
          <div className="flex gap-3 items-center">
            <label className="flex flex-col items-center justify-center w-28 h-20 rounded-xl border-dashed cursor-pointer" style={{ borderColor: "var(--ng-border)", background: "rgba(255,255,255,0.2)" }}>
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
                <div key={i} className="relative w-28 h-20 rounded-xl overflow-hidden border" style={{ borderColor: "var(--ng-border)" }}>
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
          <button
            type="button"
            onClick={() => {
              setValue("name", draft?.name ?? "");
              setValue("sku", draft?.sku ?? "");
            }}
            className="px-4 py-2 rounded-xl border"
          >
            Reset fields
          </button>

          <button
            type="submit"
            disabled={isSubmitting}
            className="px-4 py-2 rounded-xl inline-flex items-center gap-2"
            style={{ backgroundImage: "linear-gradient(to bottom right, var(--ng-accent-from), var(--ng-accent-to))", color: "white" }}
          >
            {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            {isSubmitting ? "Saving…" : isDirty ? "Save" : "Save"}
          </button>
        </div>
      </form>
    </div>
  );
}
