// web/app/api/products/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import apiClient from "@/lib/api-client";

// GET /api/products/:id — full hydrated product
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const data = await apiClient.get(`/products/${params.id}`);
  return NextResponse.json(data);
}

// PUT /api/products/:id — update
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const body = await req.json();
  const data = await apiClient.put(`/products/${params.id}`, body);
  return NextResponse.json(data);
}
