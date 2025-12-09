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

type TaxCode = {
  id: string;
  companyId?: string;
  code?: string;
  name?: string;
  percent?: number;
};

export default function GeneralTab({ draft, onChange, onRequestSave, defaults }: Props) {
  const toast = useToast();
  const { company } = useCompany();

  const [taxCodes, setTaxCodes] = useState<TaxCode[]>([]);
  const [loadingTaxes, setLoadingTaxes] = useState(false);
  const [taxLoadError, setTaxLoadError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
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
    // cancelable with AbortController
    setLoadingTaxes(true);
    setTaxLoadError(null);
    const controller = new AbortController();

    try {
      // Accept both companyId and company_id on server — be forgiving
      const res = await apiClient.get("/hms/tax-codes", {
        params: { companyId: company?.id ?? company?.id, company_id: company?.id },
        withCredentials: true,
        signal: controller.signal,
      });

      // handle server shapes: { items }, { data }, or raw array
      const items =
        (res.data && (res.data.items ?? res.data.data ?? res.data)) ??
        ([] as any[]);

      // normalize percent field
      const normalized = Array.isArray(items)
        ? items.map((t: any) => ({
            id: t.id,
            companyId: t.company_id ?? t.companyId ?? t.company,
            code: t.code ?? t.code,
            name: t.name ?? t.title ?? "",
            percent:
              t.percent ?? t.rate ?? (t.rate_in_percent ? Number(t.rate_in_percent) : undefined) ?? undefined,
          }))
        : [];

      setTaxCodes(normalized);
    } catch (err: any) {
      if (err?.name === "CanceledError" || err?.message === "canceled") {
        // aborted — ignore
        return;
      }

      console.error("load tax codes error:", err?.response?.data ?? err);
      const status = err?.response?.status;
      if (status === 401) setTaxLoadError("auth");
      else if (status === 404) setTaxLoadError("notfound");
      else setTaxLoadError("network");
    } finally {
      setLoadingTaxes(false);
    }
  }

  useEffect(() => {
    // load when company id changes
    if (!company?.id) {
      setTaxCodes([]);
      return;
    }
    let mounted = true;
    (async () => {
      setTaxLoadError(null);
      setLoadingTaxes(true);
      try {
        const res = await apiClient.get("/hms/tax-codes", {
          params: { companyId: company.id },
          withCredentials: true,
        });

        const items = (res.data && (res.data.items ?? res.data.data ?? res.data)) ?? [];
        const normalized = Array.isArray(items)
          ? items.map((t: any) => ({
              id: t.id,
              companyId: t.company_id ?? t.companyId ?? t.company,
              code: t.code ?? "",
              name: t.name ?? "",
              percent: Number(t.percent ?? t.rate ?? t.rate_percent ?? 0),
            }))
          : [];

        if (mounted) setTaxCodes(normalized);
      } catch (err: any) {
        console.error("load tax codes error:", err?.response?.data ?? err);
        const status = err?.response?.status;
        if (status === 401) setTaxLoadError("auth");
        else if (status === 404) setTaxLoadError("notfound");
        else setTaxLoadError("network");
      } finally {
        if (mounted) setLoadingTaxes(false);
      }
    })();

    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [company?.id]);

  /** ---------------- SYNC PARENT DRAFT ------------------ **/
  // Use reset to sync form values when a new draft is loaded
  useEffect(() => {
    reset({
      name: draft?.name ?? "",
      sku: draft?.sku ?? "",
      description: draft?.description ?? "",
      price: draft?.price ?? undefined,
      currency: draft?.currency ?? defaults?.currency ?? "USD",
      is_stockable: draft?.is_stockable ?? true,
      tax_percent: draft?.pricing?.tax_percent ?? draft?.metadata?.tax?.percent ?? undefined,
      tax_code_id: draft?.metadata?.tax?.code_id ?? "",
      tax_inclusive: draft?.metadata?.tax?.inclusive ?? defaults?.tax_inclusive ?? false,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft?.id, draft?.name, draft?.sku, draft?.price, draft?.metadata, draft?.pricing, defaults]);

  /** ---------------- PUSH FORM CHANGES UP ------------------ **/
  const watched = watch();

  useEffect(() => {
    // guard: if watch returns undefined (form not ready) don't push
    if (!watched) return;

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
        base_price: draft.pricing?.base_price ?? (isNaN(p) ? draft.pricing?.base_price : p),
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [watched]);

  /** ---------------- SUBMIT ------------------ **/
  function onSubmit() {
    onRequestSave?.();
    toast.info("Saving general info...");
  }

  /** ---------------- HELPERS ------------------ **/
  function generateSKU() {
    const name = (watch("name") || "").trim();
    const safe = name
      ? name
          .toUpperCase()
          .replace(/[^A-Z0-9]+/g, "-")
          .replace(/^-+|-+$/g, "")
          .slice(0, 12)
      : "PRD";
    const sku = `${safe}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
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

      const text = res.data?.text ?? res.data?.output ?? "";
      if (text) {
        setValue("description", text, { shouldDirty: true });
        onChange({ description: text });
        toast.success("AI description added");
      } else {
        toast.error("AI returned empty text");
      }
    } catch (err) {
      console.error("AI generate error", err);
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

      const url = res.data?.url ?? res.data?.data?.url ?? "";
      const imgs = [...(draft.images ?? []), url];
      onChange({ images: imgs });

      toast.success("Image uploaded");
    } catch (err) {
      console.error("upload image error", err);
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

  /** ---------------- UI (Neural Glass readable) ------------------ **/
  return (
    <div className="p-6">
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="space-y-6 max-w-4xl"
        aria-labelledby="general-tab"
      >
        {/* Glass card wrapper */}
        <div className="p-4 rounded-2xl bg-white/6 backdrop-blur-md border border-white/8 shadow-sm">
          {/* NAME + SKU */}
          <div className="grid grid-cols-12 gap-4">
            <div className="col-span-9">
              <label className="block text-sm font-medium text-white/90">Name</label>
              <input
                {...register("name")}
                className="input mt-1 w-full bg-white/8 text-white placeholder-white/60 border border-white/10"
                placeholder="Product name"
                aria-label="Product name"
              />
            </div>

            <div className="col-span-3">
              <label className="block text-sm font-medium text-white/90">SKU</label>
              <div className="flex gap-2 mt-1">
                <input
                  {...register("sku")}
                  className="input flex-1 bg-white/8 text-white border border-white/10"
                  aria-label="SKU"
                />
                <button
                  type="button"
                  onClick={generateSKU}
                  className="btn px-3 py-1 rounded-lg bg-white/5 hover:bg-white/8 flex items-center gap-2"
                  aria-label="Generate SKU"
                >
                  <RefreshCw className="w-4 h-4 text-white/90" />
                </button>
              </div>
            </div>
          </div>

          {/* DESCRIPTION */}
          <div className="mt-4">
            <label className="block text-sm font-medium text-white/90">Description</label>
            <textarea
              {...register("description")}
              className="input mt-1 w-full bg-white/6 text-white placeholder-white/60 border border-white/10 rounded-md p-2"
              rows={3}
            />

            <div className="flex gap-2 mt-3">
              <button
                type="button"
                onClick={aiGenerateDescription}
                className="btn-ai inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-gradient-to-r from-white/6 to-white/4"
              >
                <Sparkles className="w-4 h-4" /> AI Suggest
              </button>

              <button
                type="button"
                onClick={() => {
                  setValue("description", "");
                  onChange({ description: "" });
                }}
                className="btn-outline px-3 py-1 rounded-lg border border-white/8"
              >
                Clear
              </button>
            </div>
          </div>

          {/* PRICE + CURRENCY */}
          <div className="grid grid-cols-3 gap-4 mt-6">
            <div>
              <label className="block text-sm font-medium text-white/90">Price</label>
              <input
                type="number"
                step="0.01"
                {...register("price")}
                className="input mt-1 bg-white/8 text-white border border-white/10 rounded-md p-2"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-white/90">Currency</label>
              <select
                {...register("currency")}
                className="input mt-1 bg-white/8 text-white border border-white/10 rounded-md p-2"
              >
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
                <option value="INR">INR</option>
              </select>
            </div>

            <div className="flex items-end">
              <label className="flex items-center gap-2 text-white/90">
                <input type="checkbox" {...register("is_stockable")} className="accent-neutral-300" />
                Stockable
              </label>
            </div>
          </div>

          {/* TAX */}
          <div className="grid grid-cols-12 gap-4 mt-6">
            <div className="col-span-4">
              <label className="block text-sm font-medium text-white/90">Tax Code</label>

              <Controller
                control={control}
                name="tax_code_id"
                render={({ field }) => (
                  <select
                    {...field}
                    className="input mt-1 w-full bg-white/8 text-white border border-white/10 rounded-md p-2"
                    disabled={loadingTaxes}
                    aria-label="Tax code"
                  >
                    <option value="">— None —</option>

                    {loadingTaxes ? (
                      <option disabled>Loading…</option>
                    ) : taxCodes.length === 0 && !taxLoadError ? (
                      <option disabled>No tax codes</option>
                    ) : (
                      taxCodes.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.code ?? t.id} · {t.name} · {t.percent ?? ""}%
                        </option>
                      ))
                    )}
                  </select>
                )}
              />

              {taxLoadError && (
                <div className="text-xs text-rose-400 mt-1">
                  Failed to load taxes.{" "}
                  <button
                    className="underline"
                    onClick={loadTaxCodes}
                    type="button"
                    aria-label="Retry loading taxes"
                  >
                    Retry
                  </button>
                </div>
              )}
            </div>

            <div className="col-span-3">
              <label className="block text-sm font-medium text-white/90">Tax %</label>
              <input
                type="number"
                step="0.01"
                {...register("tax_percent")}
                className="input mt-1 bg-white/8 text-white border border-white/10 rounded-md p-2"
              />
            </div>

            <div className="col-span-5 flex items-end">
              <label className="flex items-center gap-2 text-white/90">
                <input type="checkbox" {...register("tax_inclusive")} className="accent-neutral-300" />
                Tax Inclusive
              </label>
            </div>
          </div>

          {/* IMAGES */}
          <div className="mt-6">
            <label className="block text-sm font-medium text-white/90">Images</label>
            <div className="flex gap-3 mt-2">
              <label className="upload-box inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-white/6 border border-white/8 cursor-pointer">
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) uploadImage(f);
                  }}
                />
                <ImageIcon className="w-5 h-5" />
                Upload
              </label>

              <div className="flex gap-2 overflow-x-auto">
                {(draft.images ?? []).map((url, i) => (
                  <div
                    key={i}
                    className="image-box relative w-24 h-24 rounded-md overflow-hidden bg-white/6 border border-white/6"
                  >
                    <img src={url} className="object-cover w-full h-full" alt={`product-${i}`} />
                    <button
                      onClick={() => removeImage(i)}
                      className="remove-btn absolute top-1 right-1 bg-black/40 text-white rounded-full w-6 h-6 flex items-center justify-center"
                      aria-label={`Remove image ${i + 1}`}
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* SAVE */}
          <div className="flex justify-end gap-3 mt-6">
            <button
              type="submit"
              className="btn-primary inline-flex items-center gap-2 rounded-lg px-4 py-2 bg-gradient-to-r from-white/8 to-white/5"
              disabled={isSubmitting}
            >
              {isSubmitting ? <Loader2 className="animate-spin w-4 h-4" /> : <RefreshCw className="w-4 h-4" />}
              Save
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
