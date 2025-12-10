// web/app/api/media/upload/route.ts
import { NextRequest, NextResponse } from "next/server";
import apiClient from "@/lib/api-client";

export async function POST(req: NextRequest) {
  const form = await req.formData();
  const file = form.get("file") as File;

  if (!file) {
    return NextResponse.json({ error: "No file received" }, { status: 400 });
  }

  // Convert File → Buffer
  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);

  // Build multipart FormData manually
  const fd = new FormData();
  fd.append("file", new Blob([buffer]), file.name);

  // Actual Axios upload request
  const response = await apiClient.post("/media/upload", fd, {
    headers: {
      "Content-Type": "multipart/form-data"
    }
  });

  return NextResponse.json(response.data);
}
