// web/app/dashboard/settings/components/SettingForm.tsx
"use client";

import { useMemo, useState } from "react";
import { localSchemas } from "../services/settings.api";

/**
 * This form tries to render friendly inputs if a local schema is registered.
 * If not, it falls back to a JSON editor.
 */

export default function SettingForm({ setting, onSave, saving }: any) {
  const key: string = setting.key;
  const schema = localSchemas[key]; // optional local schema

  // when schema present, map schema properties to inputs
  if (schema) {
    return <SchemaForm key={key} schema={schema} setting={setting} onSave={onSave} saving={saving} />;
  }

  return <JsonEditorForm setting={setting} onSave={onSave} saving={saving} />;
}

/* ---------- SchemaForm (simple mapping) ---------- */
function SchemaForm({ schema, setting, onSave, saving }: any) {
  // schema is simple description { properties: { field: { type, title } }, required: [] }
  const props = schema.properties || {};
  const initial = setting.value || {};
  const [form, setForm] = useState(() => ({ ...initial }));
  const [err, setErr] = useState<string | null>(null);

  function setField(k: string, v: any) {
    setForm((s: any) => ({ ...s, [k]: v }));
  }

  async function handleSave() {
    try {
      // very basic validation: required
      if (Array.isArray(schema.required)) {
        for (const r of schema.required) {
          if (form[r] === undefined || form[r] === "") {
            throw new Error(`${r} is required`);
          }
        }
      }
      setErr(null);
      await onSave(form);
    } catch (e: any) {
      setErr(String(e?.message || e));
    }
  }

  return (
    <div>
      <div className="space-y-3">
        {Object.keys(props).map((k) => {
          const p = props[k];
          const val = form[k] ?? "";
          if (p.type === "boolean") {
            return (
              <label key={k} className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={!!val}
                  onChange={(e) => setField(k, e.target.checked)}
                  className="w-4 h-4"
                />
                <span className="text-sm">{p.title || k}</span>
              </label>
            );
          }
          if (p.type === "number" || p.type === "integer") {
            return (
              <div key={k}>
                <label className="text-sm block mb-1">{p.title || k}</label>
                <input
                  type="number"
                  value={String(val)}
                  onChange={(e) => setField(k, p.type === "integer" ? parseInt(e.target.value || "0") : parseFloat(e.target.value || "0"))}
                  className="w-full p-2 rounded border"
                />
              </div>
            );
          }
          // default: text
          return (
            <div key={k}>
              <label className="text-sm block mb-1">{p.title || k}</label>
              <input
                type="text"
                value={String(val)}
                onChange={(e) => setField(k, e.target.value)}
                className="w-full p-2 rounded border"
              />
            </div>
          );
        })}
      </div>

      {err && <div className="text-red-500 text-sm mt-2">{err}</div>}

      <div className="mt-3 flex gap-2">
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-3 py-2 rounded bg-gradient-to-r from-blue-500 to-purple-500 text-white"
        >
          {saving ? "Saving..." : "Save"}
        </button>
      </div>
    </div>
  );
}

/* ---------- JsonEditorForm (fallback) ---------- */
function JsonEditorForm({ setting, onSave, saving }: any) {
  const [text, setText] = useState(() => JSON.stringify(setting.value ?? {}, null, 2));
  const [err, setErr] = useState<string | null>(null);

  async function handleSave() {
    try {
      const parsed = JSON.parse(text);
      setErr(null);
      await onSave(parsed);
    } catch (e: any) {
      setErr("Invalid JSON: " + e.message);
    }
  }

  return (
    <div>
      <textarea
        className="w-full h-36 p-3 rounded border bg-black/5"
        value={text}
        onChange={(e) => setText(e.target.value)}
      />
      {err && <div className="text-red-500 text-sm mt-2">{err}</div>}
      <div className="mt-3">
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-3 py-2 rounded bg-gradient-to-r from-blue-500 to-purple-500 text-white"
        >
          {saving ? "Saving..." : "Save JSON"}
        </button>
      </div>
    </div>
  );
}
