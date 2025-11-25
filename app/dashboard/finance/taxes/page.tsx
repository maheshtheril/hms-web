"use client";

import React from "react";

export type FinanceColumn = {
  key: string;        // accessor
  label: string;      // column display name
};

export type FinanceTableProps = {
  title?: string;
  columns: FinanceColumn[];
  data?: Record<string, any>[];
};

export default function FinanceTable({
  title,
  columns,
  data = [],
}: FinanceTableProps) {
  return (
    <section className="mb-8">
      {title && (
        <h2 className="text-lg font-semibold mb-4 text-white/90">{title}</h2>
      )}

      <div className="rounded-xl backdrop-blur-xl bg-white/5 border border-white/10 p-4 shadow-lg">
        <table className="w-full text-sm">
          <thead>
            <tr>
              {columns.map((c) => (
                <th
                  key={c.key}
                  className="py-2 text-left opacity-70 font-medium"
                >
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
                  No records
                </td>
              </tr>
            ) : (
              data.map((row, i) => (
                <tr key={i} className="border-t border-white/10">
                  {columns.map((col) => (
                    <td key={col.key} className="py-2">
                      {String(row[col.key] ?? "—")}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
