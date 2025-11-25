"use client";

import FinanceTable from "../components/FinanceTable";

export default function TrialBalance() {
  return (
    <FinanceTable
      title="Trial Balance"
      columns={["Account", "Debit", "Credit"]}
    />
  );
}
