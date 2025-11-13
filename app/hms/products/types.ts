// app/hms/products/types.ts
// Canonical ProductDraft used across the product editor and tabs.

export type InventoryBatch = {
  id?: string;
  reference?: string;
  qty: number;
  expiry?: string | null;
  location?: string | null;
  received_at?: string | null;
};

export type InventoryHistoryEntry = {
  id?: string;
  type?: "receive" | "adjust" | "transfer" | "sale" | string;
  change: number;
  note?: string | null;
  when?: string | null;
};

export type ProductInventory = {
  on_hand?: number;
  reserved?: number;
  incoming?: number;
  batches?: InventoryBatch[];
  history?: InventoryHistoryEntry[];
};

export type Tier = {
  id?: string;
  min_qty: number;
  price: number;
  currency?: string;
  note?: string;
};

export type PriceRule = {
  id?: string;
  name: string;
  active?: boolean;
  condition?: string;
  effect?: string;
};

export type ProductPricing = {
  base_price?: number;
  currency?: string;
  tiers?: Tier[];
  tax_percent?: number;
  rules?: PriceRule[];
};

/** Variant shape used by VariantsTab and backend */
export type Variant = {
  id?: string;
  sku?: string;
  attributes: Record<string, string>;
  price?: number | null;
  active?: boolean;
  inventory?: {
    on_hand?: number;
  } | null;
};

/** Attribute definition used to generate variants */
export type ProductAttribute = {
  name: string;
  values: string[];
};

/** Accounting mapping shape for product-level GL mapping */
export type AccountingMapping = {
  sales_account?: string | null; // account id
  expense_account?: string | null; // account id
  stock_input_account?: string | null;
  stock_output_account?: string | null;
  tax_code_id?: string | null;
  // future: add effective_date?: string | changed_by?: string, etc.
};

/** Tax code and account helper types (not strictly necessary but handy) */
export type TaxCode = {
  id: string;
  code: string;
  name: string;
  percent: number;
};

export type Account = {
  id: string;
  code?: string;
  name: string;
  type?: string;
};

export type ProductDraft = {
  id?: string;

  // prefer undefined for absent strings (avoid null)
  name?: string;
  sku?: string;
  description?: string;

  // numeric/boolean fields
  price?: number;
  currency?: string;
  is_stockable?: boolean;

  // images and other optional blobs
  images?: string[]; // array of image URLs

  // inventory (local-only or persisted)
  inventory?: ProductInventory;

  // pricing
  pricing?: ProductPricing;

  // variants & attributes
  attributes?: ProductAttribute[];
  variants?: Variant[];

  // accounting mapping
  accounting?: AccountingMapping;

  // flexible extension points
  attributes_extra?: Record<string, any>;
  attributes_meta?: Record<string, any>;
  metadata?: Record<string, any>;
};
