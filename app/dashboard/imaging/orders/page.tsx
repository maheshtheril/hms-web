// /app/dashboard/imaging/orders/page.tsx
"use client";

import TableCard from "../../components/TableCard";

export default function ImagingOrders() {
  return (
    <TableCard
      title="Imaging Orders"
      columns={[
        "Order ID",
        "Patient",
        "Modality",
        "Study",
        "Priority",
        "Status",
        "Created At",
      ]}
    />
  );
}
