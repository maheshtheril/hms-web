//import Sidebar from "@/components/Sidebar";
//import { Topbar } from '@/components/Topbar';
import { api } from "@/lib/api";
import KanbanClient from "./reorder-client";
import PipelineSwitcher from "./pipeline-switcher";

async function getPipelines() {
  return api<any[]>("/api/pipelines", { cache: "no-store" as any });
}
async function getBoard(pipelineId: string) {
  return api<{ columns: any[] }>(`/api/kanban/${pipelineId}`, {
    cache: "no-store" as any,
  });
}

export default async function Kanban({
  searchParams,
}: {
  searchParams: { pipeline?: string };
}) {
  const pipelines = await getPipelines();
  const active = searchParams.pipeline || pipelines?.[0]?.id || "";
  const { columns } = active ? await getBoard(active) : { columns: [] };

  return (
    <div className="flex">
     
      <div className="flex-1 min-h-screen">
        
        <main className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold">Leads · Kanban</h1>
            <PipelineSwitcher pipelines={pipelines} active={active} />
          </div>

          {/* Client bridge: handles drop/reorder and calls APIs */}
          <KanbanClient />

          <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-5 gap-4">
            {columns.map((col) => (
              <KanbanColumn key={col.id} column={col} />
            ))}
          </div>
        </main>
      </div>
    </div>
  );
}

function KanbanColumn({ column }: { column: any }) {
  return (
    <div
      className="card"
      onDragOver={(e) => {
        e.preventDefault();
      }}
      onDrop={(e) => {
        const leadId = e.dataTransfer.getData("text/lead");
        const detail = { leadId, toStageId: column.id };
        window.dispatchEvent(new CustomEvent("kanban:drop", { detail } as any));
      }}
    >
      <div className="font-semibold mb-2">{column.name}</div>

      {/* This container's data-stage is used by reorder-client to compute order */}
      <div
        className="grid gap-2 min-h-[200px]"
        data-stage={column.id}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          // dropping into empty space still triggers stage move
          const leadId = e.dataTransfer.getData("text/lead");
          const detail = { leadId, toStageId: column.id };
          window.dispatchEvent(
            new CustomEvent("kanban:drop", { detail } as any)
          );
        }}
      >
        {column.leads.map((l: any, idx: number) => (
          <KanbanCard key={l.id} lead={l} index={idx} stageId={column.id} />
        ))}
      </div>
    </div>
  );
}

function KanbanCard({
  lead,
  index,
  stageId,
}: {
  lead: any;
  index: number;
  stageId: string;
}) {
  return (
    <div
      draggable
      data-id={lead.id}
      className="kanban-card rounded-xl border border-white/10 bg-black/30 p-3 cursor-grab"
      onDragStart={(e) => {
        e.dataTransfer.setData("text/lead", lead.id);
        e.dataTransfer.setData("text/fromStage", stageId);
        e.dataTransfer.setData("text/index", String(index));
      }}
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        // intra-column reorder (or cross-column fallback)
        const fromStage = e.dataTransfer.getData("text/fromStage");
        const leadId = e.dataTransfer.getData("text/lead");
        const fromIndex = Number(e.dataTransfer.getData("text/index"));
        const toIndex = index;
        const detail = { fromStageId: fromStage, toStageId: stageId, leadId, fromIndex, toIndex };
        window.dispatchEvent(
          new CustomEvent("kanban:reorder", { detail } as any)
        );
      }}
    >
      <div className="flex items-center justify-between">
        <div className="font-medium truncate">{lead.name}</div>
        <div className="text-xs opacity-70">
          {Math.round(lead.probability || 0)}%
        </div>
      </div>
      <div className="text-sm opacity-70">
        ₹{lead.estimated_value ?? 0} · {lead.owner_name || lead.owner_email || "Unassigned"}
      </div>
    </div>
  );
}
