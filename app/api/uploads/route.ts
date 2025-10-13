// app/api/uploads/route.ts
import { NextRequest, NextResponse } from "next/server";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import crypto from "crypto";

export const runtime = "nodejs";        // ensure Node runtime (not edge)
export const dynamic = "force-dynamic"; // avoid static optimization

function safeBaseName(name: string) {
  const base = name.replace(/\.[^/.]+$/, ""); // strip ext
  return base.replace(/[^\w\-]+/g, "_").slice(0, 50) || "file";
}

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const file = form.get("file") as File | null;
    if (!file) {
      return NextResponse.json({ error: "No file field 'file' provided" }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const uploadDir = path.join(process.cwd(), "public", "uploads");
    await mkdir(uploadDir, { recursive: true });

    const origName = file.name || "upload.bin";
    const ext = path.extname(origName) || "";
    const base = safeBaseName(origName);
    const rand = crypto.randomBytes(6).toString("hex");
    const filename = `${Date.now()}-${rand}-${base}${ext}`;
    const filepath = path.join(uploadDir, filename);

    await writeFile(filepath, buffer);

    const url = `/uploads/${filename}`;
    return NextResponse.json({
      url,
      name: origName,
      size: buffer.length,
      type: file.type || "application/octet-stream",
      stored_as: filename,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Upload failed" },
      { status: 500 }
    );
  }
}
