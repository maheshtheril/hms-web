// web/app/api/ai/product/extract/route.ts
import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

export const runtime = "edge";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const file = form.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "Missing file" }, { status: 400 });
    }

    const bytes = Buffer.from(await file.arrayBuffer());
    const base64 = bytes.toString("base64");

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

    const ai = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: prompt },
        {
          role: "user",
          content: [
            {
              type: "input_image",
              image_url: `data:${file.type};base64,${base64}`,
            },
          ],
        },
      ],
    });

    const json = JSON.parse(ai.choices[0].message.content);

    // HSN + GST enrichment
    const hsnRes = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/ai/hsn`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(json),
    }).then((r) => r.json());

    json.hsn = hsnRes.hsn;
    json.gst = hsnRes.gst;
    json.hsn_confidence = hsnRes.confidence;

    return NextResponse.json(json);
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "AI extraction failed" },
      { status: 500 }
    );
  }
}
