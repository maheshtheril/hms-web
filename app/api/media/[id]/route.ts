// web/app/api/media/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import apiClient from "@/lib/api-client";

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const data = await apiClient.delete(`/media/${params.id}`);
  return NextResponse.json(data);
}
