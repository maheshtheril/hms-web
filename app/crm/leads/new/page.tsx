// app/crm/leads/new/page.tsx
import { Suspense } from "react";
import ClientEntry from "./ClientEntry";

// Prevent static prerender; this page depends on runtime search params
export const dynamic = "force-dynamic";
export const revalidate = 0;
export const dynamicParams = true;

export default function Page() {
  return (
    <Suspense fallback={<div className="p-8">Loading…</div>}>
      <ClientEntry />
    </Suspense>
  );
}
