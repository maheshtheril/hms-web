// web/app/api/stock/allocate/route.ts
import { NextResponse, NextRequest } from "next/server";
import apiClient from "@/lib/api-client";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const r = await apiClient.post("/stock/allocate", body);
  return NextResponse.json(r);
}
