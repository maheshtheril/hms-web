"use client";

import FinanceGlassPanel from "../components/FinanceGlassPanel";

export default function ProfitLoss() {
  return (
    <FinanceGlassPanel title="Profit & Loss Statement">
      <div className="text-neutral-200 opacity-90">
        Revenue, COGS, Gross Profit, Operating Expenses, Net Profit.
      </div>
    </FinanceGlassPanel>
  );
}
