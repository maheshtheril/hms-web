// web/app/api/ai/product/extract/route.ts
import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

export const runtime = "edge";

// Lazy factory — returns null if no key is available
async function getOpenAI() {
  const key = process.env.OPENAI_API_KEY;
  if (!key) return null;
  return new OpenAI({ apiKey: key });
}

export async function POST(req: NextRequest) {
  try {
    const openai = await getOpenAI();
    if (!openai) {
      return NextResponse.json(
        { error: "AI unavailable: OPENAI_API_KEY not set in environment." },
        { status: 503 }
      );
    }

    const form = await req.formData();
    const file = form.get("file") as File | null;
    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const bytes = Buffer.from(await file.arrayBuffer());
    const dataUrl = `data:${file.type};base64,${bytes.toString("base64")}`;

    const prompt = `
You are an expert medical inventory extraction system.
Extract structured product + batch + tax details from medicine invoices.

Return ONLY JSON in this exact format:
{
  "sku": "...",
  "name": "...",
  "manufacturer": "...",
  "hsn": "...",
  "mrp": "...",
  "cost": "...",
  "batch_no": "...",
  "expiry": "...",
  "qty": "...",
  "gst": "...",
  "salt": "...",
  "pack": "...",
  "uom": "Unit"
}
Be accurate.
`;

    // Use Responses API (multimodal-friendly). Use `any` casts to avoid fragile SDK types at compile time.
    const ai = await (openai as any).responses.create({
      model: "gpt-4o-mini",
      input: [
        { role: "system", content: prompt },
        {
          role: "user",
          content: [{ type: "input_image", image_url: dataUrl } as any],
        },
      ],
    } as any);

    // defensive extraction of textual output
    const outputs: any[] = (ai as any)?.output || [];
    let rawText: string | null = null;

    for (const out of outputs) {
      if (!out) continue;
      const parts = out.content || [];
      for (const part of parts) {
        if (part?.type === "output_text" && typeof part?.text === "string") {
          rawText = part.text;
          break;
        }
        if (typeof part === "string") {
          rawText = part;
          break;
        }
        if (part?.text && typeof part.text === "string") {
          rawText = part.text;
          break;
        }
        if (part?.value && typeof part.value === "string") {
          rawText = part.value;
          break;
        }
      }
      if (rawText) break;
      if (out?.text && typeof out.text === "string") {
        rawText = out.text;
        break;
      }
    }

    if (!rawText && (ai as any).output_text) rawText = (ai as any).output_text;

    if (!rawText) {
      return NextResponse.json({ error: "AI returned no textual output" }, { status: 502 });
    }

    const cleaned = rawText.trim().replace(/^```json\s*/, "").replace(/```\s*$/, "").trim();

    try {
      const parsed = JSON.parse(cleaned);
      return NextResponse.json(parsed);
    } catch (e: any) {
      return NextResponse.json({ error: "Failed to parse AI output as JSON", raw: cleaned }, { status: 502 });
    }
  } catch (err: any) {
    console.error("AI product extract error:", err);
    return NextResponse.json({ error: err?.message || "Extraction failed" }, { status: 500 });
  }
}
