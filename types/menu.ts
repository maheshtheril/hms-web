export interface MenuItem {
  id: string;
  parent_id: string | null;
  module_key: string;
  key: string;
  label: string;
  icon: string | null;
  url: string | null;
  sort_order: number;
  permission_code?: string | null;
  children?: MenuItem[];
}

export interface MenuResponse {
  ok: boolean;
  modules: string[];
  items: MenuItem[];
}
