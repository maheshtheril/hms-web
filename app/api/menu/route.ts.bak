// app/api/menu/route.ts
import { NextRequest, NextResponse } from "next/server";

const BACKEND = process.env.BACKEND_ORIGIN || "https://hms-server-njlg.onrender.com"; // or hmsweb.onrender.com if that’s correct

export async function GET(req: NextRequest) {
  const cookieHeader = req.headers.get("cookie") || "";

  const backendRes = await fetch(`${BACKEND}/api/menu`, {
    method: "GET",
    headers: {
      cookie: cookieHeader,
      Accept: "application/json",
    },
    cache: "no-store",
  });

  const text = await backendRes.text();
  const resHeaders = new Headers();
  const ct = backendRes.headers.get("content-type");
  if (ct) resHeaders.set("Content-Type", ct);
  return new NextResponse(text, { status: backendRes.status, headers: resHeaders });
}
