// /app/dashboard/billing/page.tsx
"use client";

import KPICard from "../components/KPICard";
import ChartCard from "../components/ChartCard";
import GlassPanel from "../components/GlassPanel";

export default function BillingDashboard() {
  return (
    <div className="space-y-6">
      {/* KPI ROW */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <KPICard title="Today's Revenue" value="₹2,40,000" trend="+12%" />
        <KPICard title="Pending Bills" value="38" trend="+3%" />
        <KPICard title="Insurance Claims" value="19" trend="+8%" />
        <KPICard title="Refund Requests" value="4" trend="-5%" />
      </div>

      {/* CHARTS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <ChartCard title="Revenue Distribution (OPD/IPD/Lab/Imaging)" />
        <ChartCard title="Payments Received (Daily)" />
      </div>

      <GlassPanel title="Alerts">
        <ul className="space-y-2 opacity-80 text-sm">
          <li>⚠ 12 insurance claims pending for &gt; 7 days</li>
          <li>⚠ 3 high-value bills pending doctor confirmation</li>
          <li>⚠ 2 invoices approaching due date</li>
        </ul>
      </GlassPanel>
    </div>
  );
}
