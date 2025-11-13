// app/hms/products/product-editor/AccountingTab.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";
import apiClient from "@/lib/api-client";
import { useToast } from "@/components/toast/ToastProvider";
import { Loader2, BookOpen, Percent, Link2, RefreshCw } from "lucide-react";
import type { ProductDraft, Account, TaxCode, AccountingMapping } from "./types";

interface Props {
  draft: ProductDraft;
  onChange: (patch: Partial<ProductDraft>) => void;
}

/**
 * AccountingTab
 * - Lets users map product → GL accounts and tax codes
 * - Suggests defaults based on product metadata (e.g., category)
 * - Persists mapping to server when product saved
 */

export default function AccountingTab({ draft, onChange }: Props) {
  const toast = useToast();
  const [loading, setLoading] = useState<boolean>(false);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [taxCodes, setTaxCodes] = useState<TaxCode[]>([]);
  const [queryAccounts, setQueryAccounts] = useState<string>("");

  // local copy to edit (ensure shape exists)
  const mapping: AccountingMapping = draft.accounting ?? {
    sales_account: null,
    expense_account: null,
    stock_input_account: null,
    stock_output_account: null,
    tax_code_id: null,
  };

  useEffect(() => {
    // lazy-load accounts & tax codes (can be cached via react-query in your app)
    let mounted = true;
    (async () => {
      try {
        const [accRes, taxRes] = await Promise.allSettled([
          apiClient.get("/hms/accounts"),
          apiClient.get("/hms/tax-codes"),
        ]);
        if (!mounted) return;
        if (accRes.status === "fulfilled") setAccounts(accRes.value.data?.data ?? accRes.value.data ?? []);
        if (taxRes.status === "fulfilled") setTaxCodes(taxRes.value.data?.data ?? taxRes.value.data ?? []);
      } catch (e) {
        console.error("load accounting lists", e);
      }
    })();
    return () => { mounted = false; };
  }, []);

  // derived friendly lookups
  const accountLookup = useMemo(() => {
    const map: Record<string, Account> = {};
    for (const a of accounts) if (a.id) map[a.id] = a;
    return map;
  }, [accounts]);

  const taxLookup = useMemo(() => {
    const map: Record<string, TaxCode> = {};
    for (const t of taxCodes) if (t.id) map[t.id] = t;
    return map;
  }, [taxCodes]);

  // Suggest accounts based on product metadata (simple heuristics)
  function suggestDefaults() {
    const rev = accounts.find(a => /income|revenue|sales/i.test(`${a.type ?? ""} ${a.name} ${a.code ?? ""}`)) ?? accounts[0];
    const exp = accounts.find(a => /expense|cogs|cost/i.test(`${a.type ?? ""} ${a.name} ${a.code ?? ""}`)) ?? accounts[1] ?? rev;
    const tax = taxCodes.find(t => t.percent > 0) ?? taxCodes[0] ?? null;

    onChange({
      accounting: {
        ...mapping,
        sales_account: rev?.id ?? mapping.sales_account,
        expense_account: exp?.id ?? mapping.expense_account,
        tax_code_id: tax?.id ?? mapping.tax_code_id,
      },
    });

    toast.success("Suggested accounts applied");
  }

  // Save mapping to server (if product exists). Endpoint: PATCH /hms/products/:id/accounting
  async function persistMapping() {
    if (!draft?.id) return toast.error("Save product first to persist accounting mapping");
    setLoading(true);
    try {
      const body = { accounting: mapping };
      const res = await apiClient.patch(`/hms/products/${encodeURIComponent(draft.id)}/accounting`, body);
      const saved = res.data?.accounting ?? res.data?.data?.accounting;
      onChange({ accounting: saved ?? mapping });
      toast.success("Accounting mapping persisted");
    } catch (err: any) {
      console.error("persistMapping", err);
      toast.error(err?.message ?? "Persist failed");
    } finally {
      setLoading(false);
    }
  }

  // Local updates
  function updateMapping(patch: Partial<AccountingMapping>) {
    onChange({ accounting: { ...(mapping ?? {}), ...patch } });
  }

  // Quick search/filter for accounts (client side)
  const filteredAccounts = accounts.filter(a => {
    if (!queryAccounts) return true;
    const q = queryAccounts.toLowerCase();
    return `${a.name} ${a.code ?? ""} ${a.type ?? ""}`.toLowerCase().includes(q);
  });

  return (
    <div className="p-4">
      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-5">
          <div className="rounded-2xl bg-white/40 border p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <BookOpen className="w-5 h-5" />
              <h4 className="text-sm font-semibold">Accounting mapping</h4>
            </div>

            <div className="mt-4 space-y-3">
              <div>
                <div className="text-xs text-slate-500 mb-1">Sales (Revenue) account</div>
                <select
                  value={mapping.sales_account ?? ""}
                  onChange={(e) => updateMapping({ sales_account: e.target.value || null })}
                  className="w-full rounded-2xl px-3 py-2 border bg-white/60"
                >
                  <option value="">— Select sales account —</option>
                  {filteredAccounts.map(acc => <option key={acc.id} value={acc.id}>{acc.code ? `${acc.code} · ` : ""}{acc.name}</option>)}
                </select>
              </div>

              <div>
                <div className="text-xs text-slate-500 mb-1">Expense / COGS account</div>
                <select
                  value={mapping.expense_account ?? ""}
                  onChange={(e) => updateMapping({ expense_account: e.target.value || null })}
                  className="w-full rounded-2xl px-3 py-2 border bg-white/60"
                >
                  <option value="">— Select expense account —</option>
                  {filteredAccounts.map(acc => <option key={acc.id} value={acc.id}>{acc.code ? `${acc.code} · ` : ""}{acc.name}</option>)}
                </select>
              </div>

              <div>
                <div className="text-xs text-slate-500 mb-1">Stock input account</div>
                <select
                  value={mapping.stock_input_account ?? ""}
                  onChange={(e) => updateMapping({ stock_input_account: e.target.value || null })}
                  className="w-full rounded-2xl px-3 py-2 border bg-white/60"
                >
                  <option value="">— Select stock input —</option>
                  {filteredAccounts.map(acc => <option key={acc.id} value={acc.id}>{acc.code ? `${acc.code} · ` : ""}{acc.name}</option>)}
                </select>
              </div>

              <div>
                <div className="text-xs text-slate-500 mb-1">Stock output account</div>
                <select
                  value={mapping.stock_output_account ?? ""}
                  onChange={(e) => updateMapping({ stock_output_account: e.target.value || null })}
                  className="w-full rounded-2xl px-3 py-2 border bg-white/60"
                >
                  <option value="">— Select stock output —</option>
                  {filteredAccounts.map(acc => <option key={acc.id} value={acc.id}>{acc.code ? `${acc.code} · ` : ""}{acc.name}</option>)}
                </select>
              </div>

              <div>
                <div className="text-xs text-slate-500 mb-1">Tax code</div>
                <select
                  value={mapping.tax_code_id ?? ""}
                  onChange={(e) => updateMapping({ tax_code_id: e.target.value || null })}
                  className="w-full rounded-2xl px-3 py-2 border bg-white/60"
                >
                  <option value="">— Select tax code —</option>
                  {taxCodes.map(t => <option key={t.id} value={t.id}>{t.code} · {t.name} · {t.percent}%</option>)}
                </select>
              </div>
            </div>

            <div className="mt-4 border-t pt-3 flex items-center gap-2">
              <input placeholder="Filter accounts..." value={queryAccounts} onChange={(e) => setQueryAccounts(e.target.value)} className="flex-1 rounded-2xl px-3 py-2 border bg-white/60" />
              <button onClick={() => { setQueryAccounts(""); }} className="px-3 py-2 rounded-2xl border"><RefreshCw className="w-4 h-4" /></button>
            </div>
          </div>

          <div className="mt-4 rounded-2xl bg-white/30 border p-3">
            <div className="text-sm font-medium">Quick actions</div>
            <div className="mt-2 flex gap-2">
              <button onClick={suggestDefaults} className="px-3 py-2 rounded-2xl bg-emerald-600 text-white inline-flex items-center gap-2"><Link2 className="w-4 h-4" /> Suggest</button>
              <button onClick={() => { onChange({ accounting: { ...mapping, sales_account: null, expense_account: null, tax_code_id: null } }); toast.info("Cleared mapping"); }} className="px-3 py-2 rounded-2xl border">Clear</button>
              <button onClick={persistMapping} className="px-3 py-2 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white inline-flex items-center gap-2">{loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Persist"}</button>
            </div>

            <div className="mt-3 text-xs text-slate-500">
              Notes: Accounts & tax codes come from your Chart of Accounts. Persisting will store mapping on the product record so sales/invoices automatically use the configured accounts.
            </div>
          </div>
        </div>

        <div className="col-span-7">
          <div className="rounded-2xl bg-white/40 border p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2"><Percent className="w-5 h-5" /><h4 className="text-sm font-semibold">Preview & Validation</h4></div>
              <div className="text-xs text-slate-500">Validation checks</div>
            </div>

            <div className="mt-4 space-y-3">
              <div className="p-3 rounded-md bg-white/60">
                <div className="text-xs text-slate-500">Sales account</div>
                <div className="mt-1 text-sm text-slate-800">{mapping.sales_account ? `${accountLookup[mapping.sales_account]?.code ?? ""} · ${accountLookup[mapping.sales_account]?.name ?? "(unknown)"}` : <span className="text-xs text-rose-600">Not configured</span>}</div>
              </div>

              <div className="p-3 rounded-md bg-white/60">
                <div className="text-xs text-slate-500">Expense account</div>
                <div className="mt-1 text-sm text-slate-800">{mapping.expense_account ? `${accountLookup[mapping.expense_account]?.code ?? ""} · ${accountLookup[mapping.expense_account]?.name ?? "(unknown)"}` : <span className="text-xs text-rose-600">Not configured</span>}</div>
              </div>

              <div className="p-3 rounded-md bg-white/60">
                <div className="text-xs text-slate-500">Tax code</div>
                <div className="mt-1 text-sm text-slate-800">{mapping.tax_code_id ? `${taxLookup[mapping.tax_code_id]?.code ?? ""} · ${taxLookup[mapping.tax_code_id]?.name ?? ""} · ${taxLookup[mapping.tax_code_id]?.percent ?? 0}%` : <span className="text-xs text-rose-600">Not configured</span>}</div>
              </div>

              <div className="mt-3 text-xs text-slate-500">
                Validation: The system checks if sales & expense accounts are defined. Missing accounts can cause invoicing or COGS errors in accounting reporting.
              </div>
            </div>
          </div>

          <div className="mt-4 rounded-2xl bg-white/30 border p-3">
            <div className="text-sm font-medium">Actions & Audit</div>
            <div className="mt-2 text-xs text-slate-500">
              Persisted changes are recorded in the product's audit history. For compliance, consider adding: who changed the mapping, reason, and effective date.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
