// web/app/hms/products/components/VariantsPanel.tsx
"use client";

export default function VariantsPanel({
  variants,
  setVariants,
}: {
  variants: any[];
  setVariants: (v: any[]) => void;
}) {
  const add = () =>
    setVariants([
      ...variants,
      { attribute: "", value: "", price_override: null },
    ]);

  const update = (i: number, k: string, v: any) =>
    setVariants(
      variants.map((x, idx) => (idx === i ? { ...x, [k]: v } : x))
    );

  const remove = (i: number) =>
    setVariants(variants.filter((_, idx) => idx !== i));

  return (
    <div className="mt-10 space-y-6">
      <button
        onClick={add}
        className="px-4 py-2 bg-blue-600 text-white rounded-xl"
      >
        Add Variant
      </button>

      {variants.map((v: any, i: number) => (
        <div
          key={i}
          className="p-5 bg-white/70 rounded-2xl border shadow-sm space-y-4"
        >
          {/* ATTRIBUTE */}
          <div>
            <label className="block font-medium">Attribute</label>
            <input
              value={v.attribute}
              onChange={(e) => update(i, "attribute", e.target.value)}
              className="px-3 py-2 w-full border rounded-xl bg-white/60"
            />
          </div>

          {/* VALUE */}
          <div>
            <label className="block font-medium">Value</label>
            <input
              value={v.value}
              onChange={(e) => update(i, "value", e.target.value)}
              className="px-3 py-2 w-full border rounded-xl bg-white/60"
            />
          </div>

          {/* PRICE OVERRIDE */}
          <div>
            <label className="block font-medium">Price Override (optional)</label>
            <input
              type="number"
              value={v.price_override ?? ""}
              onChange={(e) =>
                update(i, "price_override", e.target.value || null)
              }
              className="px-3 py-2 w-full border rounded-xl bg-white/60"
            />
          </div>

          <button
            onClick={() => remove(i)}
            className="px-3 py-2 bg-red-600 text-white rounded-xl"
          >
            Remove Variant
          </button>
        </div>
      ))}
    </div>
  );
}
