import { NextRequest, NextResponse } from "next/server";
import apiClient from "@/lib/api-client";

export async function POST(req: NextRequest) {
  const form = await req.formData();
  const file = form.get("file");
  const text = form.get("text")?.toString() || "";

  // forward to backend service which can use OpenAI vision or Tesseract
  const payload: any = { text };

  if (file) {
    // convert file to base64 and send along
    const f = file as File;
    const arr = await f.arrayBuffer();
    const b64 = Buffer.from(arr).toString("base64");
    payload.file = { name: f.name, type: f.type, base64: b64 };
  }

  const data = await apiClient.post("/ai/salt/extract", payload);
  return NextResponse.json(data);
}
