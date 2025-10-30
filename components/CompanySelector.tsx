"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import { useCompany } from "@/app/providers/CompanyProvider";
import { useToast } from "@/components/toast/ToastProvider";

export default function CompanySelector({ compact = false }: { compact?: boolean }) {
  const { company, setCompany, clearCompany } = useCompany();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [idInput, setIdInput] = useState("");
  const [nameInput, setNameInput] = useState("");

  function openModal() {
    setIdInput(company?.id ?? "");
    setNameInput(company?.name ?? "");
    setOpen(true);
  }

  function apply() {
    if (!idInput || idInput.trim() === "") {
      toast.error("Company ID is required");
      return;
    }
    setCompany({ id: idInput.trim(), name: nameInput?.trim() || undefined });
    setOpen(false);
    toast.success("Company selected");
  }

  function clear() {
    clearCompany();
    toast.info("Company cleared");
  }

  return (
    <>
      <div className={compact ? "inline-block" : "flex items-center gap-2"}>
        <div className="text-sm text-slate-600">
          {company ? (
            <span className="font-medium">{company.name ?? company.id}</span>
          ) : (
            <span className="text-slate-400">No company</span>
          )}
        </div>

        <div className="flex gap-2">
          <button onClick={openModal} className="px-2 py-1 rounded-xl border text-xs">Switch</button>
          {company && <button onClick={clear} className="px-2 py-1 rounded-xl border text-xs">Clear</button>}
        </div>
      </div>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="relative w-full max-w-md bg-white rounded-2xl p-6 shadow-2xl">
            <h3 className="text-lg font-semibold mb-2">Select Company</h3>
            <p className="text-sm text-slate-500 mb-3">Enter a company id (UUID) and optional name. Replace this with server-provided company selector later.</p>

            <div className="grid gap-2">
              <input placeholder="Company ID (UUID)" value={idInput} onChange={(e)=>setIdInput(e.target.value)} className="px-3 py-2 rounded-xl border" />
              <input placeholder="Company name (optional)" value={nameInput} onChange={(e)=>setNameInput(e.target.value)} className="px-3 py-2 rounded-xl border" />
            </div>

            <div className="flex justify-end gap-2 mt-4">
              <button onClick={() => setOpen(false)} className="px-3 py-2 rounded-xl border">Cancel</button>
              <button onClick={apply} className="px-3 py-2 rounded-xl bg-blue-600 text-white">Select</button>
            </div>
          </motion.div>
        </div>
      )}
    </>
  );
}
