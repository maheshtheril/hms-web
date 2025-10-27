"use client";

import React, { useEffect, useState, useRef } from "react";
import { useForm } from "react-hook-form";
import { motion } from "framer-motion";

/**
 * app/hms/admin/SettingsForm.tsx
 * -------------------------------------
 * Multi-company / multi-tenant aware HMS Settings Form
 * - Neural Glass Design Language (frosted, soft shadows, rounded-2xl)
 * - Uses react-hook-form
 * - Props allow tenant + company wiring
 * - Expects:
 *    GET  /api/hms/settings?company_id=<id>
 *    POST /api/hms/settings?company_id=<id>
 *    GET  /api/hms/companies
 *
 * Adjust endpoints and auth headers to match your backend.
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

type Company = {
  id: string;
  name: string;
  // any other metadata
};

type Props = {
  tenantId?: string | null; // optional, can be inserted from auth context
  initialCompanyId?: string | null; // optional company to load initially
  isTenantAdmin?: boolean; // if false, hide/disable company selector
  companiesEndpoint?: string; // override companies endpoint
  settingsEndpoint?: string; // override settings endpoint
  authToken?: string | null; // optional bearer token
};

/* ------------------------- Constants --------------------------- */
const COMMON_TIMEZONES = [
  "UTC",
  "Asia/Kolkata",
  "America/New_York",
  "Europe/London",
  "Europe/Berlin",
  "Asia/Singapore",
  "Australia/Sydney",
  "Asia/Tokyo",
];

const COMMON_CURRENCIES = ["USD", "EUR", "INR", "GBP", "SGD", "AUD", "JPY"];

