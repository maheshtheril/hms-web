// web/types/menu.ts
export interface MenuItem {
  id: string;
  parent_id?: string | null;
  module_key?: string | null;
  key: string;
  label: string;
  url?: string | null;
  icon?: string | null;
  permission_code?: string | null;
  is_global?: boolean | null;
  sort_order?: number | null;

  // optional fields for UI
  badge?: string | number | null;
  children?: MenuItem[] | null;
  [k: string]: any;
}

export interface MenuResponse {
  ok: boolean;
  items: MenuItem[];
  modules?: string[];
  meta?: Record<string, any>;
}
