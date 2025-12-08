// app/hms/products/product-editor/AIAssistTab.tsx
"use client";

import React, { useCallback, useMemo, useState } from "react";
import apiClient from "@/lib/api-client";
import { useToast } from "@/components/toast/ToastProvider";
import { Sparkles, Type, Tag, CheckCircle, RefreshCw, Loader2, Zap } from "lucide-react";
import type { ProductDraft } from "./types";
import { useCompany } from "@/app/providers/CompanyProvider";

/**
 * Production-hardened AIAssistTab
 * - Client sends prompt request to /hms/ai/generate (server performs moderation + model call)
 * - Buttons disabled while generating to avoid duplicate calls
 * - Better parse error messages shown to user
 * - When user "Apply"s suggestions, we attach audit metadata to the draft so server can persist audit trail
 *
 * Important: This component still assumes the server endpoint implements moderation & audit logging.
 */

interface Props {
  draft: ProductDraft;
  onChange: (patch: Partial<ProductDraft>) => void;
}

const TONES = ["Neutral", "Casual", "Technical", "Luxury", "Playful"] as const;
type Tone = typeof TONES[number];

export default function AIAssistTab({ draft, onChange }: Props) {
  const toast = useToast();
  const { company } = useCompany();

  const [promptPreviewOpen, setPromptPreviewOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [lastResponse, setLastResponse] = useState<string | null>(null);
  const [lastParseError, setLastParseError] = useState<string | null>(null);
  const [lastPromptUsed, setLastPromptUsed] = useState<string | null>(null);

  const [selectedTone, setSelectedTone] = useState<Tone>("Neutral");
  const [maxTokens, setMaxTokens] = useState<number>(120);
  const [temperature, setTemperature] = useState<number>(0.6);

  const [suggestedName, setSuggestedName] = useState<string>("");
  const [suggestedDescription, setSuggestedDescription] = useState<string>("");
  const [suggestedCategory, setSuggestedCategory] = useState<string>("");
  const [suggestedTags, setSuggestedTags] = useState<string[]>([]);

  // seed context extracted from draft
  const context = useMemo(() => {
    return {
      name: draft?.name ?? "",
      sku: draft?.sku ?? "",
      description: draft?.description ?? "",
    };
  }, [draft]);

  // build a safe prompt — adjust to your preferred style
  const buildPrompt = useCallback(
    (task: "name" | "description" | "category_tags" | "seo", extra = "") => {
      const tone = selectedTone;
      const ctxName = context.name || "Unnamed product";
      const ctxSku = context.sku ? `SKU: ${context.sku}` : "";
      const ctxDesc = context.description ? `Current description: ${context.description}` : "";
      const common = `Product: ${ctxName}\n${ctxSku}\n${ctxDesc}`.trim();

      if (task === "name") {
        return `You are an expert product naming assistant. Given the product context below, propose 6 short, brandable, SEO-friendly product names (max 4 words each). Tone: ${tone}.\n\nContext:\n${common}\n\nReturn as a JSON array of strings only.${extra}`;
      }

      if (task === "description") {
        return `You are an expert product copywriter. Produce a concise, benefit-driven product description for the product below. Tone: ${tone}. Return 1 main paragraph (30-60 words) and 2 bullet highlights. Avoid marketing fluff. Context:\n${common}\n\nReturn as JSON: {\"description\":\"...\",\"highlights\":[\"...\",\"...\"]}${extra}`;
      }

      if (task === "category_tags") {
        return `You are an intelligent classifier. Suggest a single product category and 6 tags (comma separated) appropriate for the product below. Prefer exact terms used in e-commerce categories. Context:\n${common}\n\nReturn as JSON: {\"category\":\"...\",\"tags\":[\"...\",\"...\"]}${extra}`;
      }

      // seo
      return `You are an SEO writer. Produce a short SEO blurb (meta description) of max 155 characters and 6 focused keywords for the product below. Tone: ${tone}.\n\nContext:\n${common}\n\nReturn as JSON: {\"meta\":\"...\",\"keywords\":[\"...\"]}${extra}`;
    },
    [context, selectedTone]
  );

  // single helper to call the backend AI endpoint with safety bounds
  async function callAI(prompt: string, opts?: { max_tokens?: number; temperature?: number }) {
    // client-level bounds (server must enforce too)
    const MAX_TOKENS = 800;
    const MAX_TEMPERATURE = 1.0;
    const tokens = Math.min(opts?.max_tokens ?? maxTokens, MAX_TOKENS);
    const temp = Math.max(0, Math.min(MAX_TEMPERATURE, opts?.temperature ?? temperature));

    setIsGenerating(true);
    setLastResponse(null);
    setLastParseError(null);
    setLastPromptUsed(prompt);

    try {
      const res = await apiClient.post(
        "/hms/ai/generate",
        {
          prompt,
          max_tokens: tokens,
          temperature: temp,
          // include lightweight provenance info for auditing
          provenance: {
            product_id: draft?.id ?? null,
            company_id: (company as any)?.id ?? null,
            user_context: { sku: draft?.sku ?? null },
          },
        },
        { timeout: 120000 } // 120s client timeout (server should return faster)
      );

      // server returns { ok: true, text: "...", parse?: {...}, audit_id?: "..."}
      const text = res.data?.text ?? res.data?.result ?? null;
      const parse = res.data?.parse ?? null;
      const error = res.data?.error ?? null;

      if (error) {
        setLastResponse(null);
        setLastParseError(String(error));
        throw new Error(String(error));
      }

      const returned = typeof text === "string" ? text : JSON.stringify(text ?? "");
      setLastResponse(returned);
      return { text: returned, parse };
    } catch (err: any) {
      console.error("AI call failed", err);
      const message = err?.response?.data?.error ?? err?.message ?? "AI request failed";
      setLastParseError(String(message));
      toast.error(String(message));
      throw err;
    } finally {
      setIsGenerating(false);
    }
  }

  // tolerant JSON parse helper (same as before but reports errors)
  function tryParseJSON(text: string | null) {
    if (!text) return null;
    const jsonMatch = text.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
    if (!jsonMatch) return null;
    try {
      return JSON.parse(jsonMatch[0]);
    } catch (err) {
      try {
        const cleaned = jsonMatch[0].replace(/,\s*}/g, "}").replace(/,\s*]/g, "]");
        return JSON.parse(cleaned);
      } catch (err2) {
        return null;
      }
    }
  }

  // public actions
  async function generateNames() {
    if (!context.name && !context.description) return toast.error("Provide at least a name or description as context");
    const prompt = buildPrompt("name");
    try {
      const { text, parse } = await callAI(prompt);
      // prefer server-side parsed `parse` if available, else try client parse
      const parsed = parse ?? tryParseJSON(text);
      const names = Array.isArray(parsed) ? parsed.map((x) => String(x)) : (text as string).split("\n").map((s: string) => s.trim()).filter(Boolean).slice(0, 6);
      setSuggestedName(names[0] ?? "");
      toast.success("Name suggestions ready");
    } catch {
      // handled in callAI
    }
  }

  async function generateDescription() {
    if (!context.name && !context.description) return toast.error("Provide at least a name or description as context");
    const prompt = buildPrompt("description");
    try {
      const { text, parse } = await callAI(prompt);
      const parsed = parse ?? tryParseJSON(text);
      if (parsed && typeof parsed === "object" && (parsed as any).description) {
        const desc = String((parsed as any).description);
        setSuggestedDescription(desc);
        // merge highlights into metadata locally so user sees them before persisting
        onChange({ description: desc, metadata: { ...(draft.metadata ?? {}), ai_highlights: (parsed as any).highlights ?? [] } });
      } else {
        setSuggestedDescription(String(text ?? "").trim());
      }
      toast.success("Description generated (review before applying)");
    } catch {
      // handled above
    }
  }

  async function generateCategoryAndTags() {
    if (!context.name && !context.description) return toast.error("Provide at least a name or description as context");
    const prompt = buildPrompt("category_tags");
    try {
      const { text, parse } = await callAI(prompt);
      const parsed = parse ?? tryParseJSON(text);
      if (parsed && typeof parsed === "object") {
        const parsedObj = parsed as any;
        setSuggestedCategory(String(parsedObj.category ?? ""));
        if (Array.isArray(parsedObj.tags)) {
          setSuggestedTags(parsedObj.tags.map((t: unknown) => String(t)));
        } else if (typeof parsedObj.tags === "string") {
          setSuggestedTags(parsedObj.tags.split(",").map((s: string) => s.trim()));
        } else {
          setSuggestedTags([]);
        }
      } else {
        const lines = (text ?? "").split("\n").map((s: string) => s.trim()).filter(Boolean);
        setSuggestedCategory(lines[0] ?? "");
        setSuggestedTags(lines.slice(1).join(",").split(",").map((s: string) => s.trim()).filter(Boolean));
      }
      toast.success("Category & tags suggested");
    } catch {
      // handled above
    }
  }

  async function generateSEO() {
    if (!context.name && !context.description) return toast.error("Provide at least a name or description as context");
    const prompt = buildPrompt("seo");
    try {
      const { text, parse } = await callAI(prompt);
      const parsed = parse ?? tryParseJSON(text);
      if (parsed && typeof parsed === "object" && (parsed as any).meta) {
        const meta = String((parsed as any).meta);
        const keywords = Array.isArray((parsed as any).keywords) ? (parsed as any).keywords.map((k: unknown) => String(k)) : [];
        onChange({ metadata: { ...(draft.metadata ?? {}), seo: { meta, keywords } } });
      } else {
        onChange({ metadata: { ...(draft.metadata ?? {}), seo: { meta: String((text ?? "").slice(0, 155)), keywords: [] } } });
      }
      toast.success("SEO blurb generated");
    } catch {
      // handled above
    }
  }

  // apply suggestion + attach audit metadata
  function acceptName(name: string) {
    const audit = { ai: { source: "assist", prompt: lastPromptUsed, preview: lastResponse, ts: new Date().toISOString() } };
    onChange({ name, metadata: { ...(draft.metadata ?? {}), audit } });
    setSuggestedName("");
    toast.success("Name applied (audit attached)");
  }

  function acceptDescription(desc: string) {
    const audit = { ai: { source: "assist", prompt: lastPromptUsed, preview: lastResponse, ts: new Date().toISOString() } };
    onChange({ description: desc, metadata: { ...(draft.metadata ?? {}), ai_highlights: draft?.metadata?.ai_highlights ?? [], audit } });
    setSuggestedDescription("");
    toast.success("Description applied (audit attached)");
  }

  function acceptCategoryAndTags(category: string, tags: string[]) {
    const audit = { ai: { source: "assist", prompt: lastPromptUsed, preview: lastResponse, ts: new Date().toISOString() } };
    onChange({ metadata: { ...(draft.metadata ?? {}), category, tags, audit } });
    setSuggestedCategory("");
    setSuggestedTags([]);
    toast.success("Category & tags applied (audit attached)");
  }

  // client-side quick profanity check (must NOT be relied on for production)
  function safetyCheck(text: string) {
    if (!text) return true;
    const banned = ["bomb", "kill", "terror"]; // placeholder — server moderation still required
    const lower = text.toLowerCase();
    return !banned.some((b) => lower.includes(b));
  }

  const promptForPreview = buildPrompt("description");

  return (
    <div className="p-4">
      <div className="rounded-2xl bg-white/40 border p-4 shadow-sm">
        <div className="flex items-center gap-3">
          <Sparkles className="w-5 h-5" />
          <h4 className="text-sm font-semibold">AI Assist</h4>
        </div>

        <div className="mt-3 grid grid-cols-12 gap-4">
          <div className="col-span-8">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-slate-500">Tone</label>
                <select
                  value={selectedTone}
                  onChange={(e) => setSelectedTone(e.target.value as Tone)}
                  className="w-full rounded-2xl px-3 py-2 border bg-white/60"
                  aria-label="AI tone"
                  disabled={isGenerating}
                >
                  {TONES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs text-slate-500">Temperature</label>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={temperature}
                  onChange={(e) => setTemperature(Number(e.target.value))}
                  className="w-full"
                  aria-label="AI temperature"
                  disabled={isGenerating}
                />
                <div className="text-xs text-slate-400 mt-1">{temperature.toFixed(2)}</div>
              </div>

              <div>
                <label className="text-xs text-slate-500">Max tokens / length</label>
                <input
                  type="number"
                  min={32}
                  max={800}
                  value={maxTokens}
                  onChange={(e) => setMaxTokens(Number(e.target.value || 120))}
                  className="w-full rounded-2xl px-3 py-2 border bg-white/60"
                  aria-label="AI max tokens"
                  disabled={isGenerating}
                />
              </div>

              <div className="flex items-end">
                <div className="flex gap-2">
                  <button
                    onClick={generateNames}
                    className="px-3 py-2 rounded-2xl bg-blue-600 text-white inline-flex items-center gap-2"
                    aria-label="Generate name suggestions"
                    disabled={isGenerating}
                  >
                    <Type className="w-4 h-4" /> Name
                  </button>
                  <button
                    onClick={generateDescription}
                    className="px-3 py-2 rounded-2xl bg-indigo-600 text-white inline-flex items-center gap-2"
                    aria-label="Generate description"
                    disabled={isGenerating}
                  >
                    <Zap className="w-4 h-4" /> Description
                  </button>
                  <button
                    onClick={generateCategoryAndTags}
                    className="px-3 py-2 rounded-2xl bg-emerald-600 text-white inline-flex items-center gap-2"
                    aria-label="Generate category and tags"
                    disabled={isGenerating}
                  >
                    <Tag className="w-4 h-4" /> Category/Tags
                  </button>
                  <button
                    onClick={generateSEO}
                    className="px-3 py-2 rounded-2xl bg-yellow-600 text-white inline-flex items-center gap-2"
                    aria-label="Generate SEO blurb"
                    disabled={isGenerating}
                    title="Generate SEO meta (meta description + keywords)"
                  >
                    <Sparkles className="w-4 h-4" /> SEO
                  </button>
                </div>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-12 gap-3">
              <div className="col-span-6">
                <div className="text-xs text-slate-500 mb-1">Suggested name</div>
                <div className="flex gap-2 items-center">
                  <input
                    value={suggestedName}
                    onChange={(e) => setSuggestedName(e.target.value)}
                    placeholder="AI suggestion"
                    className="flex-1 rounded-2xl px-3 py-2 border bg-white/60"
                    aria-label="Suggested name"
                    disabled={isGenerating}
                  />
                  <button
                    onClick={() => acceptName(suggestedName)}
                    disabled={!suggestedName || !safetyCheck(suggestedName) || isGenerating}
                    className="px-3 py-2 rounded-2xl bg-white/90 border"
                    aria-label="Apply suggested name"
                  >
                    Apply
                  </button>
                </div>
              </div>

              <div className="col-span-6">
                <div className="text-xs text-slate-500 mb-1">Suggested category & tags</div>
                <div className="flex gap-2 items-center">
                  <input
                    value={suggestedCategory}
                    onChange={(e) => setSuggestedCategory(e.target.value)}
                    placeholder="Category"
                    className="rounded-2xl px-3 py-2 border bg-white/60"
                    aria-label="Suggested category"
                    disabled={isGenerating}
                  />
                  <input
                    value={suggestedTags.join(", ")}
                    onChange={(e) => setSuggestedTags(e.target.value.split(",").map((s: string) => s.trim()))}
                    placeholder="tag1, tag2, tag3"
                    className="flex-1 rounded-2xl px-3 py-2 border bg-white/60"
                    aria-label="Suggested tags"
                    disabled={isGenerating}
                  />
                  <button
                    onClick={() => acceptCategoryAndTags(suggestedCategory, suggestedTags)}
                    disabled={!suggestedCategory || isGenerating}
                    className="px-3 py-2 rounded-2xl bg-white/90 border"
                    aria-label="Apply suggested category and tags"
                  >
                    Apply
                  </button>
                </div>
              </div>

              <div className="col-span-12 mt-3">
                <div className="text-xs text-slate-500 mb-1">Suggested description</div>
                <textarea
                  value={suggestedDescription}
                  onChange={(e) => setSuggestedDescription(e.target.value)}
                  placeholder="AI description preview"
                  rows={4}
                  className="w-full rounded-2xl px-3 py-2 border bg-white/60"
                  aria-label="Suggested description"
                  disabled={isGenerating}
                />
                <div className="mt-2 flex justify-end gap-2">
                  <button
                    onClick={() => setSuggestedDescription("")}
                    className="px-3 py-2 rounded-2xl border"
                    aria-label="Clear suggested description"
                    disabled={isGenerating}
                  >
                    Clear
                  </button>
                  <button
                    onClick={() => acceptDescription(suggestedDescription)}
                    disabled={!suggestedDescription || !safetyCheck(suggestedDescription) || isGenerating}
                    className="px-3 py-2 rounded-2xl bg-indigo-600 text-white inline-flex items-center gap-2"
                    aria-label="Apply suggested description"
                  >
                    <CheckCircle className="w-4 h-4" /> Apply description
                  </button>
                </div>
              </div>
            </div>

            <div className="mt-4 flex items-center justify-between">
              <div className="text-xs text-slate-500">Prompt Preview</div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPromptPreviewOpen(!promptPreviewOpen)}
                  className="px-3 py-1 rounded-md border inline-flex items-center gap-2"
                  aria-label="Toggle prompt preview"
                >
                  <RefreshCw className="w-4 h-4" /> Preview
                </button>
                <div className="text-xs text-slate-400">{lastResponse ? "Last result available" : isGenerating ? "Generating…" : "Idle"}</div>
              </div>
            </div>

            {promptPreviewOpen && (
              <pre className="mt-3 p-3 rounded-md bg-black/5 text-xs overflow-auto" aria-live="polite">
                {promptForPreview}
              </pre>
            )}
          </div>

          <div className="col-span-4">
            <div className="rounded-2xl bg-white/30 border p-3 shadow-sm">
              <div className="text-xs text-slate-500 mb-2">AI Response</div>
              <div className="min-h-[120px] p-2 rounded-md bg-white/60 overflow-auto" aria-live="polite">
                {isGenerating ? (
                  <div className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" /> Generating…
                  </div>
                ) : lastResponse ? (
                  <pre className="text-xs">{lastResponse}</pre>
                ) : lastParseError ? (
                  <div className="text-xs text-rose-600">Parse/Error: {lastParseError}</div>
                ) : (
                  <div className="text-xs text-slate-500">No response yet. Trigger a generation above.</div>
                )}
              </div>

              <div className="mt-3">
                <div className="text-xs text-slate-500 mb-1">Safety</div>
                <div className="text-xs text-slate-400">We run a client-side sanity filter but require server-side moderation before persisting any AI output to product records.</div>
                <div className="mt-2 text-xs text-slate-500">Actions</div>
                <div className="mt-2 flex gap-2">
                  <button
                    onClick={() => {
                      setSuggestedName("");
                      setSuggestedDescription("");
                      setSuggestedCategory("");
                      setSuggestedTags([]);
                      setLastResponse(null);
                      setLastParseError(null);
                      toast.info("Cleared AI suggestions");
                    }}
                    className="px-3 py-2 rounded-2xl border"
                    aria-label="Clear AI suggestions"
                    disabled={isGenerating}
                  >
                    Clear suggestions
                  </button>
                  <button
                    onClick={() => {
                      setLastResponse(null);
                      setLastParseError(null);
                      toast.info("Cleared preview");
                    }}
                    className="px-3 py-2 rounded-2xl bg-white/90 border"
                    aria-label="Clear preview"
                    disabled={isGenerating}
                  >
                    Clear preview
                  </button>
                </div>
              </div>
            </div>

            <div className="mt-3 rounded-2xl bg-white/30 border p-3">
              <div className="text-xs text-slate-500">Quick tips</div>
              <ul className="text-xs text-slate-400 mt-2 space-y-1">
                <li>Provide a good seed: name + 1–2 sentence description improves results.</li>
                <li>Use lower temperature for factual text, higher for creative names.</li>
                <li>Always review AI text before applying — server-side moderation is enforced by the backend.</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
