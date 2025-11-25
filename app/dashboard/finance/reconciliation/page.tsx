"use client";

import FinanceGlassPanel from "../components/FinanceGlassPanel";

export default function Reconciliation() {
  return (
    <FinanceGlassPanel title="Bank Reconciliation">
      <div className="opacity-90 text-neutral-200">
        Select bank, import statements, match entries.
      </div>
    </FinanceGlassPanel>
  );
}
