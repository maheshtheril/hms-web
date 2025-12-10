// web/app/api/ai/product/save/route.ts
import { NextRequest, NextResponse } from "next/server";
import apiClient from "@/lib/api-client";

export async function POST(req: NextRequest) {
  const body = await req.json();

  // Convert AI result → product master format
  const payload = {
    sku: body.sku || body.batch_no,
    name: body.name,
    description: `${body.name} | ${body.salt}`,
    short_description: body.pack,
    price: body.mrp,
    default_cost: body.cost,
    uom: "Unit",
    is_stockable: true,
    is_service: false,
    batches: [
      {
        batch_no: body.batch_no,
        expiry_date: body.expiry,
        qty_on_hand: body.qty,
        cost: body.cost,
        mrp: body.mrp,
      },
    ],
    tax_rules: [
      {
        tax_id: null,
        rate: body.gst,
        tax_name: `GST ${body.gst}%`,
        account_id: null,
      },
    ],
  };

  const r = await apiClient.post("/products", payload);
  return NextResponse.json(r);
}
