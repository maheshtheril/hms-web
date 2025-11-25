"use client";

import React, { useMemo, useState } from "react";

export type Column<T> = {
  key: string;
  label: string;
  width?: string;
  render?: (row: T) => React.ReactNode;
  numeric?: boolean;
};

interface Props<T> {
  columns: Column<T>[];
  data: T[];
  pageSize?: number;
  emptyMessage?: string;
  className?: string;
}

export default function FinanceTable<T extends Record<string, any>>({
  columns,
  data,
  pageSize = 20,
  emptyMessage = "No records",
  className = "",
}: Props<T>) {
  const [page, setPage] = useState(0);

  const pages = useMemo(() => {
    const p = Math.max(1, Math.ceil(data.length / pageSize));
    return p;
  }, [data.length, pageSize]);

  const visible = useMemo(() => {
    const start = page * pageSize;
    return data.slice(start, start + pageSize);
  }, [data, page, pageSize]);

  return (
    <div className={`w-full overflow-auto ${className}`}>
      <table className="w-full text-sm table-fixed">
        <thead>
          <tr className="text-left text-xs opacity-70">
            {columns.map((col) => (
              <th
                key={col.key}
                style={{ width: col.width }}
                className={`pb-2 pr-4 ${col.numeric ? "text-right" : ""}`}
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>

        <tbody>
          {visible.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="py-6 text-center opacity-60">
                {emptyMessage}
              </td>
            </tr>
          ) : (
            visible.map((row, idx) => (
              <tr key={idx} className="border-t border-white/6">
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className={`py-3 pr-4 align-top ${col.numeric ? "text-right" : ""}`}
                  >
                    {col.render ? col.render(row) : String(row[col.key] ?? "")}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>

      <div className="mt-4 flex items-center justify-between text-xs opacity-70">
        <div>
          Showing {Math.min(data.length, page * pageSize + 1)} -{" "}
          {Math.min(data.length, (page + 1) * pageSize)} of {data.length}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0}
            className="px-3 py-1 rounded-md bg-white/3 disabled:opacity-40"
          >
            Prev
          </button>
          <div>
            Page {page + 1} / {pages}
          </div>
          <button
            onClick={() => setPage((p) => Math.min(pages - 1, p + 1))}
            disabled={page >= pages - 1}
            className="px-3 py-1 rounded-md bg-white/3 disabled:opacity-40"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
