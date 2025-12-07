// types/index.ts
export type ProductRecord = {
  id: string;
  name: string;
  sku?: string;
  price?: number;
  stock?: number | null;
  default_batch_id?: string | null;
  has_multiple_batches?: boolean;
  tax_rate?: number;
};

export type BatchRecord = {
  id: string;
  batch_number: string;
  expiry?: string | null;
  available_qty: number;
};

export type CartLine = {
  id: string;
  product_id: string;
  batch_id?: string | null;
  quantity: number;
  unit_price: number;
  discount_amount?: number;
  tax_rate?: number;
  name?: string | null;
  sku?: string | null;
  reservation_id?: string | null;
  reservation_expires_at?: string | null;
  prescription_line_id?: string | null;
};

export type PrescriptionLine = {
  id?: string | null;
  product_name: string;
  qty?: number;
  note?: string;
  suggested_product_ids?: string[];
};
