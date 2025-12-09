// app/api/menu/route.ts
import { NextRequest, NextResponse } from "next/server";

const normalize = (raw?: string | null) => {
  if (!raw) return undefined;
  return String(raw).trim().replace(/\/+$/, "");
};

const backendBase =
  normalize(process.env.NEXT_PUBLIC_API_URL) ??
  normalize(process.env.BACKEND_ORIGIN) ??
  "https://hms-server-njlg.onrender.com";

/** join base + path safely (avoid duplicate /api) */
const joinPath = (base: string, path: string) => {
  const b = base.replace(/\/+$/, "");
  const p = path.replace(/^\/+/, "");
  return `${b}/${p}`;
};

export async function GET(req: NextRequest) {
  const cookieHeader = req.headers.get("cookie") ?? "";

  const url = joinPath(backendBase, "/api/menu");

  try {
    const backendRes = await fetch(url, {
      method: "GET",
      headers: {
        cookie: cookieHeader,
        Accept: "application/json, text/*, */*",
      },
      cache: "no-store",
    });

    // forward important headers (content-type, set-cookie)
    const resHeaders = new Headers();
    const contentType = backendRes.headers.get("content-type");
    if (contentType) resHeaders.set("Content-Type", contentType);

    // forward set-cookie if present (may be multiple)
    const setCookie = backendRes.headers.get("set-cookie");
    if (setCookie) resHeaders.set("Set-Cookie", setCookie);

    // Forward other useful CORS/diagnostic headers if you want:
    // const cacheControl = backendRes.headers.get("cache-control");
    // if (cacheControl) resHeaders.set("Cache-Control", cacheControl);

    const body = await backendRes.arrayBuffer(); // safe for json/text/binary

    return new NextResponse(body, {
      status: backendRes.status,
      headers: resHeaders,
    });
  } catch (err: any) {
    // network / fetch failure
    console.error("[menu proxy] fetch error", err);
    const payload = { error: "Bad Gateway", detail: err?.message ?? String(err) };
    return NextResponse.json(payload, { status: 502 });
  }
}
