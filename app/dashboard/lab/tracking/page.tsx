// /app/dashboard/lab/tracking/page.tsx
"use client";

import TableCard from "../../components/TableCard";

export default function SampleTracking() {
  return (
    <TableCard
      title="Sample Tracking"
      columns={[
        "Sample ID",
        "Order ID",
        "Location",
        "Collected At",
        "Received At",
        "Status",
      ]}
    />
  );
}
