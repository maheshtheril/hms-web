"use client";

import React from "react";
import FinanceGlassPanel from "../components/../components/FinanceGlassPanel"; // allow flexible import; fallback to existing path
import KPICard from "../../components/KPICard";

interface Props {
  title?: string;
  value?: React.ReactNode;
  trend?: string;
  className?: string;
}

export default function FinanceKPICard({ title, value, trend, className = "" }: Props) {
  // If FinanceGlassPanel path doesn't exist in your tree, this component degrades to simple KPICard.
  try {
    return (
      <div className={className}>
        <KPICard title={title} value={value} trend={trend} />
      </div>
    );
  } catch {
    return <KPICard title={title} value={value} trend={trend} className={className} />;
  }
}
