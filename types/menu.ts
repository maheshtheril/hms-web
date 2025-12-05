// web/types/menu.ts

export type MenuItem = {
  id: string;
  key?: string;
  label: string;
  /** Canonical URL used by the frontend (we normalize backend `path` -> `url`) */
  url?: string | null;
  icon?: string | null;
  permission?: string | null;
  sort_order?: number;
  children?: MenuItem[];

  /** optional badge (small number or short text) */
  badge?: string | number | null;
};

export type MenuResponse = {
  ok: boolean;
  modules: string[];
  items: MenuItem[];
};
