"use client";

import FinanceTable, { FinanceColumn } from "../components/FinanceTable";

function toAccessor(label: string) {
  return label.trim().toLowerCase().replace(/[^\w\s]/g, "").replace(/\s+/g, "_");
}

const HEADINGS = ["Receipt No", "Against", "Amount", "Mode", "Date"];

const columns: FinanceColumn[] = HEADINGS.map((h) => ({
  key: toAccessor(h),
  label: h,
}));

export default function Payments() {
  return <FinanceTable title="Payments" columns={columns} data={[]} />;
}
