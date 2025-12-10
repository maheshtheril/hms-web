// web/app/hms/products/components/Tabs.tsx
export default function Tabs({
  value,
  onChange,
  items,
}: {
  value: string;
  onChange: (v: string) => void;
  items: { id: string; label: string }[];
}) {
  return (
    <div className="flex gap-6 border-b">
      {items.map((t) => (
        <button
          key={t.id}
          onClick={() => onChange(t.id)}
          className={`pb-3 text-lg ${
            value === t.id
              ? "border-b-2 border-blue-600 text-blue-600 font-semibold"
              : "text-gray-600"
          }`}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}
