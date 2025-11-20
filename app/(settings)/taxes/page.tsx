"use client";

import React, { useEffect, useState } from "react";

// Company Tax Admin + Preview Page (defensive)
// Path: web/app/(settings)/taxes/page.tsx
// Uses backend routes (adjust host paths as needed)

// --- types ---
type Company = { id: string; name: string };
type GlobalTaxType = { id: string; name: string; code?: string; description?: string };
type GlobalTaxRate = { id: string; tax_type_id: string; name: string; percentage?: number; fixed_amount?: number };

type CompanyTaxMap = {
  id: string;
  tenant_id?: string | null;
  company_id: string;
  country_id?: string | null;
  tax_type_id: string;
  tax_rate_id: string;
  is_default: boolean;
  is_active: boolean;
  account_id?: string | null;
  refund_account_id?: string | null;
};

type LineInput = { description: string; qty: number; unit_price: number };

// --- defensive helpers ---
function ensureArray<T>(v: any): T[] {
  if (Array.isArray(v)) return v;
  if (!v) return [];
  try {
    if (v.data && Array.isArray(v.data)) return v.data;
    if (v.items && Array.isArray(v.items)) return v.items;
    if (v.results && Array.isArray(v.results)) return v.results;
    if (typeof v === "object") {
      if (v.id && (v.name || v.id)) return [v] as any;
      return Object.values(v).filter(Boolean) as any[];
    }
  } catch (e) {
    console.warn("ensureArray fallback", e);
  }
  return [];
}

// Wrap any .map to avoid crashes and log offending shapes once
function safeMap<T, U>(arr: any, name: string, fn: (item: T, i: number) => U): U[] {
  if (!Array.isArray(arr)) {
    try {
      console.error(`[safeMap] non-array for "${name}" — type=${typeof arr}`, arr);
      console.error(new Error(`[safeMap] "${name}" stack`).stack);
    } catch (e) {
      /* ignore logging errors */
    }
    return [];
  }
  return arr.map(fn as any);
}

