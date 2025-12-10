// web/app/hms/products/components/LedgerPreview.tsx

export default function LedgerPreview({ ledger }: { ledger: any[] }) {
  return (
    <div className="mt-10">
      <h2 className="text-xl font-semibold mb-4">Stock Ledger</h2>

      <div className="bg-white/70 rounded-xl shadow overflow-hidden border">
        <table className="w-full">
          <thead className="bg-gray-100">
            <tr>
              <th className="p-3">Date</th>
              <th className="p-3">Ref</th>
              <th className="p-3">Type</th>
              <th className="p-3">Qty</th>
              <th className="p-3">Balance</th>
            </tr>
          </thead>

          <tbody>
            {ledger.map((l: any, i: number) => (
              <tr key={i} className="border-b hover:bg-gray-50">
                <td className="p-3">
                  {new Date(l.created_at).toLocaleString()}
                </td>
                <td className="p-3">{l.reference || "-"}</td>
                <td className="p-3">{l.movement_type}</td>
                <td className="p-3">{l.qty_change}</td>
                <td className="p-3">{l.qty_balance}</td>
              </tr>
            ))}

            {ledger.length === 0 && (
              <tr>
                <td className="p-4 text-center text-gray-500" colSpan={5}>
                  No stock movements found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
