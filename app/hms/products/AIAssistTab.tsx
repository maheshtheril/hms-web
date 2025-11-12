// app/hms/products/product-editor/AIAssistTab.tsx
"use client";

import React, { useCallback, useMemo, useState } from "react";
import apiClient from "@/lib/api-client";
import { useToast } from "@/components/toast/ToastProvider";
import { Sparkles, Type, Tag, CheckCircle, RefreshCw, Loader2, Zap } from "lucide-react";

type ProductDraft = {
  id?: string;
  name?: string;
  sku?: string;
  description?: string;
  metadata?: Record<string, any> | null;
};

interface Props {
  draft: ProductDraft;
  onChange: (patch: Partial<ProductDraft>) => void;
}

/**
 * AIAssistTab
 * - Single place for AI utilities: generate name, write description, suggest categories/tags and SEO blurb
 * - Client calls backend endpoint /hms/ai/generate which must proxy to the chosen model (OpenAI / Anthropic / local)
 * - Results returned are applied to draft via onChange({ description, name, metadata: { ... } })
 */

const TONES = ["Neutral", "Casual", "Technical", "Luxury", "Playful"] as const;
type Tone = typeof TONES[number];

export default function AIAssistTab({ draft, onChange }: Props) {
  const toast = useToast();

  const [promptPreviewOpen, setPromptPreviewOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [lastResponse, setLastResponse] = useState<string | null>(null);

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

  // single helper to call the backend AI endpoint
  async function callAI(prompt: string, stop?: string[]) {
    setIsGenerating(true);
    setLastResponse(null);
    try {
      // Backend endpoint should accept { prompt, max_tokens, temperature, stop } and return { text } (string)
      const res = await apiClient.post("/hms/ai/generate", {
        prompt,
        max_tokens: maxTokens,
        temperature,
        stop,
      });
      // attempt to extract text from common shapes
      const text = res.data?.text ?? res.data?.result ?? res.data?.data?.text ?? JSON.stringify(res.data);
      setLastResponse(typeof text === "string" ? text : JSON.stringify(text));
      return text;
    } catch (err: any) {
      console.error("AI call failed", err);
      toast.error(err?.message ?? "AI request failed");
      throw err;
    } finally {
      setIsGenerating(false);
    }
  }

  // parse naive JSON out of text (tolerant)
  function tryParseJSON(text: string | null) {
    if (!text) return null;
    // attempt to find a JSON object/array inside text
    const jsonMatch = text.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
    if (!jsonMatch) return null;
    try {
      return JSON.parse(jsonMatch[0]);
    } catch {
      // fallback: try to fix common issues — remove trailing commas
      try {
        const cleaned = jsonMatch[0].replace(/,\s*}/g, "}").replace(/,\s*]/g, "]");
        return JSON.parse(cleaned);
      } catch {
        return null;
      }
    }
  }

  // public actions
  async function generateNames() {
    if (!context.name && !context.description) return toast.error("Provide at least a name or description as context");
    const prompt = buildPrompt("name");
    try {
      const text = await callAI(prompt);
      const parsed = tryParseJSON(text as string);
      const names = Array.isArray(parsed) ? (parsed as unknown[]).map((x) => String(x)) : (text as string).split("\n").map((s: string) => s.trim()).filter(Boolean).slice(0, 6);
      setSuggestedName(names[0] ?? "");
      toast.success("Name suggestions ready");
    } catch {
      /* handled above */
    }
  }

  async function generateDescription() {
    if (!context.name && !context.description) return toast.error("Provide at least a name or description as context");
    const prompt = buildPrompt("description");
    try {
      const text = await callAI(prompt);
      const parsed = tryParseJSON(text as string);
      if (parsed && typeof parsed === "object" && (parsed as any).description) {
        const desc = (parsed as any).description as string;
        setSuggestedDescription(desc);
        // merge highlights into metadata
        onChange({ description: desc, metadata: { ...(draft.metadata ?? {}), ai_highlights: (parsed as any).highlights ?? [] } });
      } else {
        // fallback: treat whole text as description
        setSuggestedDescription((text as string).trim());
      }
      toast.success("Description generated");
    } catch {
      /* handled above */
    }
  }

  async function generateCategoryAndTags() {
    if (!context.name && !context.description) return toast.error("Provide at least a name or description as context");
    const prompt = buildPrompt("category_tags");
    try {
      const text = await callAI(prompt);
      const parsed = tryParseJSON(text as string);
      if (parsed && typeof parsed === "object") {
        const parsedObj = parsed as any;
        setSuggestedCategory(parsedObj.category ?? "");
        if (Array.isArray(parsedObj.tags)) {
          setSuggestedTags(parsedObj.tags.map((t: unknown) => String(t)));
        } else if (typeof parsedObj.tags === "string") {
          setSuggestedTags(parsedObj.tags.split(",").map((s: string) => s.trim()));
        } else {
          setSuggestedTags([]);
        }
      } else {
        // try to parse simple CSV or lines
        const lines = (text as string).split("\n").map((s: string) => s.trim()).filter(Boolean);
        setSuggestedCategory(lines[0] ?? "");
        setSuggestedTags(lines.slice(1).join(",").split(",").map((s: string) => s.trim()).filter(Boolean));
      }
      toast.success("Category & tags suggested");
    } catch {
      /* handled above */
    }
  }

  async function generateSEO() {
    if (!context.name && !context.description) return toast.error("Provide at least a name or description as context");
    const prompt = buildPrompt("seo");
    try {
      const text = await callAI(prompt);
      const parsed = tryParseJSON(text as string);
      if (parsed && typeof parsed === "object" && (parsed as any).meta) {
        const meta = (parsed as any).meta as string;
        const keywords = Array.isArray((parsed as any).keywords) ? (parsed as any).keywords.map((k: unknown) => String(k)) : [];
        onChange({ metadata: { ...(draft.metadata ?? {}), seo: { meta, keywords } } });
      } else {
        onChange({ metadata: { ...(draft.metadata ?? {}), seo: { meta: (text as string).slice(0, 160), keywords: [] } } });
      }
      toast.success("SEO blurb generated");
    } catch {
      /* handled above */
    }
  }

  // apply single suggestion to draft
  function acceptName(name: string) {
    onChange({ name });
    setSuggestedName("");
    toast.success("Name applied");
  }
  function acceptDescription(desc: string) {
    onChange({ description: desc });
    setSuggestedDescription("");
    toast.success("Description applied");
  }
  function acceptCategoryAndTags(category: string, tags: string[]) {
    onChange({ metadata: { ...(draft.metadata ?? {}), category, tags } });
    setSuggestedCategory("");
    setSuggestedTags([]);
    toast.success("Category & tags applied");
  }

  // safety: quick profanity check (simple)
  function safetyCheck(text: string) {
    if (!text) return true;
    const banned = ["kill", "bomb", "hate", "terror"]; // extremely naive — replace with your own moderation service
    const l = text.toLowerCase();
    return !banned.some((b) => l.includes(b));
  }

  // small UI helper for preview
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
                <select value={selectedTone} onChange={(e) => setSelectedTone(e.target.value as Tone)} className="w-full rounded-2xl px-3 py-2 border bg-white/60">
                  {TONES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs text-slate-500">Temperature</label>
                <input type="range" min={0} max={1} step={0.05} value={temperature} onChange={(e) => setTemperature(Number(e.target.value))} className="w-full" />
                <div className="text-xs text-slate-400 mt-1">{temperature.toFixed(2)}</div>
              </div>

              <div>
                <label className="text-xs text-slate-500">Max tokens / length</label>
                <input type="number" min={32} max={800} value={maxTokens} onChange={(e) => setMaxTokens(Number(e.target.value || 120))} className="w-full rounded-2xl px-3 py-2 border bg-white/60" />
              </div>

              <div className="flex items-end">
                <div className="flex gap-2">
                  <button onClick={generateNames} className="px-3 py-2 rounded-2xl bg-blue-600 text-white inline-flex items-center gap-2">
                    <Type className="w-4 h-4" /> Name
                  </button>
                  <button onClick={generateDescription} className="px-3 py-2 rounded-2xl bg-indigo-600 text-white inline-flex items-center gap-2">
                    <Zap className="w-4 h-4" /> Description
                  </button>
                  <button onClick={generateCategoryAndTags} className="px-3 py-2 rounded-2xl bg-emerald-600 text-white inline-flex items-center gap-2">
                    <Tag className="w-4 h-4" /> Category/Tags
                  </button>
                </div>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-12 gap-3">
              <div className="col-span-6">
                <div className="text-xs text-slate-500 mb-1">Suggested name</div>
                <div className="flex gap-2 items-center">
                  <input value={suggestedName} onChange={(e) => setSuggestedName(e.target.value)} placeholder="AI suggestion" className="flex-1 rounded-2xl px-3 py-2 border bg-white/60" />
                  <button onClick={() => acceptName(suggestedName)} disabled={!suggestedName || !safetyCheck(suggestedName)} className="px-3 py-2 rounded-2xl bg-white/90 border">
                    Apply
                  </button>
                </div>
              </div>

              <div className="col-span-6">
                <div className="text-xs text-slate-500 mb-1">Suggested category & tags</div>
                <div className="flex gap-2 items-center">
                  <input value={suggestedCategory} onChange={(e) => setSuggestedCategory(e.target.value)} placeholder="Category" className="rounded-2xl px-3 py-2 border bg-white/60" />
                  <input
                    value={suggestedTags.join(", ")}
                    onChange={(e) => setSuggestedTags(e.target.value.split(",").map((s: string) => s.trim()))}
                    placeholder="tag1, tag2, tag3"
                    className="flex-1 rounded-2xl px-3 py-2 border bg-white/60"
                  />
                  <button onClick={() => acceptCategoryAndTags(suggestedCategory, suggestedTags)} disabled={!suggestedCategory} className="px-3 py-2 rounded-2xl bg-white/90 border">
                    Apply
                  </button>
                </div>
              </div>

              <div className="col-span-12 mt-3">
                <div className="text-xs text-slate-500 mb-1">Suggested description</div>
                <textarea value={suggestedDescription} onChange={(e) => setSuggestedDescription(e.target.value)} placeholder="AI description preview" rows={4} className="w-full rounded-2xl px-3 py-2 border bg-white/60" />
                <div className="mt-2 flex justify-end gap-2">
                  <button
                    onClick={() => {
                      setSuggestedDescription("");
                    }}
                    className="px-3 py-2 rounded-2xl border"
                  >
                    Clear
                  </button>
                  <button onClick={() => acceptDescription(suggestedDescription)} disabled={!suggestedDescription || !safetyCheck(suggestedDescription)} className="px-3 py-2 rounded-2xl bg-indigo-600 text-white inline-flex items-center gap-2">
                    <CheckCircle className="w-4 h-4" /> Apply description
                  </button>
                </div>
              </div>
            </div>

            <div className="mt-4 flex items-center justify-between">
              <div className="text-xs text-slate-500">Prompt Preview</div>
              <div className="flex items-center gap-2">
                <button onClick={() => setPromptPreviewOpen(!promptPreviewOpen)} className="px-3 py-1 rounded-md border inline-flex items-center gap-2">
                  <RefreshCw className="w-4 h-4" /> Preview
                </button>
                <div className="text-xs text-slate-400">{lastResponse ? "Last result available" : isGenerating ? "Generating…" : "Idle"}</div>
              </div>
            </div>

            {promptPreviewOpen && <pre className="mt-3 p-3 rounded-md bg-black/5 text-xs overflow-auto">{promptForPreview}</pre>}
          </div>

          <div className="col-span-4">
            <div className="rounded-2xl bg-white/30 border p-3 shadow-sm">
              <div className="text-xs text-slate-500 mb-2">AI Response</div>
              <div className="min-h-[120px] p-2 rounded-md bg-white/60 overflow-auto">
                {isGenerating ? (
                  <div className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" /> Generating…
                  </div>
                ) : lastResponse ? (
                  <pre className="text-xs">{lastResponse}</pre>
                ) : (
                  <div className="text-xs text-slate-500">No response yet. Trigger a generation above.</div>
                )}
              </div>

              <div className="mt-3">
                <div className="text-xs text-slate-500 mb-1">Safety</div>
                <div className="text-xs text-slate-400">We run a client-side sanity filter but you should enforce server-side moderation before persisting any AI output to product records.</div>
                <div className="mt-2 text-xs text-slate-500">Actions</div>
                <div className="mt-2 flex gap-2">
                  <button
                    onClick={() => {
                      setSuggestedName("");
                      setSuggestedDescription("");
                      setSuggestedCategory("");
                      setSuggestedTags([]);
                      setLastResponse(null);
                      toast.info("Cleared AI suggestions");
                    }}
                    className="px-3 py-2 rounded-2xl border"
                  >
                    Clear suggestions
                  </button>
                  <button
                    onClick={() => {
                      setLastResponse(null);
                      toast.info("Cleared preview");
                    }}
                    className="px-3 py-2 rounded-2xl bg-white/90 border"
                  >
                    Clear preview
                  </button>
                </div>
              </div>
            </div>

            <div className="mt-3 rounded-2xl bg-white/30 border p-3">
              <div className="text-xs text-slate-500">Quick tips</div>
              <ul className="text-xs text-slate-400 mt-2 space-y-1">
                <li>Provide a good seed: name + 1-2 sentence description improves results.</li>
                <li>Use lower temperature for factual text, higher for creative names.</li>
                <li>Always review AI text before applying — enforce server-side moderation.</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
