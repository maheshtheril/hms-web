// usePOSCart.ts
// Core POS cart engine for POS V2 (strict TypeScript, production-ready)

import { useCallback, useEffect, useMemo, useReducer } from "react";

export interface CartLine {
  id: string;
  product_id: string;
  batch_id?: string | null;
  name: string;
  sku?: string;
  unit_price: number;
  quantity: number;
  discount_amount: number;
  tax_rate: number;
  reservation_id?: string | null;
  reservation_expires_at?: string | null;
  prescription_line_id?: string | null;
}

export interface CartState {
  cart: CartLine[];
}

type CartAction =
  | { type: "ADD_LINE"; payload: CartLine }
  | { type: "UPDATE_LINE"; id: string; patch: Partial<CartLine> }
  | { type: "SET_QUANTITY"; id: string; quantity: number }
  | { type: "REMOVE_LINE"; id: string }
  | { type: "CLEAR" }
  | { type: "SET_CART"; payload: CartLine[] };

const STORAGE_KEY = "pos_cart_v2";

function cartReducer(state: CartState, action: CartAction): CartState {
  switch (action.type) {
    case "ADD_LINE": {
      const line = action.payload;

      // merge if product + batch + prescription match
      const existing = state.cart.find(
        (l) =>
          l.product_id === line.product_id &&
          (l.batch_id ?? null) === (line.batch_id ?? null) &&
          (l.prescription_line_id ?? null) ===
            (line.prescription_line_id ?? null)
      );

      if (existing) {
        return {
          cart: state.cart.map((l) =>
            l.id === existing.id
              ? { ...l, quantity: l.quantity + line.quantity }
              : l
          ),
        };
      }

      return { cart: [...state.cart, line] };
    }

    case "UPDATE_LINE":
      return {
        cart: state.cart.map((l) =>
          l.id === action.id ? { ...l, ...action.patch } : l
        ),
      };

    case "SET_QUANTITY":
      return {
        cart: state.cart.map((l) =>
          l.id === action.id ? { ...l, quantity: Math.max(1, action.quantity) } : l
        ),
      };

    case "REMOVE_LINE":
      return { cart: state.cart.filter((l) => l.id !== action.id) };

    case "CLEAR":
      return { cart: [] };

    case "SET_CART":
      return { cart: action.payload };

    default:
      return state;
  }
}

export interface UsePOSCartResult {
  cart: CartLine[];
  addLine: (line: CartLine) => void;
  updateLine: (id: string, patch: Partial<CartLine>) => void;
  setQuantity: (id: string, qty: number) => void;
  removeLine: (id: string) => void;
  clear: () => void;

  subtotal: number;
  tax: number;
  total: number;

  loadFromStorage: () => void;
}

function isPlainObject(v: any) {
  return v && typeof v === "object" && !Array.isArray(v);
}

function normalizeLoadedLine(raw: any): CartLine | null {
  if (!isPlainObject(raw)) return null;
  const required = ["id", "product_id", "unit_price", "quantity"];
  for (const k of required) {
    if (!(k in raw)) return null;
  }

  return {
    id: String(raw.id),
    product_id: String(raw.product_id),
    batch_id: raw.batch_id ?? null,
    name: String(raw.name ?? raw.product_name ?? "Unknown"),
    sku: raw.sku ?? undefined,
    unit_price: Number(raw.unit_price) || 0,
    quantity: Math.max(1, Math.floor(Number(raw.quantity) || 0)),
    discount_amount: Number(raw.discount_amount ?? 0) || 0,
    tax_rate: Number(raw.tax_rate ?? 0) || 0,
    reservation_id: raw.reservation_id ?? null,
    reservation_expires_at: raw.reservation_expires_at ?? null,
    prescription_line_id: raw.prescription_line_id ?? null,
  };
}

export function usePOSCart(): UsePOSCartResult {
  const [state, dispatch] = useReducer(cartReducer, { cart: [] });

  const saveToStorage = useCallback((cart: CartLine[]) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(cart));
    } catch (e) {
      // localStorage failures are noisy but should not break UX
      // log and continue
      // eslint-disable-next-line no-console
      console.warn("usePOSCart.saveToStorage failed", e);
    }
  }, []);

  const loadFromStorage = useCallback(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return;

      const sanitized: CartLine[] = [];
      for (const item of parsed) {
        const line = normalizeLoadedLine(item);
        if (line) sanitized.push(line);
      }
      if (sanitized.length) {
        dispatch({ type: "SET_CART", payload: sanitized });
      }
    } catch (e) {
      // ignore — corrupted storage should not crash app
      // eslint-disable-next-line no-console
      console.warn("usePOSCart.loadFromStorage failed", e);
    }
  }, []);

  useEffect(() => {
    loadFromStorage();
    // intentionally run only once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    saveToStorage(state.cart);
  }, [state.cart, saveToStorage]);

  const addLine = useCallback((line: CartLine) => {
    // defensive normalization: ensure numbers and qty >=1
    const safe: CartLine = {
      ...line,
      unit_price: Number(line.unit_price) || 0,
      quantity: Math.max(1, Math.floor(Number(line.quantity) || 0)),
      discount_amount: Number(line.discount_amount || 0) || 0,
      tax_rate: Number(line.tax_rate || 0) || 0,
    };
    dispatch({ type: "ADD_LINE", payload: safe });
  }, []);

  const updateLine = useCallback((id: string, patch: Partial<CartLine>) => {
    dispatch({ type: "UPDATE_LINE", id, patch });
  }, []);

  const setQuantity = useCallback((id: string, qty: number) => {
    dispatch({ type: "SET_QUANTITY", id, quantity: Math.max(1, Math.floor(qty)) });
  }, []);

  const removeLine = useCallback((id: string) => {
    dispatch({ type: "REMOVE_LINE", id });
  }, []);

  const clear = useCallback(() => {
    dispatch({ type: "CLEAR" });
  }, []);

  // memoize calculations
  const subtotal = useMemo(
    () =>
      state.cart.reduce(
        (sum, l) => sum + l.unit_price * l.quantity - (l.discount_amount || 0),
        0
      ),
    [state.cart]
  );

  const tax = useMemo(
    () =>
      state.cart.reduce(
        (sum, l) =>
          sum +
          ((l.tax_rate || 0) / 100) *
            (l.unit_price * l.quantity - (l.discount_amount || 0)),
        0
      ),
    [state.cart]
  );

  const total = useMemo(() => subtotal + tax, [subtotal, tax]);

  return {
    cart: state.cart,
    addLine,
    updateLine,
    setQuantity,
    removeLine,
    clear,

    subtotal,
    tax,
    total,

    loadFromStorage,
  };
}
