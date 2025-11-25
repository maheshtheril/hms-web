"use client";

import FinanceKPICard from "./components/FinanceKPICard";
import FinanceGlassPanel from "./components/FinanceGlassPanel";

export default function FinanceDashboard() {
  return (
    <div className="space-y-6">
      {/* KPI Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <FinanceKPICard title="Total Revenue" value="₹48,20,000" trend="+14%" />
        <FinanceKPICard title="Expenses" value="₹19,65,000" trend="+3%" />
        <FinanceKPICard title="Net Profit" value="₹28,55,000" trend="+22%" />
        <FinanceKPICard title="Cash Balance" value="₹12,40,000" trend="+4%" />
      </div>

      {/* Reports Section */}
      <FinanceGlassPanel title="Quick Reports">
        <ul className="text-sm opacity-80 space-y-2">
          <li>• Monthly Financial Summary Generated</li>
          <li>• 8 Journal Entries Require Approval</li>
          <li>• 3 Bank Accounts Need Reconciliation</li>
        </ul>
      </FinanceGlassPanel>
    </div>
  );
}
