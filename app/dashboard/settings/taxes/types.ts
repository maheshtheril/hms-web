// web/app/dashboard/settings/taxes/types.ts
export type TaxRateRow = {
  id: string;
  tenant_id?: string | null;
  company_id?: string | null;
  name: string;
  rate: number; // decimal like 0.18
  type: string; // e.g. "gst", "service", "city", "custom"
  country?: string | null;
  state?: string | null;
  city?: string | null;
  active?: boolean;
  created_at?: string;
  updated_at?: string;
};
