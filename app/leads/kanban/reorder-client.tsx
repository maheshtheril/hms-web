"use client";

import { useEffect } from "react";
import { api } from "@/lib/api";

type ReorderDetail = {
  fromStageId: string;
  toStageId: string;
  leadId: string;
  fromIndex: number;
  toIndex: number;
};

type DropDetail = { leadId: string; toStageId: string };

export default function ReorderClient() {
  useEffect(() => {
    async function handleDrop(e: Event) {
      const { leadId, toStageId } = (e as CustomEvent<DropDetail>).detail || {};
      if (!leadId || !toStageId) return;

      try {
        await api(`/api/leads/${leadId}/stage-move`, {
          method: "POST",
          body: JSON.stringify({ to_stage_id: toStageId }),
        });
        // After cross-column move, a simple refresh is fine
        window.location.reload();
      } catch (err) {
        console.error("kanban:drop failed", err);
      }
    }

    async function handleReorder(e: Event) {
      const detail = (e as CustomEvent<ReorderDetail>).detail;
      if (!detail) return;

      const { fromStageId, toStageId, leadId } = detail;

      // Cross-column reorder = stage move
      if (fromStageId !== toStageId) {
        try {
          await api(`/api/leads/${leadId}/stage-move`, {
            method: "POST",
            body: JSON.stringify({ to_stage_id: toStageId }),
          });
          window.location.reload();
        } catch (err) {
          console.error("kanban:reorder move failed", err);
        }
        return;
      }

      // Same-column reorder: collect the DOM order and persist
      try {
        const container = document.querySelector<HTMLElement>(
          `[data-stage="${toStageId}"]`
        );
        if (!container) return;

        const cards = Array.from(
          container.querySelectorAll<HTMLElement>(".kanban-card")
        );
        const ordered_ids = cards
          .map((el) => el.dataset.id)
          .filter(Boolean) as string[];

        await api(`/api/kanban/reorder`, {
          method: "POST",
          body: JSON.stringify({ stage_id: toStageId, ordered_ids }),
        });

        window.location.reload();
      } catch (err) {
        console.error("kanban:reorder persist failed", err);
      }
    }

    window.addEventListener("kanban:drop", handleDrop as EventListener);
    window.addEventListener("kanban:reorder", handleReorder as EventListener);
    return () => {
      window.removeEventListener("kanban:drop", handleDrop as EventListener);
      window.removeEventListener("kanban:reorder", handleReorder as EventListener);
    };
  }, []);

  return null;
}
