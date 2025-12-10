"use client";

import { useEffect, useState } from "react";

export default function StockAnalytics() {
  const [productId, setProductId] = useState("");
  const [forecast, setForecast] = useState<any>(null);
  const [reorder, setReorder] = useState<any>(null);

  async function load() {
    if (!productId) return;

    const f = await fetch(`/api/analytics/forecast/${productId}`).then((r) =>
      r.json()
    );
    const r = await fetch(`/api/analytics/reorder/${productId}`).then((r) =>
      r.json()
    );

    setForecast(f);
    setReorder(r);
  }

  return (
    <div className="p-10 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Stock Intelligence</h1>

      <input
        className="px-4 py-2 border rounded-xl mb-4"
        placeholder="Enter Product ID"
        value={productId}
        onChange={(e) => setProductId(e.target.value)}
      />

      <button
        onClick={load}
        className="px-4 py-2 bg-blue-600 text-white rounded-xl"
      >
        Analyze
      </button>

      {forecast && reorder && (
        <div className="mt-10 grid grid-cols-2 gap-6">

          <div className="p-6 bg-white/70 rounded-2xl shadow">
            <h2 className="text-xl font-semibold">Forecast</h2>
            <p className="mt-2">Daily: {forecast.daily_forecast}</p>
            <p>Monthly: {forecast.monthly_forecast}</p>
          </div>

          <div className="p-6 bg-white/70 rounded-2xl shadow">
            <h2 className="text-xl font-semibold">Reorder</h2>
            <p className="mt-2">Stock: {reorder.stock}</p>
            <p>Reorder Point: {reorder.reorder_point}</p>
            <p className="font-bold text-green-600">
              Reorder Qty: {reorder.reorder_qty}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
