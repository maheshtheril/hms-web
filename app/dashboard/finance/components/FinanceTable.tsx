"use client";

import React from "react";
import GlassPanel from "../../components/GlassPanel";

export type FinanceColumn = {
  key: string;
  label: string;
};

export type FinanceRow = Record<string, any>;

export type FinanceTableProps = {
  title?: string;
  columns: FinanceColumn[];
  data?: FinanceRow[];
};

export default function FinanceTable({ title, columns, data = [] }: FinanceTableProps) {
  return (
    <GlassPanel title={title}>
      <table className="w-full text-left text-sm">
        <thead className="opacity-60 border-b border-white/10">
          <tr>
            {columns.map((c) => (
              <th key={c.key} className="py-2 pr-4">
                {c.label}
              </th>
            ))}
          </tr>
        </thead>

        <tbody>
          {data.length === 0 ? (
            <tr>
              <td
                colSpan={columns.length}
                className="py-6 text-center opacity-40"
              >
                No records found
              </td>
            </tr>
          ) : (
            data.map((row, i) => (
              <tr key={i} className="border-b border-white/5 hover:bg-white/5 transition">
                {columns.map((col) => (
                  <td key={col.key} className="py-2 pr-4">
                    {row[col.key] ?? "—"}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </GlassPanel>
  );
}
