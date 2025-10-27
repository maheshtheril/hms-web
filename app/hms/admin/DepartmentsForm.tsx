"use client";

import React, { useEffect, useState } from "react";
import { useForm } from "react-hook-form";

/* ============================================================================
   HMS Departments Form — Neural Glass Design
   ============================================================================
   - For /hms/admin and /hms/departments routes
   - Handles Create / Edit of Departments
   - API endpoints expected:
       GET  /api/hms/departments
       POST /api/hms/departments
       PUT  /api/hms/departments/:id
   - Style: Neural Glass Design (frosted glass, soft shadows, subtle gradients)
============================================================================ */

type DepartmentFormValues = {
  id?: string;
  name: string;
  code?: string;
  description?: string;
  parent_id?: string | null;
  is_active: boolean;
};

/* -------------------------- Reusable Glass Card -------------------------- */
function GlassCard({
  title,
  children,
}: {
  title?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="backdrop-blur-md bg-white/5 border border-white/10 rounded-2xl p-6 shadow-xl shadow-black/10">
      {title && (
        <h2 className="text-xl font-semibold mb-5 text-white/90">{title}</h2>
      )}
      {children}
    </div>
  );
}

/* -------------------------- Departments Form ----------------------------- */
export default function DepartmentsForm({
  initialData,
}: {
  initialData?: Partial<DepartmentFormValues>;
}) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<DepartmentFormValues>({
    defaultValues: {
      name: "",
      code: "",
      description: "",
      parent_id: null,
      is_active: true,
      ...initialData,
    },
  });

  const [parents, setParents] = useState<DepartmentFormValues[]>([]);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const isEdit = Boolean(initialData?.id);

  /* --------------------------- Fetch parent list -------------------------- */
  useEffect(() => {
    let mounted = true;
    fetch("/api/hms/departments")
      .then((r) => r.json())
      .then((data) => mounted && setParents(Array.isArray(data) ? data : []))
      .catch(() => mounted && setParents([]));
    return () => {
      mounted = false;
    };
  }, []);

  /* ------------------------------ Submit ---------------------------------- */
  async function onSubmit(values: DepartmentFormValues) {
    try {
      const url = isEdit
        ? `/api/hms/departments/${initialData?.id}`
        : "/api/hms/departments";
      const method = isEdit ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });

      if (!res.ok) throw new Error("Failed to save department");

      const payload = await res.json();
      setSavedAt(new Date().toISOString());
      reset({ ...values, id: payload?.id ?? values.id });
    } catch (err) {
      console.error(err);
      alert("Unable to save department — check console for details.");
    }
  }

  /* ------------------------------ UI -------------------------------------- */
  return (
    <GlassCard title={isEdit ? "Edit Department" : "Create Department"}>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 text-white/90">
        {/* Name */}
        <div>
          <label className="block text-sm font-medium mb-1">Name</label>
          <input
            {...register("name", {
              required: "Name is required",
              minLength: { value: 2, message: "Too short" },
            })}
            className="w-full rounded-xl border border-white/10 bg-white/10 px-3 py-2 focus:ring-2 focus:ring-indigo-400 focus:outline-none placeholder:text-white/50"
            placeholder="e.g. Cardiology"
            aria-invalid={!!errors.name}
          />
          {errors.name && (
            <p className="text-rose-400 text-sm mt-1">
              {errors.name.message}
            </p>
          )}
        </div>

        {/* Code + Parent */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium mb-1">Code</label>
            <input
              {...register("code")}
              className="w-full rounded-xl border border-white/10 bg-white/10 px-3 py-2 placeholder:text-white/50"
              placeholder="e.g. CARD"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Parent Department
            </label>
            <select
              {...register("parent_id")}
              className="w-full rounded-xl border border-white/10 bg-white/10 px-3 py-2"
            >
              <option value="">— None —</option>
              {parents.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium mb-1">Description</label>
          <textarea
            {...register("description")}
            rows={3}
            className="w-full rounded-xl border border-white/10 bg-white/10 px-3 py-2 placeholder:text-white/50"
            placeholder="Optional description for internal use"
          />
        </div>

        {/* Active + Status */}
        <div className="flex items-center gap-4 text-sm">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              {...register("is_active")}
              className="accent-indigo-500"
            />
            <span>Active</span>
          </label>

          <div className="ml-auto text-xs text-zinc-400">
            {savedAt
              ? `Saved ${new Date(savedAt).toLocaleString()}`
              : isDirty
              ? "Unsaved changes"
              : "All changes saved"}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex items-center justify-center rounded-xl px-4 py-2 text-sm font-medium text-white shadow-sm ring-1 ring-white/10 focus:outline-none disabled:opacity-60"
            style={{
              background:
                "linear-gradient(180deg, rgba(255,255,255,0.08), rgba(255,255,255,0.02))",
            }}
          >
            {isSubmitting
              ? "Saving..."
              : isEdit
              ? "Save Changes"
              : "Create Department"}
          </button>

          <button
            type="button"
            onClick={() => reset()}
            className="rounded-xl px-4 py-2 text-sm ring-1 ring-white/10 hover:bg-white/5"
          >
            Reset
          </button>
        </div>
      </form>
    </GlassCard>
  );
}
