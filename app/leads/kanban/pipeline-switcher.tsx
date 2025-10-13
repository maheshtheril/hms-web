"use client";

import { useRouter, useSearchParams } from "next/navigation";

type Pipeline = { id: string; name: string };

export default function PipelineSwitcher({
  pipelines,
  active,
}: {
  pipelines: Pipeline[];
  active: string;
}) {
  const router = useRouter();
  const sp = useSearchParams();

  if (!pipelines?.length) {
    return (
      <span className="text-sm opacity-70">
        No pipelines yet
      </span>
    );
  }

  return (
    <select
      className="px-3 py-2 rounded-xl bg-black/30 border border-white/10"
      value={active}
      onChange={(e) => {
        const next = new URL(window.location.href);
        next.searchParams.set("pipeline", e.target.value);

        // keep other search params intact
        sp.forEach((v, k) => {
          if (k !== "pipeline") next.searchParams.set(k, v);
        });

        router.push(next.pathname + "?" + next.searchParams.toString());
      }}
    >
      {pipelines.map((p) => (
        <option key={p.id} value={p.id}>
          {p.name}
        </option>
      ))}
    </select>
  );
}
