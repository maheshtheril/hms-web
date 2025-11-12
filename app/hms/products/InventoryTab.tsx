// app/hms/products/product-editor/InventoryTab.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";
import apiClient from "@/lib/api-client";
import { useToast } from "@/components/toast/ToastProvider";
import { Loader2, PlusCircle, MinusCircle, Archive, Clock } from "lucide-react";

type InventoryBatch = {
  id?: string;
  reference?: string;
  qty: number;
  expiry?: string | null;
  location?: string | null;
  received_at?: string | null;
};

type InventoryHistoryEntry = {
  id?: string;
  type?: "receive" | "adjust" | "transfer" | "sale";
  change: number;
  note?: string;
  when?: string | null;
};

type ProductDraft = {
  id?: string;
  name?: string;
  sku?: string;
  is_stockable?: boolean;
  metadata?: Record<string, any> | null;
  // optional local-only property used by inventory tab
  inventory?: {
    on_hand?: number;
    reserved?: number;
    incoming?: number;
    batches?: InventoryBatch[];
    history?: InventoryHistoryEntry[];
  } | null;
};

interface Props {
  draft: ProductDraft;
  onChange: (patch: Partial<ProductDraft>) => void;
}

export default function InventoryTab({ draft, onChange }: Props) {
  const toast = useToast();
  const [loading, setLoading] = useState<boolean>(false);
  const [localBatchQty, setLocalBatchQty] = useState<number>(1);
  const [localBatchRef, setLocalBatchRef] = useState<string>("");
  const [localLocation, setLocalLocation] = useState<string>("");
  const [localExpiry, setLocalExpiry] = useState<string>("");
  const [adjustAmount, setAdjustAmount] = useState<number>(0);
  const [adjustNote, setAdjustNote] = useState<string>("");

  // derived safe state
  const inventory = draft?.inventory ?? {
    on_hand: 0,
    reserved: 0,
    incoming: 0,
    batches: [] as InventoryBatch[],
    history: [] as InventoryHistoryEntry[],
  };

  useEffect(() => {
    // ensure parent has inventory object if product is stockable
    if (draft?.is_stockable && !draft.inventory) {
      onChange({ inventory: { on_hand: 0, reserved: 0, incoming: 0, batches: [], history: [] } });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft?.is_stockable]);

  // Quick receive: add a batch locally then optionally persist
  async function receiveBatch(keepPersist = true) {
    if (!draft?.id) {
      // product not saved yet — just update draft locally
      const nextBatch: InventoryBatch = {
        id: `local-${Date.now()}`,
        reference: localBatchRef || `RCV-${Math.random().toString(36).slice(2, 6).toUpperCase()}`,
        qty: localBatchQty,
        expiry: localExpiry || null,
        location: localLocation || null,
        received_at: new Date().toISOString(),
      };
      const nextBatches = [...(inventory.batches ?? []), nextBatch];
      const nextOnHand = (inventory.on_hand ?? 0) + localBatchQty;

      const entry: InventoryHistoryEntry = {
        id: `hist-${Date.now()}`,
        type: "receive",
        change: nextBatch.qty,
        note: nextBatch.reference,
        when: nextBatch.received_at ?? new Date().toISOString(),
      };

      onChange({
        inventory: {
          ...(inventory ?? {}),
          batches: nextBatches,
          on_hand: nextOnHand,
          history: [entry, ...(inventory.history ?? [])],
        },
      });

      toast.success("Batch added to draft");
      // clear inputs
      setLocalBatchQty(1);
      setLocalBatchRef("");
      setLocalExpiry("");
      setLocalLocation("");
      return;
    }

    if (!draft?.id) return toast.error("Save product first to receive stock");

    setLoading(true);
    try {
      // API contract: POST /hms/products/:id/receive { qty, reference, expiry, location }
      const res = await apiClient.post(`/hms/products/${encodeURIComponent(draft.id)}/receive`, {
        qty: localBatchQty,
        reference: localBatchRef || undefined,
        expiry: localExpiry || undefined,
        location: localLocation || undefined,
      });
      const updatedInv = res.data?.inventory ?? res.data?.data?.inventory;
      // optimistic — apply to draft
      onChange({ inventory: updatedInv });
      toast.success("Received");
      setLocalBatchQty(1);
      setLocalBatchRef("");
      setLocalExpiry("");
      setLocalLocation("");
    } catch (err: any) {
      console.error("receiveBatch", err);
      toast.error(err?.message ?? "Receive failed");
    } finally {
      setLoading(false);
    }
  }

  // Quick adjustment (positive or negative)
  async function submitAdjustment() {
    if (!adjustAmount) return toast.error("Provide an amount to adjust");
    if (!draft?.id) {
      // local adjust only
      const amount = Number(adjustAmount);
      const nextOnHand = (inventory.on_hand ?? 0) + amount;

      const entry: InventoryHistoryEntry = {
        id: `local-adj-${Date.now()}`,
        type: "adjust",
        change: amount,
        note: adjustNote,
        when: new Date().toISOString(),
      };

      onChange({
        inventory: {
          ...(inventory ?? {}),
          on_hand: nextOnHand,
          history: [entry, ...(inventory.history ?? [])],
        },
      });
      setAdjustAmount(0);
      setAdjustNote("");
      toast.success("Local adjustment applied");
      return;
    }

    setLoading(true);
    try {
      // API: POST /hms/products/:id/adjust { change, note }
      const res = await apiClient.post(`/hms/products/${encodeURIComponent(draft.id)}/adjust`, { change: Number(adjustAmount), note: adjustNote });
      const updatedInv = res.data?.inventory ?? res.data?.data?.inventory;
      onChange({ inventory: updatedInv });
      setAdjustAmount(0);
      setAdjustNote("");
      toast.success("Adjustment saved");
    } catch (err: any) {
      console.error("submitAdjustment", err);
      toast.error(err?.message ?? "Adjustment failed");
    } finally {
      setLoading(false);
    }
  }

  // Remove batch (local only or API)
  async function removeBatch(batchId?: string) {
    if (!batchId) return;
    if (!draft?.id) {
      const nextBatches = (inventory.batches ?? []).filter((b) => b.id !== batchId);
      const removedQty = (inventory.batches ?? []).find((b) => b.id === batchId)?.qty ?? 0;
      const nextOnHand = (inventory.on_hand ?? 0) - removedQty;
      onChange({ inventory: { ...(inventory ?? {}), batches: nextBatches, on_hand: nextOnHand } });
      toast.success("Batch removed from draft");
      return;
    }

    setLoading(true);
    try {
      // API: DELETE /hms/products/:id/batches/:batchId
      const res = await apiClient.delete(`/hms/products/${encodeURIComponent(draft.id)}/batches/${encodeURIComponent(batchId)}`);
      const updatedInv = res.data?.inventory ?? res.data?.data?.inventory;
      onChange({ inventory: updatedInv });
      toast.success("Batch removed");
    } catch (err: any) {
      console.error("removeBatch", err);
      toast.error(err?.message ?? "Remove failed");
    } finally {
      setLoading(false);
    }
  }

  // Derived metrics
  const totals = useMemo(() => {
    const on_hand = inventory.on_hand ?? 0;
    const reserved = inventory.reserved ?? 0;
    const incoming = inventory.incoming ?? 0;
    const available = on_hand - reserved;
    return { on_hand, reserved, incoming, available };
  }, [inventory]);

  return (
    <div className="p-4">
      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-5">
          <div className="rounded-2xl bg-white/40 border p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs text-slate-500">On hand</div>
                <div className="text-2xl font-semibold text-slate-900">{totals.on_hand}</div>
                <div className="text-xs text-slate-400 mt-1">
                  Available: {totals.available} · Reserved: {totals.reserved} · Incoming: {totals.incoming}
                </div>
              </div>
              <div>
                <Archive className="w-6 h-6 text-slate-600" />
              </div>
            </div>

            <div className="mt-6 border-t pt-4">
              <h4 className="text-sm font-medium text-slate-800 mb-2">Quick receive</h4>
              <div className="flex gap-2 items-end">
                <div>
                  <label className="text-xs text-slate-600">Qty</label>
                  <input
                    type="number"
                    min={1}
                    value={localBatchQty}
                    onChange={(e) => setLocalBatchQty(Number(e.target.value || 0))}
                    className="w-24 rounded-2xl px-3 py-2 border bg-white/60 outline-none"
                  />
                </div>

                <div className="flex-1">
                  <label className="text-xs text-slate-600">Reference</label>
                  <input
                    value={localBatchRef}
                    onChange={(e) => setLocalBatchRef(e.target.value)}
                    placeholder="PO / GRN ref"
                    className="w-full rounded-2xl px-3 py-2 border bg-white/60 outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs text-slate-600">Expiry</label>
                  <input
                    type="date"
                    value={localExpiry}
                    onChange={(e) => setLocalExpiry(e.target.value)}
                    className="rounded-2xl px-3 py-2 border bg-white/60 outline-none"
                  />
                </div>

                <button onClick={() => receiveBatch(true)} className="px-3 py-2 rounded-2xl bg-emerald-600 text-white inline-flex items-center gap-2">
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <PlusCircle className="w-4 h-4" />} Receive
                </button>
              </div>

              <div className="mt-3">
                <label className="text-xs text-slate-600">Location</label>
                <input
                  value={localLocation}
                  onChange={(e) => setLocalLocation(e.target.value)}
                  placeholder="Warehouse A / Shelf 4"
                  className="w-full rounded-2xl px-3 py-2 border bg-white/60 outline-none"
                />
              </div>
            </div>

            <div className="mt-6 border-t pt-4">
              <h4 className="text-sm font-medium text-slate-800 mb-2">Quick adjust</h4>
              <div className="flex gap-2 items-center">
                <input
                  type="number"
                  value={adjustAmount}
                  onChange={(e) => setAdjustAmount(Number(e.target.value || 0))}
                  className="w-28 rounded-2xl px-3 py-2 border bg-white/60 outline-none"
                />
                <input
                  value={adjustNote}
                  onChange={(e) => setAdjustNote(e.target.value)}
                  placeholder="Reason / note"
                  className="flex-1 rounded-2xl px-3 py-2 border bg-white/60 outline-none"
                />
                <button onClick={submitAdjustment} className="px-3 py-2 rounded-2xl bg-rose-500 text-white inline-flex items-center gap-2">
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <MinusCircle className="w-4 h-4" />} Apply
                </button>
              </div>
              <div className="mt-2 text-xs text-slate-500">Positive values increase on-hand. Negative values decrease.</div>
            </div>
          </div>

          <div className="mt-4 rounded-2xl bg-white/30 border p-3">
            <h5 className="text-sm font-medium text-slate-800 mb-2">Inventory controls</h5>
            <div className="flex flex-col gap-2">
              <button
                onClick={() => {
                  onChange({ inventory: { ...(inventory ?? {}), incoming: (inventory.incoming ?? 0) + 1 } });
                }}
                className="px-3 py-2 rounded-md bg-white/50 text-sm"
              >
                Mark incoming +1
              </button>
              <button
                onClick={() => {
                  onChange({ inventory: { ...(inventory ?? {}), reserved: Math.max(0, (inventory.reserved ?? 0) - 1) } });
                }}
                className="px-3 py-2 rounded-md bg-white/50 text-sm"
              >
                Unreserve -1
              </button>
              <button
                onClick={() => {
                  onChange({ inventory: { ...(inventory ?? {}), on_hand: 0, batches: [], history: [] } });
                  toast.info("Cleared local inventory");
                }}
                className="px-3 py-2 rounded-md border text-sm"
              >
                Clear local
              </button>
            </div>
          </div>
        </div>

        <div className="col-span-7">
          <div className="rounded-2xl bg-white/40 border p-4 shadow-sm">
            <h4 className="text-sm font-medium text-slate-800 mb-3">Batches</h4>

            <div className="flex flex-col gap-3 max-h-[360px] overflow-auto">
              {(inventory.batches ?? []).length === 0 && <div className="text-sm text-slate-500">No batches yet.</div>}
              {(inventory.batches ?? []).map((b, i) => (
                <div key={b.id ?? `batch-${i}`} className="flex items-center justify-between gap-3 p-3 rounded-lg bg-white/60">
                  <div>
                    <div className="text-sm font-semibold text-slate-900">{b.reference ?? `Batch ${i + 1}`}</div>
                    <div className="text-xs text-slate-500">Qty: {b.qty} · Location: {b.location ?? "—"} · Expiry: {b.expiry ?? "—"}</div>
                    <div className="text-xs text-slate-400 mt-1">Received: {b.received_at ? new Date(b.received_at).toLocaleString() : "—"}</div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button onClick={() => removeBatch(b.id)} className="px-3 py-1 rounded-md border text-sm">
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4 rounded-2xl bg-white/30 border p-4">
            <h4 className="text-sm font-medium text-slate-800 mb-3 flex items-center gap-2">
              <Clock className="w-4 h-4" /> Activity
            </h4>
            <div className="max-h-[260px] overflow-auto flex flex-col gap-2">
              {(inventory.history ?? []).length === 0 && <div className="text-sm text-slate-500">No activity yet.</div>}
              {(inventory.history ?? []).map((h, idx) => (
                <div key={h.id ?? `h-${idx}`} className="flex items-center justify-between p-2 rounded-md bg-white/60">
                  <div>
                    <div className="text-sm font-medium text-slate-900">{h.type?.toUpperCase() ?? "EVENT"}</div>
                    <div className="text-xs text-slate-500">{h.note ?? ""}</div>
                  </div>
                  <div className="text-sm text-slate-700">{h.change > 0 ? `+${h.change}` : h.change}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
