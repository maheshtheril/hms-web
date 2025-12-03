export type Company = {
  id: string;
  name: string;
  industry?: string | null;
  logo_url?: string | null;
  tenant_id?: string | null;
  [key: string]: any;
};
