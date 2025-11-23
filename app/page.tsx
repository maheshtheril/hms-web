// /web/app/page.tsx
import React from "react";

export default function Page() {
  return (
    <div>
      <h1 className="text-3xl font-semibold mb-4">Dashboard</h1>

      <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="rounded-2xl p-6 bg-white/5">
          <h2 className="font-medium">Quick stats</h2>
          <p className="text-sm text-white/70 mt-2">This is a placeholder dashboard. Replace with real widgets.</p>
        </div>

        <div className="rounded-2xl p-6 bg-white/5">
          <h2 className="font-medium">Recent activity</h2>
          <p className="text-sm text-white/70 mt-2">Recent invoices, orders and HMS activity.</p>
        </div>
      </section>
    </div>
  );
}
