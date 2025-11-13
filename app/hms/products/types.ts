// app/hms/products/types.ts

/**
 * Shared type across ProductEditor and all tabs.
 * Allows nulls for form fields (e.g. cleared inputs).
 */
export type ProductDraft = {
  id?: string;
  name?: string | null;
  sku?: string | null;
  description?: string | null;
  price?: number | null;
  currency?: string | null;
  is_stockable?: boolean | null;
  attributes?: Record<string, any> | null;
  metadata?: Record<string, any> | null;
};
