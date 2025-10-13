import { Suspense } from "react";
import ClientEntry from "./ClientEntry";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default function Page() {
  return (
    <Suspense fallback={<div className="p-4">Loading…</div>}>
      <ClientEntry />
    </Suspense>
  );
}
