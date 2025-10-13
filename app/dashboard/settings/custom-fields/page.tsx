"use client";

import React, { useEffect, useMemo, useState } from "react";
import { apiClient } from "@/lib/api-client";

/* --------------------------------- Types ---------------------------------- */
type Json = Record<string, any> | null;

type CFieldDef = {
  id: string;
  tenant_id: string;
  company_id: string | null;
  pipeline_id: string | null;
  entity: string;
  key: string;
  label: string;
  field_type: string;
  options: Json;
  required: boolean;
  visible: boolean;
  sort_order: number;
  metadata: Json; // e.g., { section?: "General" | "Advanced" | string }
  created_by?: string | null;
  created_at?: string;
};

/* ---------------------------- Centralized Field Types ---------------------------- */
const FIELD_TYPES = [
  // basic
  "text",
  "textarea",
  "number",
  "boolean",
  "json",
  "date",
  "time",
  "datetime",

  // choices
  "select", // single
  "multiselect", // multiple
  "tags", // free-text chips (store array in value_json)

  // web/validation-friendly
  "email",
  "phone",
  "url",

  // business
  "currency",
  "percent",
  "rating",

  // files & media
  "file",
  "files",

  // rich / composite
  "richtext",
  "address", // stored as JSON
] as const;

/* ---------------------------- Options Editor ---------------------------- */
function OptionsEditor({
  type,
  options,
  onChange,
}: {
  type: string;
  options: any;
  onChange: (next: any) => void;
}) {
  const set = (patch: any) => onChange({ ...(options || {}), ...patch });

  if (type === "select" || type === "multiselect") {
    const list = Array.isArray(options?.choices) ? options.choices : [];
    return (
      <div className="col-span-2 space-y-2">
        <div className="text-sm text-white/70">Choices (comma separated)</div>
        <input
          className="mt-1 w-full rounded-md bg-black/40 border border-white/10 p-2 text-sm text-white"
          placeholder="Small, Medium, Large"
          value={list.join(",")}
          onChange={(e) =>
            set({
              choices: e.target.value
                .split(",")
                .map((s) => s.trim())
                .filter(Boolean),
            })
          }
        />
        <div className="text-xs text-white/40">
          Saved into <code>options.choices</code>. Value is a string (select) or string[] (multiselect).
        </div>
      </div>
    );
  }

  if (type === "tags") {
    return (
      <div className="col-span-2 grid grid-cols-2 gap-3">
        <label className="text-sm text-white/70">
          Delimiter (display hint)
          <input
            className="mt-1 w-full rounded-md bg-black/40 border border-white/10 p-2 text-sm text-white"
            placeholder=","
            value={options?.delimiter ?? ","}
            onChange={(e) => set({ delimiter: e.target.value || "," })}
          />
        </label>
        <label className="text-sm text-white/70">
          Max tags (optional)
          <input
            type="number"
            min={1}
            className="mt-1 w-full rounded-md bg-black/40 border border-white/10 p-2 text-sm text-white"
            value={options?.max ?? ""}
            onChange={(e) => set({ max: e.target.value === "" ? undefined : Number(e.target.value) })}
          />
        </label>
        <div className="col-span-2 text-xs text-white/40">
          Stored in <code>value_json</code> as an array of strings.
        </div>
      </div>
    );
  }

  if (["number", "currency", "percent", "rating"].includes(type)) {
    return (
      <div className="grid grid-cols-3 gap-3 col-span-2">
        <label className="text-sm text-white/70">
          Min
          <input
            type="number"
            className="mt-1 w-full rounded-md bg-black/40 border border-white/10 p-2 text-sm text-white"
            value={options?.min ?? ""}
            onChange={(e) => set({ min: e.target.value === "" ? undefined : Number(e.target.value) })}
          />
        </label>
        <label className="text-sm text-white/70">
          Max
          <input
            type="number"
            className="mt-1 w-full rounded-md bg-black/40 border border-white/10 p-2 text-sm text-white"
            value={options?.max ?? ""}
            onChange={(e) => set({ max: e.target.value === "" ? undefined : Number(e.target.value) })}
          />
        </label>
        <label className="text-sm text-white/70">
          Step
          <input
            type="number"
            className="mt-1 w-full rounded-md bg-black/40 border border-white/10 p-2 text-sm text-white"
            value={options?.step ?? ""}
            onChange={(e) => set({ step: e.target.value === "" ? undefined : Number(e.target.value) })}
          />
        </label>
        {type === "percent" && <div className="col-span-3 text-xs text-white/40">Hint: percent usually 0–100.</div>}
        {type === "rating" && (
          <div className="col-span-3 text-xs text-white/40">Common rating scale: 1–5 (store in <code>value_number</code>).</div>
        )}
      </div>
    );
  }

  if (type === "file" || type === "files") {
    return (
      <div className="grid grid-cols-2 gap-3 col-span-2">
        <label className="text-sm text-white/70">
          Accept (MIME or extensions)
          <input
            className="mt-1 w-full rounded-md bg-black/40 border border-white/10 p-2 text-sm text-white"
            placeholder="image/*,application/pdf"
            value={options?.accept ?? ""}
            onChange={(e) => set({ accept: e.target.value })}
          />
        </label>
        <label className="text-sm text-white/70">
          Max size (MB)
          <input
            type="number"
            min={1}
            className="mt-1 w-full rounded-md bg-black/40 border border-white/10 p-2 text-sm text-white"
            value={options?.max_size_mb ?? 10}
            onChange={(e) => set({ max_size_mb: Number(e.target.value || 10) })}
          />
        </label>
        <div className="col-span-2 text-xs text-white/40">
          Files go to object storage; field value stores metadata in <code>value_json</code>.
        </div>
      </div>
    );
  }

  if (type === "address") {
    return (
      <div className="col-span-2 text-sm text-white/70">
        Stored as JSON with fields: <code>line1, line2, city, state, postal_code, country</code>.
      </div>
    );
  }

  if (type === "richtext") {
    return (
      <div className="col-span-2 text-sm text-white/70">
        Stored as string (HTML/Markdown) or JSON (use <code>value_json</code> for structured).
      </div>
    );
  }

  return null;
}