/* ------------------------- Glass container --------------------- */
function GlassPanel({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
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

function buildHeaders(props: Props) {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (props.tenantId) headers["X-Tenant-ID"] = props.tenantId;
  if (props.authToken) headers["Authorization"] = `Bearer ${props.authToken}`;
  return headers;
}

/* ---------------------- Main component ------------------------- */
export default function HmsSettingsForm({
  tenantId = null,
  initialCompanyId = null,
  isTenantAdmin = true,
  companiesEndpoint = "/api/hms/companies",
  settingsEndpoint = "/api/hms/settings",
  authToken = null,
}: Props) {
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
  const [lastSavedAt, setLastSavedAt] = useState<Record<string, string | null>>({}); // per-company timestamp
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(initialCompanyId);
  const [companiesLoading, setCompaniesLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const logoBase64 = watch("logo_base64");
  const hospitalName = watch("hospital_name");

  useEffect(() => {
    if (logoBase64) setLogoPreview(logoBase64);
  }, [logoBase64]);

  /* -------------------- Load companies list -------------------- */
  useEffect(() => {
    let mounted = true;
    const loadCompanies = async () => {
      setCompaniesLoading(true);
      setErrorMsg(null);
      try {
        const headers = { ...buildHeaders({ tenantId, authToken }) };
        const res = await fetch(companiesEndpoint, {
          method: "GET",
          headers,
        });
        if (!res.ok) {
          // some backends might return 404 when multi-company is not set up — that's acceptable
          if (res.status === 404) {
            if (mounted) setCompanies([]);
            return;
          }
          throw new Error(`Failed to load companies (${res.status})`);
        }
        const json = await res.json();
        // Expecting array of { id, name }
        if (!mounted) return;
        const list: Company[] = Array.isArray(json) ? json : json?.companies ?? [];
        setCompanies(list);
        // choose initial selected company intelligently
        if (!selectedCompanyId) {
          // priority: initialCompanyId prop -> first company -> null
          const pick = initialCompanyId ?? (list.length ? list[0].id : null);
          setSelectedCompanyId(pick);
        }
      } catch (err: any) {
        console.error("Load companies error:", err);
        if (mounted) setErrorMsg("Failed to load companies");
      } finally {
        if (mounted) setCompaniesLoading(false);
      }
    };

    loadCompanies();
    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companiesEndpoint, tenantId, authToken]);

  /* ------------------- Load settings (per-company) ------------------- */
  useEffect(() => {
    // Whenever selectedCompanyId changes load its settings
    let mounted = true;
    if (!selectedCompanyId && companies.length) {
      // pick first company if available
      setSelectedCompanyId((prev) => prev ?? companies[0].id);
      return;
    }

    const load = async () => {
      setLoaded(false);
      setErrorMsg(null);
      try {
        const url = `${settingsEndpoint}?company_id=${encodeURIComponent(String(selectedCompanyId ?? ""))}`;
        const headers: Record<string, string> = {
          ...buildHeaders({ tenantId, authToken }),
        };
        if (selectedCompanyId) headers["X-Company-ID"] = selectedCompanyId;

        const res = await fetch(url, {
          method: "GET",
          headers,
        });

        if (!res.ok) {
          // 404 means not configured yet for this company — reset to defaults
          if (res.status === 404) {
            reset(
              {
                hospital_name: "",
                timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
                contact_email: "",
                default_currency: "USD",
                billing_enabled: true,
                default_room_rate: 0,
                logo_base64: null,
              },
              { keepDefaultValues: false }
            );
            setLogoPreview(null);
            if (mounted) setLoaded(true);
            return;
          }
          throw new Error(`Failed to load settings (${res.status})`);
        }

        const json = await res.json();
        if (!mounted) return;

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

    // only call if selectedCompanyId is set (or allow blank/companyless mode)
    load();

    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCompanyId, settingsEndpoint, tenantId, authToken]);

  /* --------------------------- Submit --------------------------- */
  async function onSubmit(values: SettingsFormValues) {
    setErrorMsg(null);
    try {
      const payload = {
        ...values,
        hospital_name: values.hospital_name?.trim(),
        contact_email: values.contact_email?.trim() || null,
        default_currency: values.default_currency?.trim() || "USD",
        default_room_rate: values.default_room_rate ?? 0,
      };

      // Build URL with company query param (if present)
      const url = `${settingsEndpoint}?company_id=${encodeURIComponent(String(selectedCompanyId ?? ""))}`;

      const headers: Record<string, string> = {
        ...buildHeaders({ tenantId, authToken }),
      };
      if (selectedCompanyId) headers["X-Company-ID"] = selectedCompanyId;

      const res = await fetch(url, {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const txt = await res.text().catch(() => null);
        throw new Error(txt || `Save failed (${res.status})`);
      }

      // server response might include timestamp; otherwise set now
      const json = await res.json().catch(() => ({}));
      const ts = json?.updated_at ?? new Date().toISOString();

      setLastSavedAt((prev) => ({ ...prev, [selectedCompanyId ?? "global"]: ts }));

      // reset form pristine state while keeping values
      reset({ ...values }, { keepDefaultValues: true });
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
      <GlassPanel title="HMS Global Settings" subtitle="Core configuration used across HMS modules and billing.">
        {/* Company selector */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-white/90">Company / Facility</label>
          <div className="mt-2 flex gap-3 items-center">
            <select
              value={selectedCompanyId ?? ""}
              onChange={(e) => setSelectedCompanyId(e.target.value || null)}
              disabled={!isTenantAdmin || companiesLoading}
              className="rounded-2xl bg-white/[0.02] border border-white/8 px-3 py-2"
            >
              <option value="">{companies.length ? "Select company..." : "No companies available"}</option>
              {companies.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={async () => {
                // reload companies and settings for the selected company
                setErrorMsg(null);
                try {
                  setCompaniesLoading(true);
                  const headers = { ...buildHeaders({ tenantId, authToken }) };
                  const res = await fetch(companiesEndpoint, { method: "GET", headers });
                  if (!res.ok) throw new Error(`Failed to fetch companies (${res.status})`);
                  const json = await res.json();
                  const list: Company[] = Array.isArray(json) ? json : json?.companies ?? [];
                  setCompanies(list);
                } catch (err) {
                  console.error(err);
                  setErrorMsg("Failed to reload companies");
                } finally {
                  setCompaniesLoading(false);
                }
              }}
              className="rounded-2xl px-3 py-2 text-sm ring-1 ring-white/8"
            >
              Reload companies
            </button>

            <div className="ml-auto text-xs text-white/40">
              {companiesLoading ? "Loading companies..." : selectedCompanyId ? `Company: ${selectedCompanyId}` : "No company"}
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Hospital / Facility Name */}
          <div>
            <label className="block text-sm font-medium text-white/90">Hospital / Facility Name</label>
            <input
              {...register("hospital_name", { required: "Facility name is required", minLength: { value: 2, message: "Too short" } })}
              placeholder="e.g., St. Mary General Hospital"
              className="mt-2 w-full rounded-2xl bg-white/[0.02] border border-white/8 px-3 py-2 placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-indigo-400"
              aria-invalid={!!errors.hospital_name}
              disabled={!selectedCompanyId && companies.length > 0}
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
              {selectedCompanyId
                ? lastSavedAt[selectedCompanyId]
                  ? `Last saved ${new Date(lastSavedAt[selectedCompanyId] as string).toLocaleString()}`
                  : isDirty
                  ? "Unsaved changes"
                  : "All changes saved"
                : isDirty
                ? "Unsaved changes"
                : "All changes saved"}
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
                  <button type="button" onClick={clearLogo} className="rounded-xl px-3 py-2 text-sm ring-1 ring-white/8">
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
              disabled={isSubmitting || !loaded || (companies.length > 0 && !selectedCompanyId)}
              className="inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-sm font-medium shadow-sm ring-1 ring-white/10 focus:outline-none disabled:opacity-60"
              style={{ background: "linear-gradient(180deg, rgba(255,255,255,0.04), rgba(255,255,255,0.01))" }}
            >
              {isSubmitting ? "Saving..." : "Save Settings"}
            </button>

            <button
              type="button"
              onClick={() => {
                // reload server state for currently selected company
                setErrorMsg(null);
                setLogoPreview(null);
                (async () => {
                  try {
                    setLoaded(false);
                    const url = `${settingsEndpoint}?company_id=${encodeURIComponent(String(selectedCompanyId ?? ""))}`;
                    const headers: Record<string, string> = {
                      ...buildHeaders({ tenantId, authToken }),
                    };
                    if (selectedCompanyId) headers["X-Company-ID"] = selectedCompanyId;
                    const res = await fetch(url, { method: "GET", headers });
                    if (!res.ok) {
                      if (res.status === 404) {
                        reset({}, { keepDefaultValues: true });
                        setLogoPreview(null);
                        setLoaded(true);
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
                  } finally {
                    setLoaded(true);
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
