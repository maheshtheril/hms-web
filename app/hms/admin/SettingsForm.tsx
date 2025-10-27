"use client";

import React, { useEffect, useState, useRef } from "react";
import { useForm } from "react-hook-form";
import { motion } from "framer-motion";

/**
 * app/hms/admin/SettingsForm.tsx
 * -------------------------------------
 * - Neural Glass Design Language (frosted background, soft shadows, rounded 2xl)
 * - Uses react-hook-form for validation & state
 * - Expects GET /api/hms/settings and POST /api/hms/settings (or adjust URLs)
 * - Includes logo upload (client preview) — sends as base64 in JSON by default
 * - Designed for multi-tenant integration (insert auth headers where needed)
 */

/* ---------------------------- Types ---------------------------- */
type SettingsFormValues = {
  hospital_name: string;
  timezone: string;
  contact_email?: string;
  default_currency: string;
  billing_enabled: boolean;
  default_room_rate: number | null;
  logo_base64?: string | null;
};

const COMMON_TIMEZONES = [
  "UTC",
  "Asia/Kolkata",
  "Asia/Kolkata",
  "America/New_York",
  "Europe/London",
  "Europe/Berlin",
  "Asia/Singapore",
  "Australia/Sydney",
  "Asia/Tokyo",
];

const COMMON_CURRENCIES = ["USD", "EUR", "INR", "GBP", "SGD", "AUD", "JPY"];

/* ------------------------- Glass container ----------------------- */
function GlassPanel({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="backdrop-blur-xl bg-white/[0.03] border border-white/10 rounded-2xl shadow-[0_12px_50px_-12px_rgba(0,0,0,0.65)]">
      <div className="p-6 border-b border-white/6">
        <h3 className="text-lg font-semibold text-white/90">{title}</h3>
        {subtitle && <p className="text-sm text-white/50 mt-1">{subtitle}</p>}
      </div>
      <div className="p-6">{children}</div>
    </div>
  );
}

/* --------------------------- Helpers ---------------------------- */
async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => resolve(String(fr.result));
    fr.onerror = (e) => reject(e);
    fr.readAsDataURL(file);
  });
}