/* ------------------------------ Page Component ------------------------------ */
export default function CustomFieldsPage() {
  const [items, setItems] = useState<CFieldDef[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  // modal (create/edit)
  const [formOpen, setFormOpen] = useState(false);
  const [mode, setMode] = useState<"create" | "edit">("create");
  const [editingId, setEditingId] = useState<string | null>(null);

  // form state
  const [entity, setEntity] = useState("lead");
  const [keyv, setKeyv] = useState("");
  const [label, setLabel] = useState("");
  const [fieldType, setFieldType] = useState<string>("text");
  const [required, setRequired] = useState(false);
  const [visible, setVisible] = useState(true);
  const [sortOrder, setSortOrder] = useState(100);
  const [metadata, setMetadata] = useState<{ section?: string }>({ section: "Advanced" });
  const [options, setOptions] = useState<any>({});

  // ----------------------------------------------------------------------------
  // API
  // ----------------------------------------------------------------------------
  // GET list
async function load() {
  setLoading(true);
  setErr(null);
  try {
    const { data } = await apiClient.get("/admin/custom-fields", { params: { entity: "lead" } });
    setItems(data.items || []);
  } catch (e: any) {
    setErr(e?.response?.data?.error || e.message || "Error");
  } finally {
    setLoading(false);
  }
}

// POST create
async function createField() {
  const body = {
    entity,
    key: keyv.trim(),
    label: label.trim(),
    field_type: fieldType,
    required,
    visible,
    sort_order: Number(sortOrder) || 100,
    metadata,
    options: options && Object.keys(options).length ? options : null,
  };
  await apiClient.post("/admin/custom-fields", body);
}

// PATCH update (partial)
async function patchField(id: string, patch: Partial<CFieldDef>) {
  await apiClient.patch(`/admin/custom-fields/${id}`, patch);
}

// DELETE
async function deleteField(id: string) {
  await apiClient.delete(`/admin/custom-fields/${id}`);
}

  // ----------------------------------------------------------------------------
  // Lifecycle
  // ----------------------------------------------------------------------------
  useEffect(() => {
    load();
  }, []);

  // ----------------------------------------------------------------------------
  // Helpers
  // ----------------------------------------------------------------------------
  const resetForm = () => {
    setEntity("lead");
    setKeyv("");
    setLabel("");
    setFieldType("text");
    setRequired(false);
    setVisible(true);
    setSortOrder(100);
    setMetadata({ section: "Advanced" });
    setOptions({});
    setEditingId(null);
  };

  const openCreate = () => {
    resetForm();
    setMode("create");
    setFormOpen(true);
  };

  const openEdit = (f: CFieldDef) => {
    setMode("edit");
    setEditingId(f.id);
    setEntity(f.entity);
    setKeyv(f.key);
    setLabel(f.label);
    setFieldType(f.field_type);
    setRequired(!!f.required);
    setVisible(!!f.visible);
    setSortOrder(f.sort_order ?? 100);
    setMetadata(typeof f.metadata === "object" && f.metadata ? f.metadata : { section: "Advanced" });
    setOptions(typeof f.options === "object" && f.options ? f.options : {});
    setFormOpen(true);
  };

  const handleSubmit = async () => {
    try {
      if (mode === "create") {
        await createField();
      } else if (mode === "edit" && editingId) {
        const patch: Partial<CFieldDef> = {
          entity,
          key: keyv.trim(),
          label: label.trim(),
          field_type: fieldType,
          required,
          visible,
          sort_order: Number(sortOrder) || 100,
          metadata,
          options: options && Object.keys(options).length ? options : null,
        };
        await patchField(editingId, patch);
      }
      setFormOpen(false);
      resetForm();
      await load();
    } catch (e: any) {
      alert(e.message || "Save failed");
    }
  };

  const fields = useMemo(
    () => [...items].sort((a, b) => a.sort_order - b.sort_order || a.label.localeCompare(b.label)),
    [items]
  );

  // inline quick updates
  const toggleBoolean = async (f: CFieldDef, prop: "required" | "visible") => {
    try {
      // optimistic
      setItems((prev) =>
        prev.map((x) => (x.id === f.id ? { ...x, [prop]: !x[prop] } : x))
      );
      await patchField(f.id, { [prop]: !f[prop] } as any);
    } catch (e: any) {
      // revert
      setItems((prev) => prev.map((x) => (x.id === f.id ? { ...x, [prop]: f[prop] } : x)));
      alert(e.message || "Update failed");
    }
  };

  const updateSort = async (f: CFieldDef, next: number) => {
    if (Number.isNaN(next)) return;
    try {
      setItems((prev) => prev.map((x) => (x.id === f.id ? { ...x, sort_order: next } : x)));
      await patchField(f.id, { sort_order: next });
      setItems((prev) => [...prev].sort((a, b) => a.sort_order - b.sort_order));
    } catch (e: any) {
      alert(e.message || "Update failed");
      await load();
    }
  };

  // ----------------------------------------------------------------------------
  // Render
  // ----------------------------------------------------------------------------
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-white">Custom Fields</h1>
        <button
          onClick={openCreate}
          className="rounded-lg border border-white/15 bg-white/10 hover:bg-white/15 px-3 py-1.5 text-sm text-white"
        >
          + Add Field
        </button>
      </div>

      {err && <div className="text-red-400 text-sm">{err}</div>}

      {loading ? (
        <div className="text-white/70">Loading…</div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-white/10">
          <table className="min-w-full text-sm">
            <thead className="bg-white/5">
              <tr className="text-left text-white/70">
                <th className="px-3 py-2">Label</th>
                <th className="px-3 py-2">Key</th>
                <th className="px-3 py-2">Type</th>
                <th className="px-3 py-2">Required</th>
                <th className="px-3 py-2">Visible</th>
                <th className="px-3 py-2">Sort</th>
                <th className="px-3 py-2">Section</th>
                <th className="px-3 py-2 w-40"></th>
              </tr>
            </thead>
            <tbody>
              {fields.map((f) => (
                <tr key={f.id} className="border-t border-white/10 text-white/90">
                  <td className="px-3 py-2">{f.label}</td>
                  <td className="px-3 py-2 font-mono text-white/80">{f.key}</td>
                  <td className="px-3 py-2">{f.field_type}</td>
                  <td className="px-3 py-2">
                    <button
                      onClick={() => toggleBoolean(f, "required")}
                      className={`px-2 py-1 rounded border ${
                        f.required
                          ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-200"
                          : "bg-white/5 border-white/15 text-white/70"
                      }`}
                      title="Toggle required"
                    >
                      {f.required ? "Yes" : "No"}
                    </button>
                  </td>
                  <td className="px-3 py-2">
                    <button
                      onClick={() => toggleBoolean(f, "visible")}
                      className={`px-2 py-1 rounded border ${
                        f.visible
                          ? "bg-sky-500/20 border-sky-500/40 text-sky-200"
                          : "bg-white/5 border-white/15 text-white/70"
                      }`}
                      title="Toggle visible"
                    >
                      {f.visible ? "Yes" : "No"}
                    </button>
                  </td>
                  <td className="px-3 py-2">
                    <input
                      type="number"
                      className="w-20 rounded-md bg-black/40 border border-white/10 p-1 text-sm text-white"
                      value={f.sort_order}
                      onChange={(e) => {
                        const v = parseInt(e.target.value, 10);
                        if (!Number.isNaN(v)) {
                          setItems((prev) => prev.map((x) => (x.id === f.id ? { ...x, sort_order: v } : x)));
                        }
                      }}
                      onBlur={(e) => {
                        const v = parseInt(e.target.value, 10);
                        updateSort(f, Number.isNaN(v) ? f.sort_order : v);
                      }}
                    />
                  </td>
                  <td className="px-3 py-2">{(f.metadata as any)?.section || <span className="text-white/40">—</span>}</td>
                  <td className="px-3 py-2 flex items-center gap-3">
                    <button
                      onClick={() => openEdit(f)}
                      className="text-white/90 hover:underline"
                      title="Edit"
                    >
                      Edit
                    </button>
                    <button
                      onClick={async () => {
                        if (!confirm(`Delete field "${f.label}"?`)) return;
                        try {
                          await deleteField(f.id);
                          await load();
                        } catch (e: any) {
                          alert(e.message || "Delete failed");
                        }
                      }}
                      className="text-red-300 hover:text-red-200"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
              {fields.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-3 py-10 text-center text-white/50">
                    No fields yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* ---------------------------- Create/Edit Modal ---------------------------- */}
      {formOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => {
            setFormOpen(false);
            resetForm();
          }}
        >
          <div
            className="w-full max-w-2xl rounded-xl border border-white/10 bg-[#0b0b0b] p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-lg font-semibold text-white mb-4">
              {mode === "create" ? "Create Custom Field" : "Edit Custom Field"}
            </h2>

            <div className="grid grid-cols-2 gap-3">
              <label className="text-sm text-white/70">
                Entity
                <select
                  value={entity}
                  onChange={(e) => setEntity(e.target.value)}
                  className="mt-1 w-full rounded-md bg-black/40 border border-white/10 p-2 text-sm text-white"
                >
                  <option value="lead">lead</option>
                </select>
              </label>

              <label className="text-sm text-white/70">
                Key
                <input
                  value={keyv}
                  onChange={(e) => setKeyv(e.target.value)}
                  placeholder="budget_inr"
                  className="mt-1 w-full rounded-md bg-black/40 border border-white/10 p-2 text-sm text-white"
                />
              </label>

              <label className="text-sm text-white/70 col-span-2">
                Label
                <input
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  placeholder="Budget (₹)"
                  className="mt-1 w-full rounded-md bg-black/40 border border-white/10 p-2 text-sm text-white"
                />
              </label>

              <label className="text-sm text-white/70">
                Field Type
                <select
                  value={fieldType}
                  onChange={(e) => {
                    setFieldType(e.target.value);
                    setOptions({});
                  }}
                  className="mt-1 w-full rounded-md bg-black/40 border border-white/10 p-2 text-sm text-white"
                >
                  {FIELD_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </label>

              <label className="text-sm text-white/70">
                Sort Order
                <input
                  type="number"
                  value={sortOrder}
                  onChange={(e) => setSortOrder(parseInt(e.target.value, 10))}
                  className="mt-1 w-full rounded-md bg-black/40 border border-white/10 p-2 text-sm text-white"
                />
              </label>

              <label className="flex items-center gap-2 text-sm text-white/70">
                <input type="checkbox" checked={required} onChange={(e) => setRequired(e.target.checked)} />
                Required
              </label>

              <label className="flex items-center gap-2 text-sm text-white/70">
                <input type="checkbox" checked={visible} onChange={(e) => setVisible(e.target.checked)} />
                Visible
              </label>

              <label className="text-sm text-white/70 col-span-2">
                Metadata (section)
                <input
                  value={metadata.section ?? ""}
                  onChange={(e) => setMetadata({ ...metadata, section: e.target.value || undefined })}
                  placeholder="Advanced or General"
                  className="mt-1 w-full rounded-md bg-black/40 border border-white/10 p-2 text-sm text-white"
                />
              </label>

              <div className="col-span-2 border-t border-white/10 pt-4">
                <div className="text-sm font-medium text-white mb-2">Type Options</div>
                <div className="grid grid-cols-2 gap-3">
                  <OptionsEditor type={fieldType} options={options} onChange={setOptions} />
                </div>
              </div>
            </div>

            <div className="mt-5 flex items-center justify-end gap-2">
              <button
                onClick={() => {
                  setFormOpen(false);
                  resetForm();
                }}
                className="rounded-md border border-white/10 px-3 py-1.5 text-sm text-white/80 hover:bg-white/10"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                className="rounded-md bg-white/10 hover:bg-white/15 border border-white/10 px-3 py-1.5 text-sm text-white"
              >
                {mode === "create" ? "Create" : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
