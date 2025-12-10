export default function AllocatedBatches({ allocation }: { allocation: any[] }) {
  const getColor = (expiry: string) => {
    const d = new Date(expiry);
    const now = new Date();
    const diffDays = (d.getTime() - now.getTime()) / (1000 * 3600 * 24);

    if (diffDays < 0) return "bg-red-600 text-white";
    if (diffDays < 30) return "bg-orange-500 text-white";
    return "bg-green-600 text-white";
  };

  return (
    <div className="mt-2 space-y-2">
      {allocation.map((a, i) => (
        <div
          key={i}
          className="p-3 bg-white/70 border rounded-xl shadow-sm flex justify-between"
        >
          <div>
            <div className="font-semibold">Batch: {a.batch_id}</div>
            <div className="text-sm opacity-70">Qty: {a.qty}</div>
          </div>
          <div
            className={`px-3 py-1 rounded-lg text-sm ${getColor(
              a.expiry_date
            )}`}
          >
            Exp: {a.expiry_date}
          </div>
        </div>
      ))}
    </div>
  );
}
