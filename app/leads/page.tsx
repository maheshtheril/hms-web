// app/leads/page.tsx
import dynamic from "next/dynamic";
import React from "react";

const LeadsClient = dynamic(() => import("./LeadsClient"), { ssr: false });

export const metadata = { title: "Leads" };

export default function Page() {
  return <LeadsClient />;
}
