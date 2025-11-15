// web/app/dashboard/settings/taxes/schema.ts
import { z } from "zod";

export const TaxRateInput = z.object({
  name: z.string().min(1),
  rate: z.number().min(0),
  type: z.string().default("vat"),
  country: z.string().nullable().optional(),
  state: z.string().nullable().optional(),
  city: z.string().nullable().optional(),
  active: z.boolean().optional().default(true),
});

export type TaxRateInputType = z.infer<typeof TaxRateInput>;
