"use client";

import React from "react";
import GlassPanel from "./GlassPanel";

interface TableCardProps {
  title?: React.ReactNode;
  columns?: string[];
  className?: string;
}

/**
 * TableCard
 * - Typed props (no implicit any)
 * - Lightweight empty-state fallback
 * - Uses your GlassPanel wrapper for consistent Neural Glass styling
 */
const TableCard: React.FC<TableCardProps> = ({
  title,
  columns = [],
  className = "",
}) => {
  return (
    <GlassPanel title={title}>
      <div className={`overflow-x-auto ${className}`}>
        <table className="w-full text-left text-sm opacity-90">
          <thead className="opacity-60">
            <tr>
              {columns.map((c) => (
                <th key={c} className="pb-2 pr-4">
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr className="opacity-40">
              <td colSpan={Math.max(1, columns.length)} className="py-6 text-center">
                No data
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </GlassPanel>
  );
};

export default TableCard;
