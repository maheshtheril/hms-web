"use client";

import FinanceTable from "../components/FinanceTable";

export default function Taxes() {
  return (
    <FinanceTable
      title="Taxes"
      columns={["Tax Type", "Rate", "Category", "Country", "Status"]}
    />
  );
}
