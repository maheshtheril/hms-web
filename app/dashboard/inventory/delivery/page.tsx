// /app/dashboard/inventory/delivery/page.tsx
"use client";

import TableCard from "../../components/TableCard";

export default function DeliveryOrders() {
  return (
    <TableCard
      title="Delivery Orders"
      columns={[
        "DO No.",
        "Customer",
        "Items",
        "Qty",
        "Date",
        "Status",
      ]}
    />
  );
}
