// web/app/hms/products/components/SupplierTable.tsx
export default function SupplierTable({ suppliers, setSuppliers }: any) {
  const add = () =>
    setSuppliers([
      ...suppliers,
      { supplier_name: "", price: 0, lead_time_days: 0 },
    ]);

  const update = (i: number, k: string, v: any) =>
    setSuppliers(
      suppliers.map((s: any, idx: number) =>
        idx === i ? { ...s, [k]: v } : s
      )
    );

  return (
    <div className="mt-10">
      <button
        onClick={add}
        className="px-4 py-2 mb-4 bg-blue-600 text-white rounded-xl"
      >
        Add Supplier
      </button>

      <table className="w-full bg-white/70 rounded-xl overflow-hidden border">
        <thead>
          <tr className="bg-gray-100">
            <th className="p-3">Supplier</th>
            <th className="p-3">Price</th>
            <th className="p-3">Lead Time (days)</th>
          </tr>
        </thead>
        <tbody>
          {suppliers.map((s: any, i: number) => (
            <tr key={i} className="border-b">
              <td className="p-3">
                <input
                  value={s.supplier_name}
                  onChange={(e) =>
                    update(i, "supplier_name", e.target.value)
                  }
                  className="bg-white/60 rounded px-2 py-1 border"
                />
              </td>

              <td className="p-3">
                <input
                  type="number"
                  value={s.price}
                  onChange={(e) =>
                    update(i, "price", parseFloat(e.target.value))
                  }
                  className="bg-white/60 rounded px-2 py-1 border"
                />
              </td>

              <td className="p-3">
                <input
                  type="number"
                  value={s.lead_time_days}
                  onChange={(e) =>
                    update(
                      i,
                      "lead_time_days",
                      parseFloat(e.target.value)
                    )
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