/* -------------------------- Component --------------------------- */
export default function HmsSettingsForm() {
  const {
    register,
    handleSubmit,
    setValue,
    reset,
    watch,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<SettingsFormValues>({
    defaultValues: {
      hospital_name: "",
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
      contact_email: "",
      default_currency: "USD",
      billing_enabled: true,
      default_room_rate: 0,
      logo_base64: null,
    },
  });

  const [loaded, setLoaded] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const logoBase64 = watch("logo_base64");
  const hospitalName = watch("hospital_name");

  useEffect(() => {
    if (logoBase64) setLogoPreview(logoBase64);
  }, [logoBase64]);

  /* ------------------- Load settings from API ------------------- */
  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const res = await fetch("/api/hms/settings", {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            // Add tenant/auth headers here if required:
            // "Authorization": `Bearer ${token}`,
            // "X-Tenant-ID": tenantId,
          },
        });

        if (!res.ok) {
          // 404 may be expected for first-time setups
          if (res.status === 404) {
            setLoaded(true);
            return;
          }
          throw new Error(`Failed to load settings (${res.status})`);
        }

        const json = await res.json();
        if (!mounted) return;

        // Normalize server response keys to our form keys if needed
        const payload: Partial<SettingsFormValues> = {
          hospital_name: json.hospital_name ?? json.hms_name ?? "",
          timezone: json.timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone,
          contact_email: json.contact_email ?? json.email ?? "",
          default_currency: json.default_currency ?? "USD",
          billing_enabled: typeof json.billing_enabled === "boolean" ? json.billing_enabled : true,
          default_room_rate: json.default_room_rate != null ? Number(json.default_room_rate) : 0,
          logo_base64: json.logo_base64 ?? json.logo ?? null,
        };

        reset(payload as SettingsFormValues, { keepDefaultValues: false });
        if (payload.logo_base64) setLogoPreview(payload.logo_base64);
      } catch (err: any) {
        console.error("Load settings error:", err);
        if (mounted) setErrorMsg("Failed to load settings. Check console.");
      } finally {
        if (mounted) setLoaded(true);
      }
    };

    load();
    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reset]);

  /* --------------------------- Submit --------------------------- */
  async function onSubmit(values: SettingsFormValues) {
    setErrorMsg(null);
    try {
      // Trim some fields for cleanliness
      const payload = {
        ...values,
        hospital_name: values.hospital_name?.trim(),
        contact_email: values.contact_email?.trim() || null,
        default_currency: values.default_currency?.trim() || "USD",
        default_room_rate: values.default_room_rate ?? 0,
      };

      // Some backends prefer multipart/form-data for files; here we send JSON with base64 logo
      const res = await fetch("/api/hms/settings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          // Add auth/tenant headers here
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const txt = await res.text().catch(() => null);
        throw new Error(txt || `Save failed (${res.status})`);
      }

      const json = await res.json();
      setLastSavedAt(new Date().toISOString());

      // reset form pristine state while keeping values
      reset({ ...values }, { keepDefaultValues: true });
      // optionally show toast (integrate sonner/toast lib)
    } catch (err: any) {
      console.error("Save settings error:", err);
      setErrorMsg(err?.message ?? "Unable to save settings");
      throw err;
    }
  }

  /* -------------------------- Logo handlers -------------------------- */
  async function handleLogoFile(file?: File) {
    try {
      if (!file) {
        setLogoPreview(null);
        setValue("logo_base64", null, { shouldDirty: true });
        return;
      }
      const b64 = await fileToBase64(file);
      setLogoPreview(b64);
      setValue("logo_base64", b64, { shouldDirty: true });
    } catch (err) {
      console.error("Logo read error:", err);
      setErrorMsg("Unable to read logo file");
    }
  }

  function clearLogo() {
    setLogoPreview(null);
    setValue("logo_base64", null, { shouldDirty: true });
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  /* --------------------------- UI render --------------------------- */
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
      <GlassPanel title="HMS Global Settings" subtitle="Core configuration used across the HMS modules and billing.">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Hospital / Facility Name */}
          <div>
            <label className="block text-sm font-medium text-white/90">Hospital / Facility Name</label>
            <input
              {...register("hospital_name", { required: "Facility name is required", minLength: { value: 2, message: "Too short" } })}
              placeholder="e.g., St. Mary General Hospital"
              className="mt-2 w-full rounded-2xl bg-white/[0.02] border border-white/8 px-3 py-2 placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-indigo-400"
              aria-invalid={!!errors.hospital_name}
            />
            {errors.hospital_name && <p className="text-rose-400 text-sm mt-1">{errors.hospital_name.message}</p>}
          </div>

          {/* Timezone + Currency */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-white/90">Timezone</label>
              <select
                {...register("timezone", { required: true })}
                className="mt-2 w-full rounded-2xl bg-white/[0.02] border border-white/8 px-3 py-2"
              >
                {/* try to position current timezone first */}
                <option value={Intl.DateTimeFormat().resolvedOptions().timeZone}>
                  {Intl.DateTimeFormat().resolvedOptions().timeZone} (Local)
                </option>
                {COMMON_TIMEZONES.filter((t) => t !== Intl.DateTimeFormat().resolvedOptions().timeZone).map((tz) => (
                  <option key={tz} value={tz}>
                    {tz}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-white/90">Default Currency</label>
              <select
                {...register("default_currency", { required: true })}
                className="mt-2 w-full rounded-2xl bg-white/[0.02] border border-white/8 px-3 py-2"
              >
                {COMMON_CURRENCIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Contact Email + Room Rate */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-white/90">Contact Email</label>
              <input
                type="email"
                {...register("contact_email", {
                  pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: "Invalid email" },
                })}
                placeholder="ops@hospital.example"
                className="mt-2 w-full rounded-2xl bg-white/[0.02] border border-white/8 px-3 py-2 placeholder:text-white/40"
                aria-invalid={!!errors.contact_email}
              />
              {errors.contact_email && <p className="text-rose-400 text-sm mt-1">{errors.contact_email.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-white/90">Default Room Rate (per day)</label>
              <input
                type="number"
                step="0.01"
                {...register("default_room_rate", { valueAsNumber: true })}
                placeholder="e.g. 1200.00"
                className="mt-2 w-full rounded-2xl bg-white/[0.02] border border-white/8 px-3 py-2 placeholder:text-white/40"
              />
            </div>
          </div>

          {/* Billing Enabled */}
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-3 cursor-pointer select-none">
              <input type="checkbox" {...register("billing_enabled")} className="w-4 h-4 accent-indigo-500" />
              <span className="text-sm text-white/90">Enable Billing Module</span>
            </label>

            <div className="ml-auto text-xs text-white/50">
              {lastSavedAt ? `Last saved ${new Date(lastSavedAt).toLocaleString()}` : isDirty ? "Unsaved changes" : "All changes saved"}
            </div>
          </div>

          {/* Logo Upload */}
          <div>
            <label className="block text-sm font-medium text-white/90">Facility Logo (optional)</label>
            <div className="mt-3 flex items-center gap-4">
              <div className="w-28 h-28 rounded-xl overflow-hidden bg-white/3 border border-white/8 flex items-center justify-center">
                {logoPreview ? (
                  <img src={logoPreview} alt="Logo preview" className="object-contain w-full h-full" />
                ) : (
                  <div className="text-xs text-white/40 px-2 text-center">No logo uploaded</div>
                )}
              </div>

              <div className="flex flex-col gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={async (e) => {
                    const file = e.target.files && e.target.files[0];
                    if (!file) return;
                    // client-side simple validation
                    if (file.size > 2_097_152) {
                      setErrorMsg("Logo must be smaller than 2MB");
                      return;
                    }
                    await handleLogoFile(file);
                  }}
                  className="text-sm file:rounded-md file:border-0 file:px-3 file:py-1 file:bg-white/6 file:text-white/90 file:cursor-pointer"
                />

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="rounded-xl px-3 py-2 text-sm ring-1 ring-white/8"
                  >
                    Choose file
                  </button>
                  <button
                    type="button"
                    onClick={clearLogo}
                    className="rounded-xl px-3 py-2 text-sm ring-1 ring-white/8"
                  >
                    Clear
                  </button>
                </div>

                <p className="text-xs text-white/40">Accepts PNG, JPG. Max 2MB. Recommended: square 512 × 512.</p>
              </div>
            </div>
          </div>

          {/* Error message */}
          {errorMsg && <div className="text-sm text-rose-400">{errorMsg}</div>}

          {/* Actions */}
          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={isSubmitting || !loaded}
              className="inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-sm font-medium shadow-sm ring-1 ring-white/10 focus:outline-none disabled:opacity-60"
              style={{ background: "linear-gradient(180deg, rgba(255,255,255,0.04), rgba(255,255,255,0.01))" }}
            >
              {isSubmitting ? "Saving..." : "Save Settings"}
            </button>

            <button
              type="button"
              onClick={() => {
                // reload server state
                setErrorMsg(null);
                setLogoPreview(null);
                // simply re-run the initial loader by resetting loaded and calling useEffect? We'll call GET again directly for simplicity:
                (async () => {
                  try {
                    const res = await fetch("/api/hms/settings", { method: "GET", headers: { "Content-Type": "application/json" } });
                    if (!res.ok) {
                      if (res.status === 404) {
                        reset({}, { keepDefaultValues: true });
                        return;
                      }
                      throw new Error(`Failed to fetch (${res.status})`);
                    }
                    const json = await res.json();
                    const payload: Partial<SettingsFormValues> = {
                      hospital_name: json.hospital_name ?? "",
                      timezone: json.timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone,
                      contact_email: json.contact_email ?? "",
                      default_currency: json.default_currency ?? "USD",
                      billing_enabled: typeof json.billing_enabled === "boolean" ? json.billing_enabled : true,
                      default_room_rate: json.default_room_rate != null ? Number(json.default_room_rate) : 0,
                      logo_base64: json.logo_base64 ?? null,
                    };
                    reset(payload as SettingsFormValues, { keepDefaultValues: false });
                    if (payload.logo_base64) setLogoPreview(payload.logo_base64);
                  } catch (err) {
                    console.error(err);
                    setErrorMsg("Failed to reload settings");
                  }
                })();
              }}
              className="rounded-2xl px-4 py-2 text-sm ring-1 ring-white/8"
            >
              Reload
            </button>

            <div className="ml-auto text-xs text-white/40">{loaded ? (isDirty ? "Unsaved changes" : "Up to date") : "Loading..."}</div>
          </div>
        </form>
      </GlassPanel>
    </motion.div>
  );
}
