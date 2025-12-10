// web/app/api/ai/hsn/route.ts
import { NextRequest, NextResponse } from "next/server";
import apiClient from "@/lib/api-client";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const data = await apiClient.post("/ai/hsn", body);
  return NextResponse.json(data);
}
