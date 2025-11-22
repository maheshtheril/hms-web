"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";

/**
 * Retail Onboarding Wizard
 * - Collects store(s), POS registers, tax region, default categories, pricing policy, payment methods
 * - POSTS payload to /api/onboarding/retail with credentials cookie
 * - Designed in Neural Glass Design Language (matches hospital wizard)
 *
 * Schema mapping (backend should seed these tables):
 *  - company_settings.hms_sub_industry  (NOT used here)        -> company_settings.retail_config
 *  - store_location (id, tenant_id, company_id, name, address, is_active, created_by)
 *  - pos_register (id, tenant_id, company_id, name, currency, is_active, created_by)
 *  - tax_rate (id, tenant_id, company_id, name, rate, country_id, is_active)
 *  - product_category (id, tenant_id, company_id, name, is_active)
 *  - inventory_stock (initial stock seeding)                  -> product + stock_move / opening_stock tables
 *  - payment_method (id, tenant_id, company_id, name, provider, config_json)
 *
 * Backend endpoint expected payload:
 * {
 *   storeLocations: [{ name, address }],
 *   registers: [{ name, currency }],
 *   defaultCategories: [ "Apparel", "Electronics" ],
 *   taxRegion: { countryId: "IN", defaultTaxPercent: 18 },
 *   pricingPolicy: "retail" | "wholesale" | "mixed",
 *   paymentMethods: ["cash","card","upi","wallet"],
 *   seedOpeningInventory: boolean
 * }
 */

