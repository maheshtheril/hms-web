"use client";

import React, { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";

/* ========================================================================
   HMS Departments Form — Neural Glass Design (Production-ready)
   - Routes: /api/hms/departments  (GET, POST) and /api/hms/departments/:id (PUT)
   - Client component (App Router) — no server-only imports.
   - Style: Neural Glass (frosted glass, soft shadows, subtle gradients)
   - Multi-company ready: accepts `companyId` prop and includes company_id
     in fetches and payloads. Server must still enforce tenant/company RBAC.
   ======================================================================== */

type UUID = string;

export type DepartmentFormValues = {
  id?: UUID;
  name: string;
  code?: string;
  description?: string;
  parent_id?: UUID | null;
  is_active: boolean;
  company_id?: UUID | null;
};

type ParentOption = {
  id?: UUID;
  name: string;
};

/* -------------------------- Helpers ------------------------------------- */
function formatSavedAt(ts: string | null) {
  if (!ts) return null;
  try {
    return new Date(ts).toLocaleString();
  } catch {
    return ts;
  }
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
      {title && (
        <h2 className="text-lg md:text-xl font-semibold mb-4 text-white/95">
          {title}
        </h2>
      )}
      <div className="space-y-4">{children}</div>
      {footer && <div className="mt-5">{footer}</div>}
    </div>
  );
}

