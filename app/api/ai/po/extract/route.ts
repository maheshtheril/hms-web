// web/app/api/ai/po/extract/route.ts
import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

export const runtime = "edge";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const file = form.get("file") as File | null;
    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const bytes = Buffer.from(await file.arrayBuffer());
    const dataUrl = `data:${file.type};base64,${bytes.toString("base64")}`;

    const prompt = `
Extract ALL medicine line-items from a PDF invoice image.

Return ONLY JSON in this exact format:

{
  "lines": [
    {
      "name": "",
      "salt": "",
      "manufacturer": "",
      "batch_no": "",
      "expiry": "",
      "qty": 0,
      "mrp": 0,
      "cost": 0,
      "gst": 0,
      "hsn": ""
    }
  ]
}

Be accurate. Bill may have 5 to 200 items.
`;

    // Use Responses API which supports multimodal inputs
    const aiResponse = await openai.responses.create({
      model: "gpt-4o-mini",
      input: [
        { role: "system", content: prompt },
        {
          role: "user",
          // cast to any to avoid strict typing for the multimodal part
          content: [
            { type: "input_image", image_url: dataUrl } as any
          ],
        },
      ],
      // you can tune max_output_tokens etc. if needed
    } as any); // top-level any to avoid strict shape mismatch

    // The Responses API returns outputs in several shapes.
    // We'll search for a text output in aiResponse.output.
    const outputs: any[] = (aiResponse as any)?.output || [];
    let rawText: string | null = null;

    for (const out of outputs) {
      if (!out) continue;
      // Some outputs have .content which is an array of parts
      const parts = out.content || [];
      for (const part of parts) {
        // part may have 'type' and 'text' or 'value' depending on model
        if (part?.type === "output_text" && typeof part?.text === "string") {
          rawText = part.text;
          break;
        }
        // fallback: some SDK versions return { type: 'message', text: '...' } or { text: '...' }
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
      // fallback: some outputs include 'content[0].text' at top level
      if (out?.text && typeof out.text === "string") {
        rawText = out.text;
        break;
      }
    }

    if (!rawText) {
      // as last resort, inspect aiResponse.output_text (older SDK shapes)
      if ((aiResponse as any).output_text && typeof (aiResponse as any).output_text === "string") {
        rawText = (aiResponse as any).output_text;
      }
    }

    if (!rawText) {
      return NextResponse.json({ error: "No textual output from AI" }, { status: 502 });
    }

    // Attempt to parse JSON from the model output
    // Some models may return text with code fences — strip them
    const cleaned = rawText.trim().replace(/^```json\s*/, "").replace(/```\s*$/, "").trim();

    let parsed: any;
    try {
      parsed = JSON.parse(cleaned);
    } catch (e) {
      // If parsing fails, return the raw text so the caller can inspect it
      return NextResponse.json({ error: "Failed to parse AI output as JSON", raw: cleaned }, { status: 502 });
    }

    return NextResponse.json(parsed);
  } catch (err: any) {
    console.error("AI extract error:", err);
    return NextResponse.json({ error: err?.message || "Extraction failed" }, { status: 500 });
  }
}
