// web/app/hms/products/components/BatchTable.tsx
export default function BatchTable({ batches, setBatches }: any) {
  const add = () =>
    setBatches([...batches, { batch_no: "", expiry_date: "", qty_on_hand: 0 }]);

  const update = (i: number, k: string, v: any) =>
    setBatches(batches.map((b: any, idx: number) =>
      idx === i ? { ...b, [k]: v } : b
    ));

  return (
    <div className="mt-10">
      <button
        onClick={add}
        className="px-4 py-2 mb-4 bg-blue-600 text-white rounded-xl"
      >
        Add Batch
      </button>

      <table className="w-full bg-white/70 rounded-xl overflow-hidden border">
        <thead>
          <tr className="bg-gray-100">
            <th className="p-3">Batch No</th>
            <th className="p-3">Expiry</th>
            <th className="p-3">Qty</th>
          </tr>
        </thead>
        <tbody>
          {batches.map((b: any, i: number) => (
            <tr key={i} className="border-b">
              <td className="p-3">
                <input
                  value={b.batch_no}
                  onChange={(e) => update(i, "batch_no", e.target.value)}
                  className="bg-white/60 rounded px-2 py-1 border"
                />
              </td>
              <td className="p-3">
                <input
                  type="date"
                  value={b.expiry_date}
                  onChange={(e) => update(i, "expiry_date", e.target.value)}
                  className="bg-white/60 rounded px-2 py-1 border"
                />
              </td>
              <td className="p-3">
                <input
                  type="number"
                  value={b.qty_on_hand}
                  onChange={(e) =>
                    update(i, "qty_on_hand", parseFloat(e.target.value))
                  }
                  className="bg-white/60 rounded px-2 py-1 border"
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
