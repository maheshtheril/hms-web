// app/dashboard/finance/trial-balance/page.tsx
"use client";

import FinanceTable, { FinanceColumn } from "../components/FinanceTable";

/** "Account Name" -> "account_name" */
function toAccessor(label: string) {
  return label.trim().toLowerCase().replace(/[^\w\s]/g, "").replace(/\s+/g, "_");
}

const HEADINGS = ["Account", "Debit", "Credit"];

const columns: FinanceColumn[] = HEADINGS.map((h) => ({
  key: toAccessor(h),
  label: h,
}));

export default function TrialBalance() {
  return <FinanceTable title="Trial Balance" columns={columns} data={[]} />;
}
