// web/app/api/taxes/route.ts
import { NextRequest, NextResponse } from "next/server";
import apiClient from "@/lib/api-client";

export async function GET(req: NextRequest) {
  const companyId = req.nextUrl.searchParams.get("company_id");
  const tenantId = req.nextUrl.searchParams.get("tenant_id");

  const data = await apiClient.get(
    `/taxes?company_id=${companyId}&tenant_id=${tenantId}`
  );

  return NextResponse.json(data);
}
