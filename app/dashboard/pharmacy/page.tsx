// /app/dashboard/pharmacy/page.tsx
"use client";

import KPICard from "../components/KPICard";
import ChartCard from "../components/ChartCard";
import GlassPanel from "../components/GlassPanel";

export default function PharmacyDashboard() {
  return (
    <div className="space-y-6">
      {/* KPI Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <KPICard title="Today's Dispenses" value="142" trend="+6%" />
        <KPICard title="Low Stock Items" value="12" trend="+2%" />
        <KPICard title="Expired Items" value="3" trend="+1%" />
        <KPICard title="Purchase Pending" value="5" trend="-1%" />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <ChartCard title="Top Dispensed Medicines" />
        <ChartCard title="Stock Movement" />
      </div>

      <GlassPanel title="Alerts & Warnings">
        <ul className="space-y-2 opacity-80 text-sm">
          <li>⚠ Paracetamol: Low stock</li>
          <li>⚠ Amoxicillin: Batch expiring soon</li>
          <li>⚠ ORS Powder: High demand today</li>
        </ul>
      </GlassPanel>
    </div>
  );
}
