"use client";

import React, { useEffect, useState } from "react";
import apiClient from "@/lib/api-client";
import { useCompany } from "@/app/providers/CompanyProvider";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, CheckCircle2, Loader2, Star } from "lucide-react";

export default function CompanySelector(): JSX.Element {
  const { company, switchCompany } = useCompany();
  const [companies, setCompanies] = useState<
    { id: string; name: string; is_default?: boolean }[]
  >([]);
  const [loading, setLoading] = useState(false);
  const [pendingDefault, setPendingDefault] = useState<{ id: string; name: string } | null>(
    null
  );
  const [savingDefault, setSavingDefault] = useState(false);

  // Load companies once
  useEffect(() => {
    const fetchCompanies = async () => {
      setLoading(true);
      try {
        const res = await apiClient.get("/hms/companies", { withCredentials: true });
        setCompanies(res.data?.data ?? []);
      } catch (err) {
        console.error("Failed to load companies", err);
      } finally {
        setLoading(false);
      }
    };
    fetchCompanies();
  }, []);

  const onChangeCompany = async (id: string) => {
    const selected = companies.find((c) => c.id === id);
    if (!selected) return;

    await switchCompany(id);
    setPendingDefault(selected);
  };

  const confirmDefaultChange = async () => {
    if (!pendingDefault) return;
    try {
      setSavingDefault(true);
      await apiClient.post(
        "/api/company/set-default",
        { company_id: pendingDefault.id },
        { withCredentials: true }
      );
      setPendingDefault(null);
      setCompanies((prev) =>
        prev.map((c) => ({ ...c, is_default: c.id === pendingDefault.id }))
      );
    } catch (err: any) {
      console.error("Failed to set default company", err);
    } finally {
      setSavingDefault(false);
    }
  };

  const currentCompany =
    companies.find((c) => c.id === company?.id) ?? null;

  return (
    <div className="relative group">
      {loading ? (
        <div className="flex items-center gap-2 px-3 py-1 text-sm text-slate-600">
          <Loader2 className="animate-spin w-4 h-4" /> Loading…
        </div>
      ) : (
        <div className="relative flex items-center">
          <select
            className="appearance-none bg-white/80 text-slate-800 text-sm px-3 py-1 rounded-xl border border-white/40 shadow-sm cursor-pointer pr-8 backdrop-blur-xl"
            value={company?.id ?? ""}
            onChange={(e) => onChangeCompany(e.target.value)}
            aria-label="Select company"
          >
            <option value="">Select company</option>
            {companies.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
                {c.is_default ? " ★" : ""}
              </option>
            ))}
          </select>
          <ChevronDown className="absolute right-2.5 top-2.5 w-4 h-4 text-slate-500 pointer-events-none" />

          {/* small star badge if current is default */}
          {currentCompany?.is_default && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              title="Default company"
              className="absolute -top-2 -right-2 bg-amber-400 text-white rounded-full p-1 shadow-md cursor-help"
            >
              <Star className="w-3 h-3 fill-white" />
            </motion.div>
          )}
        </div>
      )}

      {/* Confirmation Modal */}
      <AnimatePresence>
        {pendingDefault && (
          <motion.div
            key="confirm"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-[999]"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white/80 backdrop-blur-2xl border border-white/40 rounded-3xl shadow-2xl p-8 max-w-sm w-full text-center"
            >
              <h2 className="text-lg font-semibold text-slate-900 mb-2">
                Make Default Company?
              </h2>
              <p className="text-sm text-slate-700/90 mb-6">
                Do you want to make{" "}
                <span className="font-medium text-slate-900">
                  {pendingDefault.name}
                </span>{" "}
                your default company for future sessions?
              </p>

              <div className="flex justify-center gap-3">
                <button
                  onClick={confirmDefaultChange}
                  disabled={savingDefault}
                  className="px-4 py-2 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-md hover:scale-[1.02] transition-transform flex items-center gap-1"
                >
                  {savingDefault ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4" />
                  )}
                  {savingDefault ? "Saving..." : "Yes, Make Default"}
                </button>

                <button
                  onClick={() => setPendingDefault(null)}
                  className="px-4 py-2 rounded-2xl bg-white/70 border border-slate-200 shadow-sm hover:bg-white/90"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
