// web/app/api/products/route.ts
import { NextRequest, NextResponse } from "next/server";
import apiClient from "@/lib/api-client";

// GET /api/products — list
export async function GET(req: NextRequest) {
  const url = `/products?${req.nextUrl.searchParams.toString()}`;
  const data = await apiClient.get(url);
  return NextResponse.json(data);
}

// POST /api/products — create
export async function POST(req: NextRequest) {
  const body = await req.json();
  const data = await apiClient.post("/products", body);
  return NextResponse.json(data);
}
