// app/api/whoami/route.ts
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
export async function GET() {
  return NextResponse.json({ ssr_sid: cookies().get("ssr_sid")?.value ?? null });
}
