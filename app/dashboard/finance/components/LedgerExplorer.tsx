"use client";

import React from "react";
import FinanceGlassPanel from "./FinanceGlassPanel";
import FinanceTable, { Column } from "./FinanceTable";

type LedgerRow = {
  date: string;
  ref?: string;
  narration?: string;
  debit?: number;
  credit?: number;
  balance?: number;
};

interface Props {
  rows: LedgerRow[];
  accountName?: string;
}

export default function LedgerExplorer({ rows, accountName }: Props) {
  const cols: Column<LedgerRow>[] = [
    { key: "date", label: "Date", width: "120px" },
    { key: "ref", label: "Ref", width: "120px" },
    { key: "narration", label: "Narration" },
    { key: "debit", label: "Debit", width: "120px", numeric: true, render: (r) => Number(r.debit || 0).toFixed(2) },
    { key: "credit", label: "Credit", width: "120px", numeric: true, render: (r) => Number(r.credit || 0).toFixed(2) },
    { key: "balance", label: "Balance", width: "140px", numeric: true, render: (r) => Number(r.balance || 0).toFixed(2) },
  ];

  return (
    <FinanceGlassPanel title={`Ledger — ${accountName ?? "Account"}`}>
      <FinanceTable columns={cols} data={rows} />
    </FinanceGlassPanel>
  );
}
