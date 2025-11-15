// web/app/dashboard/settings/currencies/types.ts
export type CurrencyRow = {
  code: string;
  symbol: string;
  precision: number; // numeric precision (decimal places)
  locale?: string | null;
  active?: boolean;
  tenant_id?: string | null;
  company_id?: string | null;
  created_at?: string;
  updated_at?: string;
};
