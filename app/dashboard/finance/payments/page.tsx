"use client";

import FinanceTable from "../components/FinanceTable";

export default function Payments() {
  return (
    <FinanceTable
      title="Payments"
      columns={["Receipt No", "Against", "Amount", "Mode", "Date"]}
    />
  );
}
