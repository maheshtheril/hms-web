// app/hms/products/product-editor/GeneralTab.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import apiClient from "@/lib/api-client";
import { useToast } from "@/components/toast/ToastProvider";
import { Loader2, ImageIcon, Sparkles, RefreshCw } from "lucide-react";
import { useCompany } from "@/app/providers/CompanyProvider";
import type { ProductDraft } from "./types";

interface Props {
  draft: ProductDraft;
  onChange: (patch: Partial<ProductDraft>) => void;
  onRequestSave?: () => void;
  defaults?: { currency?: string; tax_inclusive?: boolean };
}

export default function GeneralTab({ draft, onChange, onRequestSave, defaults }: Props) {
  const toast = useToast();
  const { company } = useCompany();

  const [taxCodes, setTaxCodes] = useState<any[]>([]);
  const [loadingTaxes, setLoadingTaxes] = useState(false);
  const [taxLoadError, setTaxLoadError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    control,
    formState: { isSubmitting, isDirty },
  } = useForm({
    defaultValues: {
      name: draft?.name ?? "",
      sku: draft?.sku ?? "",
      description: draft?.description ?? "",
      price: draft?.price ?? undefined,
      currency: draft?.currency ?? defaults?.currency ?? "USD",
      is_stockable: draft?.is_stockable ?? true,
      tax_percent: draft?.pricing?.tax_percent ?? undefined,
      tax_code_id: draft?.metadata?.tax?.code_id ?? "",
      tax_inclusive: draft?.metadata?.tax?.inclusive ?? defaults?.tax_inclusive ?? false,
    },
  });

  const taxCodeId = watch("tax_code_id");

  /** ---------------- TAX LOADING ------------------ **/
  async function loadTaxCodes() {
    setLoadingTaxes(true);
    setTaxLoadError(null);

    try {
      const res = await apiClient.get("/hms/tax-codes", {
        params: { company_id: company?.id },
        withCredentials: true,
      });

      setTaxCodes(res.data?.data ?? []);
    } catch (err: any) {
      console.error("load tax codes error:", err?.response?.data);
      const status = err?.response?.status;

      if (status === 401) setTaxLoadError("auth");
      else if (status === 404) setTaxLoadError("notfound");
      else setTaxLoadError("network");
    } finally {
      setLoadingTaxes(false);
    }
  }

  useEffect(() => {
    loadTaxCodes();
  }, [company?.id]);

  /** ---------------- SYNC PARENT DRAFT ------------------ **/
  useEffect(() => {
    setValue("name", draft?.name ?? "");
    setValue("sku", draft?.sku ?? "");
    setValue("description", draft?.description ?? "");
    setValue("price", draft?.price ?? undefined);
    setValue("currency", draft?.currency ?? defaults?.currency ?? "USD");
    setValue("is_stockable", draft?.is_stockable ?? true);

    setValue("tax_percent", draft?.pricing?.tax_percent ?? draft?.metadata?.tax?.percent ?? undefined);
    setValue("tax_code_id", draft?.metadata?.tax?.code_id ?? "");
    setValue("tax_inclusive", draft?.metadata?.tax?.inclusive ?? defaults?.tax_inclusive ?? false);
  }, [draft?.id]);

  /** ---------------- PUSH FORM CHANGES UP ------------------ **/
  const watched = watch();

  useEffect(() => {
    const p = Number(watched.price);
    const tp = Number(watched.tax_percent);

    onChange({
      name: watched.name,
      sku: watched.sku,
      description: watched.description,
      price: isNaN(p) ? undefined : p,
      currency: watched.currency || undefined,
      is_stockable: watched.is_stockable ?? true,
      pricing: {
        ...(draft.pricing ?? {}),
        tax_percent: isNaN(tp) ? undefined : tp,
        base_price: draft.pricing?.base_price ?? p,
      },
      metadata: {
        ...(draft.metadata ?? {}),
        tax: {
          ...(draft.metadata?.tax ?? {}),
          code_id: watched.tax_code_id || null,
          percent: isNaN(tp) ? null : tp,
          inclusive: watched.tax_inclusive ?? false,
        },
      },
    });
  }, [watched]);

  /** ---------------- SUBMIT ------------------ **/
  function onSubmit() {
    onRequestSave?.();
    toast.info("Saving general info...");
  }

  /** ---------------- HELPERS ------------------ **/
  function generateSKU() {
    const name = (watch("name") || "").trim();
    const base = name
      ? name.toUpperCase().replace(/[^A-Z0-9]+/g, "-").slice(0, 12)
      : "PRD";

    const sku = `${base}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
    setValue("sku", sku, { shouldDirty: true });
    toast.success("SKU generated");
  }

  async function aiGenerateDescription() {
    const name = watch("name");
    if (!name) return toast.error("Enter a product name");

    toast.info("Generating description...");
    try {
      const res = await apiClient.post("/hms/ai/generate", {
        prompt: `Write a short product description for: ${name}`,
      });

      const text = res.data?.text ?? "";
      if (text) {
        setValue("description", text, { shouldDirty: true });
        onChange({ description: text });
        toast.success("AI description added");
      }
    } catch (err) {
      toast.error("AI error");
    }
  }

  /** ---------------- IMAGES ------------------ **/
  async function uploadImage(file: File) {
    try {
      const form = new FormData();
      form.append("file", file);

      const res = await apiClient.post("/hms/uploads", form, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      const url = res.data?.url ?? "";
      const imgs = [...(draft.images ?? []), url];
      onChange({ images: imgs });

      toast.success("Image uploaded");
    } catch {
      toast.error("Upload failed");
    }
  }

  function removeImage(idx: number) {
    const imgs = draft.images?.filter((_, i) => i !== idx) ?? [];
    onChange({ images: imgs });
  }

  const selectedTax = useMemo(
    () => taxCodes.find((t) => t.id === taxCodeId),
    [taxCodes, taxCodeId]
  );

  /** ---------------- UI ------------------ **/
  return (
    <div className="p-4">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* NAME + SKU */}
        <div className="grid grid-cols-12 gap-4">
          <div className="col-span-9">
            <label>Name</label>
            <input {...register("name")} className="input" placeholder="Product name" />
          </div>

          <div className="col-span-3">
            <label>SKU</label>
            <div className="flex gap-2">
              <input {...register("sku")} className="input" />
              <button type="button" onClick={generateSKU} className="btn">
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* DESCRIPTION */}
        <div>
          <label>Description</label>
          <textarea {...register("description")} className="input" rows={3} />

          <div className="flex gap-2 mt-2">
            <button type="button" onClick={aiGenerateDescription} className="btn-ai">
              <Sparkles className="w-4 h-4" /> AI Suggest
            </button>

            <button
              type="button"
              onClick={() => {
                setValue("description", "");
                onChange({ description: "" });
              }}
              className="btn-outline"
            >
              Clear
            </button>
          </div>
        </div>

        {/* PRICE + CURRENCY */}
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label>Price</label>
            <input type="number" step="0.01" {...register("price")} className="input" />
          </div>

          <div>
            <label>Currency</label>
            <select {...register("currency")} className="input">
              <option>USD</option>
              <option>EUR</option>
              <option>INR</option>
            </select>
          </div>

          <div className="flex items-end">
            <label className="flex items-center gap-2">
              <input type="checkbox" {...register("is_stockable")} />
              Stockable
            </label>
          </div>
        </div>

        {/* TAX */}
        <div className="grid grid-cols-12 gap-4">
          <div className="col-span-4">
            <label>Tax Code</label>

            <Controller
              control={control}
              name="tax_code_id"
              render={({ field }) => (
                <select {...field} className="input">
                  <option value="">— None —</option>

                  {loadingTaxes ? (
                    <option disabled>Loading…</option>
                  ) : (
                    taxCodes.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.code} · {t.name} · {t.percent}%
                      </option>
                    ))
                  )}
                </select>
              )}
            />

            {taxLoadError && (
              <div className="text-xs text-red-600 mt-1">
                Failed to load taxes.{" "}
                <button className="underline" onClick={loadTaxCodes} type="button">
                  Retry
                </button>
              </div>
            )}
          </div>

          <div className="col-span-3">
            <label>Tax %</label>
            <input type="number" step="0.01" {...register("tax_percent")} className="input" />
          </div>

          <div className="col-span-5 flex items-end">
            <label className="flex items-center gap-2">
              <input type="checkbox" {...register("tax_inclusive")} />
              Tax Inclusive
            </label>
          </div>
        </div>

        {/* IMAGES */}
        <label>Images</label>
        <div className="flex gap-3">
          <label className="upload-box">
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) uploadImage(f);
              }}
            />
            <ImageIcon className="w-6 h-6" />
            Upload
          </label>

          <div className="flex gap-2 overflow-x-auto">
            {(draft.images ?? []).map((url, i) => (
              <div key={i} className="image-box">
                <img src={url} className="object-cover w-full h-full" />
                <button onClick={() => removeImage(i)} className="remove-btn">
                  ✕
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* SAVE. */}
        <div className="flex justify-end gap-3">
          <button type="submit" className="btn-primary" disabled={isSubmitting}>
            {isSubmitting ? <Loader2 className="animate-spin w-4 h-4" /> : <RefreshCw className="w-4 h-4" />}
            Save
          </button>
        </div>
      </form>
    </div>
  );
}
