// /app/dashboard/pharmacy/catalog/page.tsx
"use client";

import TableCard from "../../components/TableCard";

export default function DrugCatalog() {
  return (
    <TableCard
      title="Drug Catalog"
      columns={[
        "Drug Name",
        "Category",
        "Form",
        "Strength",
        "Price",
        "Status",
      ]}
    />
  );
}
