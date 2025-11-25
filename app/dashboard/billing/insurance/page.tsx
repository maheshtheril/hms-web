// /app/dashboard/billing/insurance/page.tsx
"use client";

import TableCard from "../../components/TableCard";

export default function InsuranceClaims() {
  return (
    <TableCard
      title="Insurance Claims"
      columns={[
        "Claim No.",
        "Patient",
        "Policy No.",
        "Amount",
        "Claim Status",
        "Submitted At",
      ]}
    />
  );
}