export default function Page() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [companyId, setCompanyId] = useState<string | null>(null);

  const [taxTypes, setTaxTypes] = useState<GlobalTaxType[]>([]);
  const [taxRates, setTaxRates] = useState<GlobalTaxRate[]>([]);

  const [companyTaxMaps, setCompanyTaxMaps] = useState<CompanyTaxMap[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // preview state
  const [lines, setLines] = useState<LineInput[]>([{ description: "Consultation", qty: 1, unit_price: 100 }]);
  const [invoiceDate, setInvoiceDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [billingCountryId, setBillingCountryId] = useState<string | null>(null);
  const [previewResult, setPreviewResult] = useState<any | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  // Initial load
  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        setError(null);

        const [cRes, ttRes, trRes] = await Promise.all([
          fetch("/admin/companies"),
          fetch("/global/tax-types"),
          fetch("/global/tax-rates"),
        ]);

        if (!cRes.ok) throw new Error(`Failed loading companies: ${await cRes.text()}`);
        const csRaw = await cRes.json();
        const cs = ensureArray<Company>(csRaw);
        setCompanies(cs);
        if (cs.length && !companyId) setCompanyId(cs[0].id);

        if (!ttRes.ok) throw new Error(`Failed loading tax types: ${await ttRes.text()}`);
        const ttRaw = await ttRes.json();
        setTaxTypes(ensureArray<GlobalTaxType>(ttRaw));

        if (!trRes.ok) throw new Error(`Failed loading tax rates: ${await trRes.text()}`);
        const trRaw = await trRes.json();
        setTaxRates(ensureArray<GlobalTaxRate>(trRaw));
      } catch (err: any) {
        console.error("initial load error", err);
        setError(String(err?.message || err));
        setCompanies([]);
        setTaxTypes([]);
        setTaxRates([]);
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Load company-specific mappings when company changes
  useEffect(() => {
    if (!companyId) {
      setCompanyTaxMaps([]);
      return;
    }
    loadCompanyTaxMaps(companyId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyId]);

  async function loadCompanyTaxMaps(cid: string) {
  setLoading(true);
  setError(null);

  async function doFetch() {
    const res = await fetch(`/api/global/company-taxes?company_id=${encodeURIComponent(cid)}`, {
      credentials: "include", // <-- important: send cookies
      headers: { "Accept": "application/json" },
    });
    const txt = await res.text().catch(() => "");
    let json: any = null;
    try { json = txt ? JSON.parse(txt) : null; } catch { json = txt; }
    return { res, json };
  }

  try {
    let { res, json } = await doFetch();

    if (!res.ok) {
      // specific tenant_required handling -> try to switch and retry once
      if (json && json.error === "tenant_required") {
        console.warn("[loadCompanyTaxMaps] server asks for tenant context; attempting to switch tenant for company:", cid, json);
        // attempt to set tenant via switch endpoint (server should set cookie/session)
        try {
          const sw = await fetch("/api/switch-company", {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ company_id: cid }),
          });
          if (!sw.ok) {
            const t = await sw.text().catch(() => "");
            throw new Error(`Switch failed: ${sw.status} ${sw.statusText} - ${t}`);
          }
          // switch succeeded — retry the original fetch
          ({ res, json } = await doFetch());
        } catch (switchErr: any) {
          console.error("[loadCompanyTaxMaps] switch-company failed", switchErr);
          throw switchErr;
        }
      }
    }

    if (!res.ok) {
      console.error("[loadCompanyTaxMaps] non-2xx body:", json);
      throw new Error(`Failed loading company taxes: ${res.status} ${res.statusText} - ${typeof json === "object" ? JSON.stringify(json) : json}`);
    }

    const maps = ensureArray<CompanyTaxMap>(json);
    setCompanyTaxMaps(maps);
  } catch (err: any) {
    console.error("loadCompanyTaxMaps error", err);
    setError(String(err?.message || err));
    setCompanyTaxMaps([]);
  } finally {
    setLoading(false);
  }
}


  // Assign a global tax rate to a company
  async function assignTaxToCompany(taxRateId: string) {
    if (!companyId) { setError("Select a company"); return; }
    setError(null);
    try {
      const rate = ensureArray<GlobalTaxRate>(taxRates).find(r => r.id === taxRateId);
      if (!rate) throw new Error("Invalid tax rate selected");

      const body = {
        company_id: companyId,
        tax_type_id: rate.tax_type_id,
        tax_rate_id: rate.id,
        is_default: false,
        is_active: true,
      };

      const res = await fetch("/api/global/company-taxes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const txt = await res.text();
        throw new Error(`Assign failed: ${txt}`);
      }
      await loadCompanyTaxMaps(companyId);
    } catch (err: any) {
      console.error("assignTaxToCompany error", err);
      setError(String(err?.message || err));
    }
  }

  // Update mapping
  async function updateCompanyTaxMap(id: string, patch: Partial<CompanyTaxMap>) {
    if (!companyId) { setError("Select a company"); return; }
    setError(null);
    try {
      const res = await fetch(`/api/global/company-taxes/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      if (!res.ok) {
        const txt = await res.text();
        throw new Error(`Update failed: ${txt}`);
      }
      await loadCompanyTaxMaps(companyId);
    } catch (err: any) {
      console.error("updateCompanyTaxMap error", err);
      setError(String(err?.message || err));
    }
  }

  async function disableCompanyTaxMap(id: string) {
    await updateCompanyTaxMap(id, { is_active: false });
  }

  // Preview taxes via resolver
  async function previewTaxes() {
    if (!companyId) { setError("Select a company before previewing"); return; }
    setError(null);
    setPreviewLoading(true);
    setPreviewResult(null);
    try {
      const payload = {
        tenantId: null,
        invoiceDate,
        billingCountryId,
        transactionType: "sale",
        lines: lines.map(l => ({ qty: l.qty, unit_price: l.unit_price, description: l.description, metadata: {} })),
      };

      const res = await fetch(`/api/companies/${companyId}/taxes/resolve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const txt = await res.text();
        throw new Error(`Preview request failed: ${txt}`);
      }
      const json = await res.json();
      setPreviewResult(json ?? null);
    } catch (err: any) {
      console.error("previewTaxes error", err);
      setError(String(err?.message || err));
      setPreviewResult(null);
    } finally {
      setPreviewLoading(false);
    }
  }

  // Line helpers
  function updateLine(i: number, patch: Partial<LineInput>) {
    setLines(s => s.map((ln, idx) => (idx === i ? { ...ln, ...patch } : ln)));
  }
  function addLine() { setLines(s => [...s, { description: "", qty: 1, unit_price: 0 }]); }
  function removeLine(i: number) { setLines(s => s.filter((_, idx) => idx !== i)); }

  // Safe preview lines (normalized)
  const safePreviewLines: any[] = ensureArray(previewResult?.lines ?? previewResult?.data ?? previewResult?.items ?? previewResult);

  // Helper wrappers to always return arrays for mapping
  const compList = ensureArray<Company>(companies);
  const typeList = ensureArray<GlobalTaxType>(taxTypes);
  const rateList = ensureArray<GlobalTaxRate>(taxRates);
  const mapList = ensureArray<CompanyTaxMap>(companyTaxMaps);

  return (
    <div className="min-h-screen p-6 bg-gradient-to-b from-white/60 to-white/30">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="p-6 rounded-2xl bg-glass/60 backdrop-blur-md shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-semibold">Company Tax Management</h1>
            <div className="text-sm text-muted">Assign global tax rates to companies · Preview</div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-sm text-muted">Company</label>
              <select value={companyId ?? ""} onChange={e => setCompanyId(e.target.value || null)} className="mt-1 p-2 rounded-lg border w-full bg-white/30">
                <option value="">-- select company --</option>
                {safeMap(compList, "compList", (c: Company) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>

              <div className="mt-4">
                <label className="text-sm text-muted">Billing country (optional)</label>
                <input value={billingCountryId ?? ""} onChange={e => setBillingCountryId(e.target.value || null)} placeholder="country id" className="mt-1 p-2 rounded-lg border w-full bg-white/30" />
              </div>

              <div className="mt-4">
                <button onClick={() => companyId && loadCompanyTaxMaps(companyId)} className="px-3 py-2 rounded-lg border">Reload</button>
              </div>

              {error && <div className="mt-3 text-sm text-red-600">{error}</div>}
            </div>

            <div className="md:col-span-2">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-white/40">
                  <h3 className="font-medium mb-2">Assigned Taxes</h3>

                  {loading ? (
                    <div>Loading…</div>
                  ) : (
                    <div className="space-y-2">
                      {mapList.length === 0 && (
                        <div className="text-sm text-muted">No taxes assigned to this company.</div>
                      )}

                      {safeMap(mapList, "mapList", (map: CompanyTaxMap) => {
                        const rate = rateList.find(r => r.id === map.tax_rate_id);
                        const type = typeList.find(t => t.id === map.tax_type_id);
                        return (
                          <div key={map.id} className="p-2 rounded-md bg-white/50 flex items-center justify-between">
                            <div>
                              <div className="font-medium">{type?.name ?? map.tax_type_id} · {rate?.name ?? map.tax_rate_id}</div>
                              <div className="text-xs text-muted">Active: {String(map.is_active)}</div>
                            </div>
                            <div className="flex items-center gap-2">
                              <button onClick={() => updateCompanyTaxMap(map.id, { is_active: !map.is_active })} className={`px-2 py-1 rounded ${map.is_active ? 'bg-green-600 text-white' : 'bg-gray-200'}`}>
                                {map.is_active ? 'Active' : 'Disabled'}
                              </button>
                              <button onClick={() => disableCompanyTaxMap(map.id)} className="px-2 py-1 rounded bg-red-100 text-red-700">Disable</button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div className="p-4 rounded-xl bg-white/40">
                  <h3 className="font-medium mb-2">Assign Global Tax Rate</h3>
                  <div className="text-sm text-muted mb-2">Choose a tax rate (global) and assign it to the selected company.</div>

                  <div className="space-y-2 max-h-56 overflow-auto">
                    {safeMap(rateList, "rateList", (tr: GlobalTaxRate) => {
                      const tt = typeList.find(t => t.id === tr.tax_type_id);
                      const already = mapList.find(m => m.tax_rate_id === tr.id && m.company_id === companyId);
                      return (
                        <div key={tr.id} className="p-2 rounded-md bg-white/50 flex items-center justify-between">
                          <div>
                            <div className="font-medium">{tr.name}</div>
                            <div className="text-xs text-muted">
                              {tt?.name ?? tr.tax_type_id} · {tr.percentage ? `${tr.percentage}%` : tr.fixed_amount ? `${tr.fixed_amount} (fixed)` : ''}
                            </div>
                          </div>
                          <div>
                            {already ? (
                              <div className="text-xs text-muted">Assigned</div>
                            ) : (
                              <button disabled={!companyId} onClick={() => assignTaxToCompany(tr.id)} className="px-2 py-1 rounded bg-indigo-600 text-white">Assign</button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="mt-4 p-4 rounded-xl bg-white/50">
                <h3 className="font-medium mb-2">Preview Taxes (Invoice)</h3>
                <div className="grid md:grid-cols-3 gap-3 mb-3">
                  <div>
                    <div className="text-sm text-muted">Invoice date</div>
                    <input type="date" value={invoiceDate} onChange={e => setInvoiceDate(e.target.value)} className="mt-1 p-2 rounded border w-full" />
                  </div>

                  <div>
                    <div className="text-sm text-muted">Billing country id</div>
                    <input value={billingCountryId ?? ""} onChange={e => setBillingCountryId(e.target.value || null)} className="mt-1 p-2 rounded border w-full" />
                  </div>

                  <div className="flex items-end">
                    <button onClick={previewTaxes} disabled={!companyId || previewLoading} className="px-4 py-2 rounded-xl bg-green-600 text-white">
                      {previewLoading ? "Previewing…" : "Preview taxes"}
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  {safeMap(ensureArray(lines), "lines", (ln: LineInput, idx: number) => (
                    <div key={idx} className="flex gap-2 items-center">
                      <input value={ln.description} onChange={e => updateLine(idx, { description: e.target.value })} className="p-2 rounded border flex-1" placeholder="Description" />
                      <input value={ln.qty} onChange={e => updateLine(idx, { qty: Number(e.target.value) })} className="p-2 rounded border w-24" type="number" />
                      <input value={ln.unit_price} onChange={e => updateLine(idx, { unit_price: Number(e.target.value) })} className="p-2 rounded border w-32" type="number" />
                      <button onClick={() => removeLine(idx)} className="px-2 py-1 rounded bg-red-100 text-red-700">Remove</button>
                    </div>
                  ))}
                  <div className="mt-2"><button onClick={addLine} className="px-3 py-1 rounded border">+ Add line</button></div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="p-6 rounded-2xl bg-glass/60 backdrop-blur-md shadow-md">
          <h2 className="text-xl font-medium mb-3">Preview Result</h2>

          {!previewResult && <div className="text-sm text-muted">No preview yet — run a preview to see resolved taxes.</div>}

          {previewResult && safePreviewLines.length === 0 && (
            <div className="text-sm text-muted">Preview returned no lines.</div>
          )}

          {safeMap(safePreviewLines, "safePreviewLines", (ln: any, i: number) => {
            const taxes = ensureArray(ln?.taxes);
            return (
              <div key={i} className="p-3 rounded bg-white/40 border">
                <div className="flex justify-between">
                  <div className="font-medium">Line {i + 1} · {lines[i]?.description ?? ""}</div>
                  <div className="text-sm text-muted">Base: {ln?.base_amount ?? "—"} · Tax: {ln?.total_tax ?? "—"} · Total: {ln?.total_amount ?? "—"}</div>
                </div>

                <div className="mt-3 grid gap-2">
                  {safeMap(ensureArray(taxes), `taxes_line_${i}`, (t: any, ti: number) => (
                    <div key={ti} className="p-2 rounded-md bg-white/30 flex justify-between">
                      <div>
                        <div className="text-sm font-medium">{t?.tax_type_name ?? t?.tax_type_id ?? "Tax" } {t?.is_compound ? "(compound)" : ""}</div>
                        <div className="text-xs text-muted">Rate: {t?.rate ?? "—"}{t?.is_percentage ? "%" : " (fixed)"} · {t?.notes ?? ""}</div>
                      </div>
                      <div className="text-right">
                        <div className="font-medium">{Number(t?.tax_amount || 0).toFixed(2)}</div>
                        <div className="text-xs text-muted">Rounded: {Number(t?.rounding_applied || 0).toFixed(4)}</div>
                      </div>
                    </div>
                  ))}

                  {(!Array.isArray(ln?.taxes) || ln?.taxes.length === 0) && <div className="text-sm text-muted">No tax lines for this invoice line.</div>}
                </div>
              </div>
            );
          }).length > 0 && (
            <div className="space-y-4">
              <div className="p-3 rounded bg-white/60">
                <div className="text-sm text-muted">Totals</div>
                <div className="mt-2 flex gap-6">
                  <div>Subtotal: <strong>{previewResult?.invoice_totals?.subtotal ?? "—"}</strong></div>
                  <div>Tax: <strong>{previewResult?.invoice_totals?.total_tax ?? "—"}</strong></div>
                  <div>Total: <strong>{previewResult?.invoice_totals?.total ?? "—"}</strong></div>
                </div>
              </div>
            </div>
          )}

          {previewResult && (
            <div className="mt-4">
              <h4 className="text-sm font-medium mb-2">Raw Response</h4>
              <pre className="max-h-64 overflow-auto p-3 bg-black/5 rounded text-xs">{JSON.stringify(previewResult, null, 2)}</pre>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
