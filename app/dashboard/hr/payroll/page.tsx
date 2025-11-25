// /app/dashboard/hr/payroll/page.tsx
"use client";

import TableCard from "../../components/TableCard";

export default function Payroll() {
  return (
    <TableCard
      title="Payroll Overview"
      columns={[
        "Employee",
        "Month",
        "Gross Pay",
        "Deductions",
        "Net Pay",
        "Status",
      ]}
    />
  );
}
