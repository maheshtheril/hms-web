// /app/dashboard/billing/adjustments/page.tsx
"use client";

import TableCard from "../../components/TableCard";

export default function Adjustments() {
  return (
    <TableCard
      title="Adjustments / Write-Offs"
      columns={[
        "Adj ID",
        "Bill/Invoice",
        "Type",
        "Amount",
        "Reason",
        "Date",
      ]}
    />
  );
}
