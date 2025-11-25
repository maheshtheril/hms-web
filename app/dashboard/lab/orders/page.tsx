// /app/dashboard/lab/orders/page.tsx
"use client";

import TableCard from "../../components/TableCard";

export default function LabOrders() {
  return (
    <TableCard
      title="Lab Orders"
      columns={[
        "Order ID",
        "Patient",
        "Tests",
        "Priority",
        "Status",
        "Created At"
      ]}
    />
  );
}
