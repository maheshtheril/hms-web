// /app/dashboard/inventory/suppliers/page.tsx
"use client";

import TableCard from "../../components/TableCard";

export default function SupplierCatalog() {
  return (
    <TableCard
      title="Suppliers"
      columns={[
        "Supplier",
        "Contact",
        "Products",
        "Last Purchase",
        "Status",
      ]}
    />
  );
}
