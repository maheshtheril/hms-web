"use client";

import FinanceTable from "../components/FinanceTable";

export default function ChartOfAccounts() {
  return (
    <FinanceTable
      title="Chart of Accounts"
      columns={["Code", "Name", "Type", "Parent", "Balance"]}
    />
  );
}
