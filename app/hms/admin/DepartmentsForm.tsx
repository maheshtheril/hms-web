"use client";

import React, { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import axios, { AxiosRequestConfig, CancelTokenSource } from "axios";
import apiClient from "@/lib/api-client"; // adjust if your apiClient path differs

type UUID = string;

export type DepartmentFormValues = {
  id?: UUID | null;
  name: string;
  code?: string | null;
  description?: string | null;
  parent_id?: UUID | null;
  is_active: boolean;
  company_id?: UUID | null;
};

type ParentOption = {
  id?: UUID;
  name: string;
};

type CompanyOption = {
  id: UUID;
  name: string;
};

/* ------------------------ Axios helper (unchanged) --------------------- */
/** Normalize URL to avoid duplicate base parts */
function _normalizeUrlForApiClient(u: string) {
  try {
    const base = String(
      (apiClient && (apiClient as any).defaults && (apiClient as any).defaults.baseURL) || ""
    );
    if (base && base.includes("/api") && u.startsWith("/api")) {
      return u.replace(/^\/api/, "") || "/";
    }
    if (base && u === base) return "/";
    return u;
  } catch {
    return u;
  }
}

async function tryAxiosVariantsGet(
  urls: string[],
  config?: AxiosRequestConfig
): Promise<{ url: string; data: any; resp: any } | null> {
  let lastErr: any = null;
  for (const u of urls) {
    const candidates = [u];
    try {
      const norm = _normalizeUrlForApiClient(u);
      if (norm !== u) candidates.push(norm);
    } catch {}
    for (const attemptUrl of candidates) {
      try {
        console.debug("[tryAxiosVariantsGet] requesting:", attemptUrl);
        const resp = await apiClient.get(attemptUrl, config);
        console.debug("[tryAxiosVariantsGet] response:", attemptUrl, resp?.status, resp?.data);
        if (resp?.status >= 200 && resp.status < 300) {
          return { url: attemptUrl, data: resp.data, resp };
        }
      } catch (e: any) {
        lastErr = e;
        console.warn(
          "[tryAxiosVariantsGet] failed:",
          attemptUrl,
          e?.response?.status,
          e?.response?.data ?? e.message
        );
        continue;
      }
    }
  }
  console.warn("tryAxiosVariantsGet: all variants failed", { urls, lastErr });
  return null;
}

async function tryAxiosVariantsWrite(
  urls: string[],
  method: "post" | "put",
  payload: any,
  config?: AxiosRequestConfig
): Promise<{ url: string; data: any; resp: any } | null> {
  let lastErr: any = null;
  for (const u of urls) {
    const candidates = [u];
    try {
      const norm = _normalizeUrlForApiClient(u);
      if (norm !== u) candidates.push(norm);
    } catch {}
    for (const attemptUrl of candidates) {
      try {
        console.debug(`[tryAxiosVariantsWrite] ${method.toUpperCase()} ->`, attemptUrl, payload);
        const resp =
          method === "post"
            ? await apiClient.post(attemptUrl, payload, config)
            : await apiClient.put(attemptUrl, payload, config);
        console.debug("[tryAxiosVariantsWrite] response:", attemptUrl, resp?.status, resp?.data);
        if (resp?.status >= 200 && resp.status < 300) {
          return { url: attemptUrl, data: resp.data, resp };
        }
      } catch (e: any) {
        lastErr = e;
        console.warn(
          `[tryAxiosVariantsWrite] failed ${method.toUpperCase()}:`,
          attemptUrl,
          e?.response?.status,
          e?.response?.data ?? e.message
        );
        continue;
      }
    }
  }
  console.warn("tryAxiosVariantsWrite: all variants failed", { urls, lastErr });
  return null;
}

/* ---------------------- Reusable Glass Card ----------------------------- */
function GlassCard({
  title,
  children,
  footer,
}: {
  title?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <div className="backdrop-blur-md bg-white/4 border border-white/8 rounded-2xl p-6 shadow-xl shadow-black/12 max-w-2xl w-full">
      {title && <h2 className="text-lg md:text-xl font-semibold mb-4 text-white/95">{title}</h2>}
      <div className="space-y-4">{children}</div>
      {footer && <div className="mt-5">{footer}</div>}
    </div>
  );
}

/* ------------------------- Main Component ------------------------------- */
export default function DepartmentsForm({
  initialData,
  companyId,
  onSaved,
}: {
  initialData?: Partial<DepartmentFormValues>;
  companyId?: string | null;
  onSaved?: (d: DepartmentFormValues) => void;
}) {
  const isEdit = Boolean(initialData?.id);

  const {
    register,
    handleSubmit,
    reset,
    setError,
    clearErrors,
    setValue,
    watch,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<DepartmentFormValues>({
    defaultValues: {
      name: "",
      code: "",
      description: "",
      parent_id: null,
      is_active: true,
      company_id: companyId ?? (initialData?.company_id as UUID | null) ?? null,
      ...initialData,
    },
    mode: "onBlur",
  });

  const watchedCompany = watch("company_id") ?? null;

  const [companies, setCompanies] = useState<CompanyOption[]>([]);
  const [companiesLoading, setCompaniesLoading] = useState(true);
  const [companiesError, setCompaniesError] = useState<string | null>(null);

  const [parents, setParents] = useState<ParentOption[]>([]);
  const [parentsLoading, setParentsLoading] = useState<boolean>(true);
  const [parentsError, setParentsError] = useState<string | null>(null);

  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [serverMessage, setServerMessage] = useState<string | null>(null);
  const statusRef = useRef<HTMLDivElement | null>(null);

  // cancel token sources
  const cancelSources = useRef<Set<CancelTokenSource>>(new Set());

  // Reset form when incoming initialData or companyId changes (important for edit flows)
  useEffect(() => {
    reset({
      name: initialData?.name ?? "",
      code: initialData?.code ?? "",
      description: initialData?.description ?? "",
      parent_id: initialData?.parent_id ?? null,
      is_active: typeof initialData?.is_active === "boolean" ? initialData!.is_active : true,
      company_id: companyId ?? (initialData?.company_id as UUID | null) ?? null,
      ...initialData,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialData?.id, companyId]);

  // Fetch logged-in user's default company_id from session (runs once)
  useEffect(() => {
    (async () => {
      try {
        const resp = await apiClient.get("/auth/session", { withCredentials: true });
        const companyFromSession = resp?.data?.user?.company_id ?? null;
        if (companyFromSession) {
          console.info("Default company from session:", companyFromSession);
          setValue("company_id", companyFromSession);
        }
      } catch (err) {
        console.warn("Session company fetch failed:", err);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    // cleanup cancels on unmount
    return () => {
      cancelSources.current.forEach((s) => {
        try {
          s.cancel("component_unmount");
        } catch {}
      });
      cancelSources.current.clear();
    };
  }, []);

  /* --------------------------- Fetch companies -------------------------- */
  useEffect(() => {
    let cancelled = false;
    setCompaniesLoading(true);
    setCompaniesError(null);

    const variants = ["/admin/companies", "/api/admin/companies", "/companies", "/api/companies"];

    const source = axios.CancelToken.source();
    cancelSources.current.add(source);

    (async () => {
      try {
        const found = await tryAxiosVariantsGet(variants, {
          cancelToken: source.token,
          withCredentials: true,
        });
        if (!found) {
          if (!cancelled) {
            setCompaniesError("Failed to load companies (no matching endpoint)");
            setCompanies([]);
          }
          return;
        }
        const data = found.data;
        const raw =
          (Array.isArray(data?.items) && data.items) ||
          (Array.isArray(data?.companies) && data.companies) ||
          (Array.isArray(data?.data) && data.data) ||
          (Array.isArray(data) && data) ||
          [];

        const mapped: CompanyOption[] = (Array.isArray(raw) ? raw : []).map((c: any) => ({
          id: String(c.id ?? c.company_id ?? c.uuid ?? c),
          name: String(c.name ?? c.company_name ?? c.title ?? "Unnamed Company"),
        }));

        if (cancelled) return;
        setCompanies(mapped);
        const initialCompany =
          companyId ?? (initialData?.company_id as UUID | null) ?? (mapped.length === 1 ? mapped[0].id : mapped[0]?.id ?? null);
        if (initialCompany) setValue("company_id", initialCompany);
        console.info("Companies fetched via:", found.url);
      } catch (err: any) {
        if (axios.isCancel(err)) return;
        console.error("Companies fetch failed", err);
        if (!cancelled) {
          setCompaniesError("Failed to load companies");
          setCompanies([]);
        }
      } finally {
        if (!cancelled) setCompaniesLoading(false);
        // remove source from set
        try {
          cancelSources.current.delete(source);
        } catch {}
      }
    })();

    return () => {
      cancelled = true;
      try {
        source.cancel("companies_effect_unmount");
      } catch {}
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* --------------------------- Fetch parents --------------------------- */
  useEffect(() => {
    let cancelled = false;
    setParentsLoading(true);
    setParentsError(null);

    const baseCandidates = watchedCompany
      ? [
          `/hms/departments?company_id=${encodeURIComponent(watchedCompany)}`,
          `/api/hms/departments?company_id=${encodeURIComponent(watchedCompany)}`,
          `/departments?company_id=${encodeURIComponent(watchedCompany)}`,
          `/api/departments?company_id=${encodeURIComponent(watchedCompany)}`,
        ]
      : ["/hms/departments", "/api/hms/departments", "/departments", "/api/departments"];

    const source = axios.CancelToken.source();
    cancelSources.current.add(source);

    (async () => {
      try {
        const found = await tryAxiosVariantsGet(baseCandidates, {
          cancelToken: source.token,
          withCredentials: true,
        });

        if (!found) {
          if (!cancelled) {
            setParentsError("Could not load parent departments (no endpoint)");
            setParents([]);
          }
          return;
        }

        const data = found.data;
        const raw =
          (Array.isArray(data?.items) && data.items) ||
          (Array.isArray(data?.departments) && data.departments) ||
          (Array.isArray(data?.data) && data.data) ||
          (Array.isArray(data) && data) ||
          [];

        const mapped = (Array.isArray(raw) ? raw : []).map((p: any) => ({
          id: String(p.id ?? p.department_id ?? p.uuid ?? ""),
          name: String(p.name ?? p.title ?? "Unnamed"),
        }));
        if (cancelled) return;
        setParents(mapped);
        console.info("Parents fetched via:", found.url);
      } catch (err: any) {
        if (axios.isCancel(err)) return;
        console.error("Error fetching parents:", err);
        if (!cancelled) {
          setParentsError("Could not load parent departments");
          setParents([]);
        }
      } finally {
        if (!cancelled) setParentsLoading(false);
        try {
          cancelSources.current.delete(source);
        } catch {}
      }
    })();

    return () => {
      cancelled = true;
      try {
        source.cancel("parents_effect_unmount");
      } catch {}
    };
  }, [watchedCompany]);

  /* -------------------------- Submit handler --------------------------- */
  async function onSubmit(values: DepartmentFormValues) {
    clearErrors();
    setServerMessage(null);

    // Normalize values: convert empty strings to null, ensure booleans
    const normalizedParent =
      values.parent_id === "" || values.parent_id === undefined ? null : values.parent_id;
    const normalizedCompany =
      values.company_id === "" || values.company_id === undefined ? companyId ?? null : values.company_id;

    // client-side guard: don't allow self-parenting
    if (isEdit && normalizedParent && initialData?.id && normalizedParent === initialData.id) {
      setError("parent_id", { type: "validate", message: "Department cannot be its own parent." });
      return;
    }

    // quick UUID sanity check (cheap client-side validation)
    const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (normalizedParent && !UUID_RE.test(String(normalizedParent))) {
      setError("parent_id", { type: "validate", message: "Parent id has invalid format." });
      return;
    }

    const payload: DepartmentFormValues = {
      ...values,
      is_active: !!values.is_active,
      parent_id: normalizedParent as UUID | null,
      company_id: normalizedCompany as UUID | null,
    };

    const urlCandidates = isEdit
      ? [
          `/hms/departments/${initialData?.id}`,
          `/api/hms/departments/${initialData?.id}`,
          `/departments/${initialData?.id}`,
        ]
      : ["/hms/departments", "/api/hms/departments", "/departments", "/api/departments"];

    try {
      const found = await tryAxiosVariantsWrite(urlCandidates, isEdit ? "put" : "post", payload, {
        withCredentials: true,
      });
      if (!found) throw new Error("No endpoint available to save department");

      const data = found.data ?? {};
      const savedRecord =
        (data && typeof data === "object" && (data.data ?? data.department ?? data)) || data;

      const normalized: DepartmentFormValues = {
        id: savedRecord?.id ?? savedRecord?.department_id ?? initialData?.id ?? (payload.id as any ?? null),
        name: savedRecord?.name ?? payload.name,
        code: savedRecord?.code ?? payload.code ?? null,
        description: savedRecord?.description ?? payload.description ?? null,
        parent_id: savedRecord?.parent_id ?? savedRecord?.parent ?? payload.parent_id ?? null,
        is_active:
          typeof savedRecord?.is_active === "boolean" ? savedRecord.is_active : !!payload.is_active,
        company_id: savedRecord?.company_id ?? payload.company_id ?? companyId ?? null,
      };

      setSavedAt(new Date().toISOString());
      setServerMessage("Saved successfully");
      // Reset form to canonical saved values
      reset(normalized);

      // Inform parent (DepartmentsPage) — very important
      try {
        onSaved?.(normalized);
      } catch (e) {
        console.warn("onSaved callback threw:", e);
      }

      console.info("Saved via:", found.url, "normalized:", normalized);
    } catch (err: any) {
      if (axios.isCancel(err)) return;
      console.error("Save error:", err);

      // Map server-side validation errors to fields when possible
      const srv = err?.response?.data;
      if (srv && typeof srv === "object") {
        // backend returns e.g. { error: 'invalid_parent_uuid' } or { error: 'invalid_parent' } or { errors: { parent_id: [...] } }
        if (srv.error === "invalid_parent_uuid" || srv.error === "invalid_parent" || (srv.errors && srv.errors.parent_id)) {
          const msg = srv?.errors?.parent_id?.join?.(", ") || (srv.error === "invalid_parent_uuid" ? "Parent id is not a valid UUID." : "Parent department is invalid or not found.");
          setError("parent_id", { type: "server", message: String(msg) });
          setServerMessage(String(msg));
          if (statusRef.current) statusRef.current.focus();
          return;
        }
        // generic mapped errors
        if (srv.errors && typeof srv.errors === "object") {
          Object.entries(srv.errors).forEach(([k, v]) => {
            setError(k as keyof DepartmentFormValues, {
              type: "server",
              message: Array.isArray(v) ? v.join(", ") : String(v),
            });
          });
          setServerMessage(srv.message || "Validation failed");
          if (statusRef.current) statusRef.current.focus();
          return;
        }
        // fallback message from server
        const message = srv?.message || JSON.stringify(srv);
        setServerMessage(message);
        if (statusRef.current) statusRef.current.focus();
        return;
      }

      const message =
        err?.response?.data?.message ||
        err?.message ||
        (err?.response ? JSON.stringify(err.response.data) : "Save failed");
      setServerMessage(message);
      if (statusRef.current) statusRef.current.focus();
    }
  }

  function handleReset() {
    if (isDirty) {
      const ok = confirm("You have unsaved changes. Are you sure you want to reset the form?");
      if (!ok) return;
    }
    reset({
      name: initialData?.name ?? "",
      code: initialData?.code ?? "",
      description: initialData?.description ?? "",
      parent_id: initialData?.parent_id ?? null,
      is_active: typeof initialData?.is_active === "boolean" ? initialData!.is_active : true,
      company_id: companyId ?? (initialData?.company_id as UUID | null) ?? null,
      ...initialData,
    });
    clearErrors();
    setServerMessage(null);
  }

  function formatSavedAt(ts: string | null) {
    if (!ts) return null;
    try {
      return new Date(ts).toLocaleString();
    } catch {
      return ts;
    }
  }

  /* ---------------------------- Render UI ------------------------------ */
  return (
    <GlassCard title={isEdit ? "Edit Department" : "Create Department"}>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 text-white/92" noValidate>
        {/* Company */}
        <div>
          <label className="block text-sm font-medium mb-1">Company</label>
          <div className="relative">
            {/* Keep select text white for dark UI; options below are forced dark text */}
            <select
              {...register("company_id", {
                required: "Company is required",
                onChange: () => setValue("parent_id", null),
              })}
              name="company_id"
              className="w-full rounded-2xl border border-white/10 bg-white/6 px-3 py-2 text-white placeholder:text-white/50"
              disabled={companiesLoading}
              aria-invalid={errors.company_id ? "true" : "false"}
            >
              <option value="" className="text-black" style={{ color: "#0b0b0b", backgroundColor: "#ffffff" }}>
                — Select company —
              </option>

              {companies.map((c) => (
                // Explicitly force dark text + light background on options to avoid invisible text
                <option
                  key={c.id}
                  value={c.id}
                  className="text-black"
                  style={{ color: "#0b0b0b", backgroundColor: "#ffffff" }}
                >
                  {c.name}
                </option>
              ))}
            </select>
            {companiesLoading && <div className="absolute right-3 top-2 text-xs text-zinc-400">Loading…</div>}
          </div>

          {companiesError && <p className="text-amber-300 text-sm mt-1">{companiesError}</p>}
          {errors.company_id && (
            <p className="text-rose-400 text-sm mt-1" role="alert">
              {errors.company_id.message}
            </p>
          )}
        </div>

        {/* Name */}
        <div>
          <label className="block text-sm font-medium mb-1">Name</label>
          <input
            {...register("name", {
              required: "Name is required",
              minLength: { value: 2, message: "Name must be at least 2 characters" },
            })}
            name="name"
            aria-invalid={errors.name ? "true" : "false"}
            className={`w-full rounded-2xl border px-3 py-2 placeholder:text-white/50 focus:outline-none focus:ring-2 focus:ring-indigo-400 ${
              errors.name ? "border-rose-400" : "border-white/10 bg-white/6"
            }`}
            placeholder="e.g. Cardiology"
          />
          {errors.name && (
            <p className="text-rose-400 text-sm mt-1" role="alert">
              {errors.name.message}
            </p>
          )}
        </div>

        {/* Code + Parent */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium mb-1">Code</label>
            <input
              {...register("code", {
                maxLength: { value: 12, message: "Code too long (max 12)" },
                setValueAs: (v) => (typeof v === "string" ? v.trim().toUpperCase() : v),
              })}
              name="code"
              className="w-full rounded-2xl border border-white/10 bg-white/6 px-3 py-2 placeholder:text-white/50"
              placeholder="e.g. CARD"
            />
            {errors.code && <p className="text-rose-400 text-sm mt-1">{errors.code.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Parent Department</label>
            <div className="relative">
              <select
                {...register("parent_id")}
                name="parent_id"
                className="w-full rounded-2xl border border-white/10 bg-white/6 px-3 py-2 pr-10 text-white placeholder:text-white/50"
                aria-disabled={parentsLoading}
                disabled={parentsLoading}
              >
                <option value="" className="text-black" style={{ color: "#0b0b0b", backgroundColor: "#ffffff" }}>
                  — None —
                </option>

                {parents.map((p) => (
                  <option
                    key={p.id}
                    value={p.id}
                    className="text-black"
                    style={{ color: "#0b0b0b", backgroundColor: "#ffffff" }}
                    // disable the option matching the department being edited to prevent self-parenting
                    disabled={isEdit && initialData?.id ? String(p.id) === String(initialData.id) : false}
                  >
                    {p.name}
                  </option>
                ))}
              </select>
              {parentsLoading && <div className="absolute right-3 top-2 text-xs text-zinc-400">Loading…</div>}
            </div>
            {parentsError && <p className="text-amber-300 text-sm mt-1">{parentsError}</p>}
            {errors.parent_id && <p className="text-rose-400 text-sm mt-1">{errors.parent_id?.message}</p>}
          </div>
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium mb-1">Description</label>
          <textarea
            {...register("description")}
            name="description"
            rows={3}
            className="w-full rounded-2xl border border-white/10 bg-white/6 px-3 py-2 placeholder:text-white/50"
            placeholder="Optional description for internal use"
          />
          {errors.description && <p className="text-rose-400 text-sm mt-1">{errors.description.message}</p>}
        </div>

        {/* Active + Status */}
        <div className="flex items-center gap-4 text-sm">
          <label className="flex items-center gap-2 select-none">
            <input
              type="checkbox"
              {...register("is_active")}
              name="is_active"
              className="accent-indigo-400 w-4 h-4"
            />
            <span>Active</span>
          </label>

          <div className="ml-auto text-xs text-zinc-400">
            {savedAt ? `Saved ${formatSavedAt(savedAt)}` : isDirty ? "Unsaved changes" : "All changes saved"}
          </div>
        </div>

        {/* aria-live */}
        <div ref={statusRef} tabIndex={-1} aria-live="polite" className="sr-only">
          {serverMessage ?? (savedAt ? `Saved at ${formatSavedAt(savedAt)}` : "")}
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex items-center justify-center rounded-2xl px-4 py-2 text-sm font-medium text-white shadow-sm ring-1 ring-white/10 focus:outline-none disabled:opacity-60"
            style={{
              background: "linear-gradient(180deg, rgba(255,255,255,0.06), rgba(255,255,255,0.01))",
            }}
            aria-disabled={isSubmitting}
          >
            {isSubmitting ? "Saving…" : isEdit ? "Save Changes" : "Create Department"}
          </button>

          <button type="button" onClick={handleReset} className="rounded-2xl px-4 py-2 text-sm ring-1 ring-white/10 hover:bg-white/5">
            Reset
          </button>

          {serverMessage && <div className="ml-3 text-sm text-amber-100/90">{serverMessage}</div>}
        </div>
      </form>
    </GlassCard>
  );
}
