"use client";

import FinanceTable from "../components/FinanceTable";

export default function Journals() {
  return (
    <FinanceTable
      title="Journal Entries"
      columns={["Entry No", "Date", "Reference", "Debits", "Credits", "Status"]}
    />
  );
}
