// web/app/dashboard/settings/taxes/TaxTypeList.tsx
"use client";

import React from "react";

type TaxType = {
  id: string;
  tenant_id?: string | null;
  name: string;
  code: string;
  description?: string | null;
  active?: boolean;
  created_at?: string;
  updated_at?: string;
};

type Props = {
  list: TaxType[];
  onEdit: (t: TaxType) => void;
  onDelete: (id: string) => void;
};

export default function TaxTypeList({ list, onEdit, onDelete }: Props): JSX.Element {
  if (!list || list.length === 0) return <p className="text-white/60">No tax types found.</p>;

  return (
    <div className="grid md:grid-cols-2 gap-4">
      {list.map((t) => (
        <div key={t.id} className="p-4 rounded-2xl bg-white/10 backdrop-blur border border-white/20">
          <h3 className="text-lg text-white font-bold">{t.name}</h3>
          <p className="text-white/60 text-sm">Code: {t.code}</p>
          <p className="text-white/60 text-xs">{t.description ?? "—"}</p>

          <div className="mt-3 flex gap-2">
            <button onClick={() => onEdit(t)} className="px-3 py-1 rounded-lg bg-blue-600 text-white">Edit</button>
            <button onClick={() => onDelete(t.id)} className="px-3 py-1 rounded-lg bg-red-600 text-white">Delete</button>
          </div>
        </div>
      ))}
    </div>
  );
}
