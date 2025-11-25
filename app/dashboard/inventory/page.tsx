// /app/dashboard/inventory/page.tsx
"use client";

import KPICard from "../components/KPICard";
import ChartCard from "../components/ChartCard";
import GlassPanel from "../components/GlassPanel";

export default function InventoryDashboard() {
  return (
    <div className="space-y-8">
      
      {/* KPI Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <KPICard title="Total Products" value="842" trend="+3%" />
        <KPICard title="Stock Value" value="₹23,48,200" trend="+8%" />
        <KPICard title="Low Stock Items" value="19" trend="+1%" />
        <KPICard title="Expired / Near Expiry" value="7" trend="+2%" />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <ChartCard title="Stock Distribution (Warehouse Wise)" />
        <ChartCard title="Incoming vs Outgoing (Monthly)" />
      </div>

      <GlassPanel title="Inventory Alerts">
        <ul className="space-y-2 opacity-80 text-sm">
          <li>⚠ 10 products below minimum stock</li>
          <li>⚠ 3 items expiring this week</li>
          <li>⚠ 1 warehouse audit overdue</li>
        </ul>
      </GlassPanel>

    </div>
  );
}
