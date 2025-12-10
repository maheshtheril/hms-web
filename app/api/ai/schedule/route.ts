import { NextRequest, NextResponse } from "next/server";
import apiClient from "@/lib/api-client";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const r = await apiClient.post("/ai/schedule", body);
  return NextResponse.json(r);
}