export default function RetailOnboardingWizard() {
  const router = useRouter();
  const [step, setStep] = useState<number>(1);

  // Form state
  const [storeLocations, setStoreLocations] = useState<{ name: string; address?: string }[]>([
    { name: "Main Store", address: "" },
  ]);
  const [registers, setRegisters] = useState<{ name: string; currency: string }[]>([
    { name: "POS-01", currency: "INR" },
  ]);
  const [defaultCategories, setDefaultCategories] = useState<string[]>([
    "General",
    "Consumables",
  ]);
  const [taxCountry, setTaxCountry] = useState<string>("IN");
  const [defaultTaxPercent, setDefaultTaxPercent] = useState<number>(18);
  const [pricingPolicy, setPricingPolicy] = useState<string>("retail");
  const [paymentMethods, setPaymentMethods] = useState<string[]>(["cash", "card"]);
  const [seedOpeningInventory, setSeedOpeningInventory] = useState<boolean>(true);

  const AVAILABLE_CATEGORIES = [
    "Apparel",
    "Electronics",
    "Groceries",
    "Home & Kitchen",
    "Consumables",
    "General",
  ];

  const AVAILABLE_PAYMENT_METHODS = [
    { key: "cash", label: "Cash" },
    { key: "card", label: "Card (Terminal)" },
    { key: "upi", label: "UPI" },
    { key: "wallet", label: "Wallet" },
    { key: "netbank", label: "Netbanking" },
  ];

  function addStore() {
    setStoreLocations((s) => [...s, { name: `Store ${s.length + 1}`, address: "" }]);
  }
  function removeStore(idx: number) {
    setStoreLocations((s) => s.filter((_, i) => i !== idx));
  }
  function updateStore(idx: number, field: "name" | "address", value: string) {
    setStoreLocations((s) => s.map((it, i) => (i === idx ? { ...it, [field]: value } : it)));
  }

  function addRegister() {
    setRegisters((r) => [...r, { name: `POS-${r.length + 1}`, currency: "INR" }]);
  }
  function removeRegister(idx: number) {
    setRegisters((r) => r.filter((_, i) => i !== idx));
  }
  function updateRegister(idx: number, field: "name" | "currency", value: string) {
    setRegisters((r) => r.map((it, i) => (i === idx ? { ...it, [field]: value } : it)));
  }

  function toggleCategory(cat: string) {
    setDefaultCategories((prev) => (prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]));
  }

  function togglePaymentMethod(pm: string) {
    setPaymentMethods((prev) => (prev.includes(pm) ? prev.filter((p) => p !== pm) : [...prev, pm]));
  }

  async function submitRetailOnboarding() {
    const payload = {
      storeLocations,
      registers,
      defaultCategories,
      taxRegion: { countryId: taxCountry, defaultTaxPercent },
      pricingPolicy,
      paymentMethods,
      seedOpeningInventory,
    };

    const res = await fetch("/api/onboarding/retail", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      const msg = body?.error || "Onboarding failed";
      alert(`Retail onboarding failed: ${msg}`);
      return;
    }

    router.push("/tenant/dashboard");
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-[#071226] to-[#071321] p-10 text-white">
      <div className="w-full max-w-4xl">
        <div className="relative rounded-2xl bg-[rgba(255,255,255,0.03)] border border-white/10 backdrop-blur-xl shadow-2xl p-10 ring-1 ring-white/5">
          <div className="absolute -top-12 -right-12 w-56 h-56 rounded-full bg-[#00E3C2]/10 blur-3xl"></div>

          <h1 className="text-3xl font-bold mb-6">Retail Onboarding</h1>

          {/* STEP 1: Stores & Registers */}
          {step === 1 && (
            <div>
              <h2 className="text-xl font-semibold mb-3">Stores & POS Registers</h2>
              <p className="text-white/70 mb-4">Add your store locations and registers (POS terminals).</p>

              <div className="space-y-4">
                <div>
                  <div className="text-sm text-white/60 mb-2">Store locations</div>
                  <div className="space-y-3">
                    {storeLocations.map((s, idx) => (
                      <div key={idx} className="flex gap-2 items-start">
                        <input
                          value={s.name}
                          onChange={(e) => updateStore(idx, "name", e.target.value)}
                          className="flex-1 px-3 py-2 rounded-md bg-[#06121a] border border-white/8 outline-none"
                          placeholder="Store name"
                        />
                        <input
                          value={s.address}
                          onChange={(e) => updateStore(idx, "address", e.target.value)}
                          className="flex-1 px-3 py-2 rounded-md bg-[#06121a] border border-white/8 outline-none"
                          placeholder="Address (optional)"
                        />
                        {storeLocations.length > 1 && (
                          <button onClick={() => removeStore(idx)} className="px-3 py-2 bg-white/6 rounded-md">Del</button>
                        )}
                      </div>
                    ))}
                    <button onClick={addStore} className="mt-2 inline-block px-4 py-2 rounded-md bg-white/6">Add store</button>
                  </div>
                </div>

                <div>
                  <div className="text-sm text-white/60 mb-2">POS Registers</div>
                  <div className="space-y-3">
                    {registers.map((r, idx) => (
                      <div key={idx} className="flex gap-2 items-center">
                        <input
                          value={r.name}
                          onChange={(e) => updateRegister(idx, "name", e.target.value)}
                          className="px-3 py-2 rounded-md bg-[#06121a] border border-white/8 outline-none"
                          placeholder="Register name"
                        />
                        <input
                          value={r.currency}
                          onChange={(e) => updateRegister(idx, "currency", e.target.value)}
                          className="px-3 py-2 rounded-md bg-[#06121a] border border-white/8 outline-none w-28"
                          placeholder="Currency"
                        />
                        {registers.length > 1 && <button onClick={() => removeRegister(idx)} className="px-3 py-2 bg-white/6 rounded-md">Del</button>}
                      </div>
                    ))}
                    <button onClick={addRegister} className="mt-2 inline-block px-4 py-2 rounded-md bg-white/6">Add register</button>
                  </div>
                </div>
              </div>

              <div className="mt-6">
                <button onClick={() => setStep(2)} className="w-full py-3 rounded-md font-semibold bg-gradient-to-r from-[#B2FFE9] to-[#C8FFF0] text-black">Continue →</button>
              </div>
            </div>
          )}

          {/* STEP 2: Categories & Tax */}
          {step === 2 && (
            <div>
              <h2 className="text-xl font-semibold mb-3">Default Categories & Tax</h2>
              <p className="text-white/70 mb-4">Pick product categories and default tax region.</p>

              <div className="mb-4">
                <div className="text-sm text-white/60 mb-2">Default product categories</div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {AVAILABLE_CATEGORIES.map((cat) => (
                    <label key={cat} className={`cursor-pointer px-4 py-3 rounded-md border transition-all ${defaultCategories.includes(cat) ? "border-[#00E3C2] bg-[#00E3C2]/10" : "border-white/10 hover:bg-white/5"}`}>
                      <input type="checkbox" checked={defaultCategories.includes(cat)} onChange={() => toggleCategory(cat)} className="mr-3" />
                      {cat}
                    </label>
                  ))}
                </div>
              </div>

              <div className="mb-6">
                <div className="text-sm text-white/60 mb-2">Tax region</div>
                <div className="flex gap-2 items-center">
                  <select value={taxCountry} onChange={(e) => setTaxCountry(e.target.value)} className="px-3 py-2 rounded-md bg-[#06121a] border border-white/8">
                    <option value="IN">India (IN)</option>
                    <option value="US">United States (US)</option>
                    <option value="GB">United Kingdom (GB)</option>
                    <option value="AE">United Arab Emirates (AE)</option>
                  </select>
                  <input type="number" value={defaultTaxPercent} onChange={(e) => setDefaultTaxPercent(Number(e.target.value))} className="w-36 px-3 py-2 rounded-md bg-[#06121a] border border-white/8" />
                  <div className="text-white/60">Default tax %</div>
                </div>
              </div>

              <div className="mt-6">
                <button onClick={() => setStep(3)} className="w-full py-3 rounded-md font-semibold bg-gradient-to-r from-[#B2FFE9] to-[#C8FFF0] text-black">Continue →</button>
              </div>
            </div>
          )}

          {/* STEP 3: Pricing & Payments */}
          {step === 3 && (
            <div>
              <h2 className="text-xl font-semibold mb-3">Pricing & Payment Methods</h2>
              <p className="text-white/70 mb-4">Choose pricing policy and payment methods you accept.</p>

              <div className="mb-4">
                <div className="text-sm text-white/60 mb-2">Pricing policy</div>
                <div className="space-y-3">
                  {["retail", "wholesale", "mixed"].map((p) => (
                    <label key={p} className={`block px-4 py-3 rounded-md border transition-all ${pricingPolicy === p ? "border-[#00E3C2] bg-[#00E3C2]/10" : "border-white/10 hover:bg-white/5"}`}>
                      <input type="radio" name="pricing" value={p} checked={pricingPolicy === p} onChange={(e) => setPricingPolicy(e.target.value)} className="mr-3" />
                      {p === "retail" ? "Retail pricing (markup)" : p === "wholesale" ? "Wholesale pricing (discounts)" : "Mixed"}
                    </label>
                  ))}
                </div>
              </div>

              <div className="mb-4">
                <div className="text-sm text-white/60 mb-2">Payment methods</div>
                <div className="grid grid-cols-2 gap-3">
                  {AVAILABLE_PAYMENT_METHODS.map((m) => (
                    <label key={m.key} className={`px-4 py-3 rounded-md border transition-all ${paymentMethods.includes(m.key) ? "border-[#00E3C2] bg-[#00E3C2]/10" : "border-white/10 hover:bg-white/5"}`}>
                      <input type="checkbox" checked={paymentMethods.includes(m.key)} onChange={() => togglePaymentMethod(m.key)} className="mr-3" />
                      {m.label}
                    </label>
                  ))}
                </div>
              </div>

              <div className="mb-4">
                <label className="flex items-center gap-3">
                  <input type="checkbox" checked={seedOpeningInventory} onChange={(e) => setSeedOpeningInventory(e.target.checked)} />
                  <span className="text-white/80">Seed sample opening inventory (small demo SKUs)</span>
                </label>
                <div className="text-xs text-white/60 mt-2">If enabled, the provisioning will create a small set of demo products and opening stock for quick testing.</div>
              </div>

              <div className="mt-6 flex gap-3">
                <button onClick={() => setStep(2)} className="flex-1 py-3 rounded-md font-semibold bg-white/6">Back</button>
                <button onClick={() => setStep(4)} className="flex-1 py-3 rounded-md font-semibold bg-gradient-to-r from-[#B2FFE9] to-[#C8FFF0] text-black">Continue →</button>
              </div>
            </div>
          )}

          {/* STEP 4: Summary & Submit */}
          {step === 4 && (
            <div>
              <h2 className="text-xl font-semibold mb-3">Review & Create Workspace</h2>
              <div className="text-white/70 mb-4">
                Review your configuration. When you click <strong>Create workspace</strong> the platform will provision:
                <ul className="list-disc list-inside mt-2 text-white/60 space-y-1">
                  <li>Store locations & POS registers</li>
                  <li>Default product categories</li>
                  <li>Tax rates and pricing policy</li>
                  <li>Payment method integrations (placeholders)</li>
                  <li>Optional demo products & opening stock</li>
                </ul>
              </div>

              <div className="rounded-md p-4 bg-[rgba(255,255,255,0.02)] border border-white/8 mb-4">
                <div className="font-medium mb-2">Summary</div>
                <div className="text-sm text-white/70 space-y-2">
                  <div><strong>Stores:</strong> {storeLocations.map(s => s.name).join(", ")}</div>
                  <div><strong>Registers:</strong> {registers.map(r => r.name).join(", ")}</div>
                  <div><strong>Categories:</strong> {defaultCategories.join(", ")}</div>
                  <div><strong>Tax:</strong> {taxCountry} @ {defaultTaxPercent}%</div>
                  <div><strong>Pricing:</strong> {pricingPolicy}</div>
                  <div><strong>Payments:</strong> {paymentMethods.join(", ")}</div>
                  <div><strong>Seed inventory:</strong> {seedOpeningInventory ? "Yes" : "No"}</div>
                </div>
              </div>

              <div className="flex gap-3">
                <button onClick={() => setStep(3)} className="flex-1 py-3 rounded-md font-semibold bg-white/6">Back</button>
                <button onClick={submitRetailOnboarding} className="flex-1 py-3 rounded-md font-semibold bg-gradient-to-r from-[#00E3C2] to-[#7dd3fc] text-black">Create workspace</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
