"use client";

import FinanceTable from "../components/FinanceTable";
import LedgerFilter from "../components/LedgerFilter";

export default function GeneralLedger() {
  return (
    <div className="space-y-6">
      <LedgerFilter />
      <FinanceTable
        title="General Ledger"
        columns={["Date", "Account", "Description", "Debit", "Credit", "Balance"]}
      />
    </div>
  );
}
