// app/api/user/companies/route.ts
import { NextRequest, NextResponse } from "next/server";

const BACKEND = process.env.BACKEND_ORIGIN || "https://hmsweb.onrender.com";

export async function GET(req: NextRequest) {
  const cookieHeader = req.headers.get("cookie") || "";

  const backendRes = await fetch(`${BACKEND}/api/user/companies`, {
    method: "GET",
    headers: {
      cookie: cookieHeader,
      Accept: "application/json",
    },
    // server->server, no credentials needed
  });

  const text = await backendRes.text();
  const resHeaders = new Headers();
  const ct = backendRes.headers.get("content-type");
  if (ct) resHeaders.set("Content-Type", ct);
  return new NextResponse(text, { status: backendRes.status, headers: resHeaders });
}
