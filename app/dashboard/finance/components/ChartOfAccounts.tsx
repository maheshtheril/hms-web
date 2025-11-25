"use client";

import React from "react";
import FinanceGlassPanel from "./FinanceGlassPanel";
import FinanceTable, { Column } from "./FinanceTable";

type Account = {
  id: string;
  code?: string;
  name: string;
  type?: string;
  balance?: number;
};

interface Props {
  accounts: Account[];
  onSelect?: (a: Account) => void;
}

export default function ChartOfAccounts({ accounts, onSelect }: Props) {
  const columns: Column<Account>[] = [
    { key: "code", label: "Code", width: "120px" },
    { key: "name", label: "Account" },
    { key: "type", label: "Type", width: "140px" },
    {
      key: "balance",
      label: "Balance",
      numeric: true,
      render: (r) => (Number(r.balance || 0)).toFixed(2),
      width: "140px",
    },
  ];

  return (
    <FinanceGlassPanel title="Chart of Accounts" subtitle="Master accounts and balances">
      <FinanceTable columns={columns} data={accounts} />
    </FinanceGlassPanel>
  );
}