/* ------------------------- Main Component ------------------------------- */
export default function DepartmentsForm({
  initialData,
  companyId,
}: {
  initialData?: Partial<DepartmentFormValues>;
  companyId?: string | null;
}) {
  const isEdit = Boolean(initialData?.id);

  const {
    register,
    handleSubmit,
    reset,
    setError,
    clearErrors,
    formState: { errors, isSubmitting, isDirty, dirtyFields },
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

  const [parents, setParents] = useState<ParentOption[]>([]);
  const [parentsLoading, setParentsLoading] = useState<boolean>(true);
  const [parentsError, setParentsError] = useState<string | null>(null);

  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [serverMessage, setServerMessage] = useState<string | null>(null);

  const statusRef = useRef<HTMLDivElement | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  /* --------------------------- Fetch parents ---------------------------- */
  useEffect(() => {
    const controller = new AbortController();
    abortRef.current = controller;
    setParentsLoading(true);
    setParentsError(null);

    const url = companyId
      ? `/api/hms/departments?company_id=${encodeURIComponent(companyId)}`
      : "/api/hms/departments";

    fetch(url, { signal: controller.signal })
      .then(async (r) => {
        if (!r.ok) {
          const text = await r.text().catch(() => "Failed to fetch");
          throw new Error(text || "Failed to fetch parents");
        }
        return r.json();
      })
      .then((data) => {
        // Expecting array of { id, name } (coerce safely)
        if (!Array.isArray(data)) throw new Error("Unexpected response");
        setParents(
          data.map((p: any) => ({
            id: String(p.id ?? ""),
            name: String(p.name ?? "Unnamed"),
          }))
        );
      })
      .catch((err: any) => {
        if (err?.name === "AbortError") return;
        console.error("Error fetching parents:", err);
        setParentsError("Could not load parent departments");
        setParents([]);
      })
      .finally(() => setParentsLoading(false));

    return () => {
      controller.abort();
      abortRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyId]);

  /* -------------------------- Submit handler --------------------------- */
  async function onSubmit(values: DepartmentFormValues) {
    clearErrors();
    setServerMessage(null);

    // ensure payload contains the correct company id (prefer prop over form value)
    const payload: DepartmentFormValues = {
      ...values,
      company_id: (companyId ?? values.company_id ?? null) as UUID | null,
    };

    const url = isEdit
      ? `/api/hms/departments/${initialData?.id}`
      : "/api/hms/departments";
    const method = isEdit ? "PUT" : "POST";

    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const text = await res.text();
      let parsed: any = null;
      try {
        parsed = text ? JSON.parse(text) : null;
      } catch {
        parsed = null;
      }

      if (!res.ok) {
        // try to map server validation errors
        if (parsed && parsed.errors && typeof parsed.errors === "object") {
          Object.entries(parsed.errors).forEach(([k, v]) => {
            // @ts-ignore
            setError(k as keyof DepartmentFormValues, {
              type: "server",
              message: Array.isArray(v) ? v.join(", ") : String(v),
            });
          });
          // Focus first error
          const firstKey = Object.keys(parsed.errors)[0];
          const el = document.querySelector(
            `input[name="${firstKey}"], textarea[name="${firstKey}"], select[name="${firstKey}"]`
          ) as HTMLElement | null;
          el?.focus();
        }

        const errMsg =
          parsed?.message ||
          parsed?.error ||
          `Unable to ${isEdit ? "update" : "create"} department`;
        setServerMessage(errMsg);
        throw new Error(errMsg);
      }

      // Success
      const id = parsed?.id ?? initialData?.id ?? values.id;
      setSavedAt(new Date().toISOString());
      setServerMessage("Saved successfully");
      // reset form state but keep values (and keep updated id if server returned)
      reset({ ...payload, id });
    } catch (err: any) {
      console.error("Save error:", err);
      if (!serverMessage) setServerMessage(err?.message ?? "Save failed");
      // move focus to status for SR users
      if (statusRef.current) statusRef.current.focus();
    }
  }

  /* ---------------------------- Reset handler -------------------------- */
  function handleReset() {
    if (isDirty) {
      const ok = confirm(
        "You have unsaved changes. Are you sure you want to reset the form?"
      );
      if (!ok) return;
    }
    reset({
      name: "",
      code: "",
      description: "",
      parent_id: null,
      is_active: true,
      company_id: companyId ?? (initialData?.company_id as UUID | null) ?? null,
      ...initialData,
    });
    clearErrors();
    setServerMessage(null);
  }

  /* ---------------------------- Render UI ------------------------------ */
  return (
    <GlassCard title={isEdit ? "Edit Department" : "Create Department"}>
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="space-y-4 text-white/92"
        noValidate
      >
        {/* Ensure company_id is present in submitted values */}
        <input type="hidden" {...register("company_id" as const)} />

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
              })}
              name="code"
              className="w-full rounded-2xl border border-white/10 bg-white/6 px-3 py-2 placeholder:text-white/50"
              placeholder="e.g. CARD"
            />
            {errors.code && (
              <p className="text-rose-400 text-sm mt-1">{errors.code.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Parent Department
            </label>

            <div className="relative">
              <select
                {...register("parent_id")}
                name="parent_id"
                className="w-full rounded-2xl border border-white/10 bg-white/6 px-3 py-2 pr-10"
                aria-disabled={parentsLoading}
                disabled={parentsLoading}
              >
                <option value="">— None —</option>
                {parents.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>

              {parentsLoading && (
                <div className="absolute right-3 top-2 text-xs text-zinc-400">
                  Loading…
                </div>
              )}
            </div>

            {parentsError && (
              <p className="text-amber-300 text-sm mt-1">{parentsError}</p>
            )}
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
          {errors.description && (
            <p className="text-rose-400 text-sm mt-1">
              {errors.description.message}
            </p>
          )}
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
            {savedAt
              ? `Saved ${formatSavedAt(savedAt)}`
              : isDirty
              ? "Unsaved changes"
              : "All changes saved"}
          </div>
        </div>

        {/* Server messages (aria-live for screen readers) */}
        <div
          ref={statusRef}
          tabIndex={-1}
          aria-live="polite"
          className="sr-only"
        >
          {serverMessage ?? (savedAt ? `Saved at ${formatSavedAt(savedAt)}` : "")}
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex items-center justify-center rounded-2xl px-4 py-2 text-sm font-medium text-white shadow-sm ring-1 ring-white/10 focus:outline-none disabled:opacity-60"
            style={{
              background:
                "linear-gradient(180deg, rgba(255,255,255,0.06), rgba(255,255,255,0.01))",
            }}
            aria-disabled={isSubmitting}
          >
            {isSubmitting ? "Saving…" : isEdit ? "Save Changes" : "Create Department"}
          </button>

          <button
            type="button"
            onClick={handleReset}
            className="rounded-2xl px-4 py-2 text-sm ring-1 ring-white/10 hover:bg-white/5"
          >
            Reset
          </button>

          {serverMessage && (
            <div className="ml-3 text-sm text-amber-100/90">{serverMessage}</div>
          )}
        </div>
      </form>
    </GlassCard>
  );
}
