"use client";

import FinanceGlassPanel from "../components/FinanceGlassPanel";

export default function BalanceSheet() {
  return (
    <FinanceGlassPanel title="Balance Sheet">
      <div className="text-neutral-200 opacity-90">
        Assets, Liabilities, and Equity will appear here.
      </div>
    </FinanceGlassPanel>
  );
}
