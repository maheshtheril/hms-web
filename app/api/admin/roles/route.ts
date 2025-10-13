import { NextRequest, NextResponse } from "next/server";
const ORIGIN = process.env.BACKEND_URL || "http://localhost:4000";

export async function GET(req: NextRequest) {
  const upstream = await fetch(`${ORIGIN}/admin/roles`, {
    headers: {
      authorization: req.headers.get("authorization") ?? "",
      cookie: req.headers.get("cookie") ?? "",
    },
    cache: "no-store",
  });
  const text = await upstream.text();
  return new NextResponse(text, {
    status: upstream.status,
    headers: { "content-type": upstream.headers.get("content-type") ?? "application/json" },
  });
}
