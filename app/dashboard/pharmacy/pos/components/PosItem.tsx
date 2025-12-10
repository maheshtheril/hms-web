import AllocatedBatches from "./AllocatedBatches";

export default function PosItem({ item }: { item: any }) {
  return (
    <div className="p-4 mb-4 bg-white/60 backdrop-blur-lg rounded-2xl shadow">
      <div className="flex justify-between">
        <div>
          <div className="text-lg font-semibold">{item.product.name}</div>
          <div className="text-gray-500 text-sm">{item.product.sku}</div>
        </div>
        <div className="text-lg font-bold">x {item.qty}</div>
      </div>

      <AllocatedBatches allocation={item.allocation} />
    </div>
  );
}
