// web/app/dashboard/settings/taxes/page.tsx
"use client";

import { useEffect, useState } from "react";
import { TaxTypesAPI } from "./../apiTaxTypes";
import TaxTypeList from "./TaxTypeList";
import TaxTypeEditor, { TaxType } from "./TaxTypeEditor";

export default function TaxTypesPage(): JSX.Element {
  // explicit types
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [list, setList] = useState<TaxType[]>([]);
  const [editing, setEditing] = useState<Partial<TaxType> | null>(null);

  useEffect(() => {
    const s = (window as any).__SESSION;
    setTenantId(s?.tenantId ?? null);
  }, []);

  async function load(): Promise<void> {
    if (!tenantId) return;
    try {
      const rows = await TaxTypesAPI.list(tenantId);
      setList(Array.isArray(rows) ? rows : []);
    } catch (err) {
      console.error("Failed to load tax types", err);
      setList([]);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenantId]);

  return (
    <div className="p-6 space-y-4">
      <div className="flex justify-between">
        <h1 className="text-2xl text-white">Tax Types</h1>
        <button
          onClick={() => setEditing({})}
          className="px-4 py-2 rounded-xl bg-gradient-to-r from-blue-500 to-purple-500 text-white"
        >
          + Add Tax Type
        </button>
      </div>

      <TaxTypeList
        list={list}
        onEdit={(t) => setEditing(t)}
        onDelete={async (id: string) => {
          try {
            await TaxTypesAPI.remove(id, tenantId ?? undefined);
            await load();
          } catch (err) {
            console.error("Failed to delete tax type", err);
          }
        }}
      />

      {editing !== null && (
        <TaxTypeEditor
          initial={editing}
          onSave={async (data) => {
            try {
              if ((editing as Partial<TaxType>).id) {
                await TaxTypesAPI.update((editing as TaxType).id, data, tenantId ?? undefined);
              } else {
                await TaxTypesAPI.create(data, tenantId ?? undefined);
              }
              setEditing(null);
              await load();
            } catch (err) {
              console.error("Failed to save tax type", err);
              throw err;
            }
          }}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}
