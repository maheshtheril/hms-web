// useCart.ts
// Cart management with localStorage persistence + reducer + safe public API

import { useEffect, useReducer, useCallback } from "react";
import { v4 as uuidv4 } from "uuid";
import type { CartLine } from "../types";

type State = { cart: CartLine[] };
type Action =
  | { type: "ADD_LINE"; line: CartLine }
  | { type: "UPDATE_LINE"; lineId: string; patch: Partial<CartLine> }
  | { type: "SET_QUANTITY"; lineId: string; quantity: number }
  | { type: "REMOVE_LINE"; lineId: string }
  | { type: "CLEAR" }
  | { type: "SET_CART"; cart: CartLine[] };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "ADD_LINE": {
      const ex = state.cart.find(
        (l) =>
          l.product_id === action.line.product_id &&
          (l.batch_id ?? null) === (action.line.batch_id ?? null) &&
          l.reservation_id === action.line.reservation_id
      );
      if (ex) {
        return {
          cart: state.cart.map((l) =>
            l.id === ex.id ? { ...l, quantity: l.quantity + action.line.quantity } : l
          ),
        };
      }
      return { cart: [...state.cart, action.line] };
    }
    case "UPDATE_LINE":
      return { cart: state.cart.map((l) => (l.id === action.lineId ? { ...l, ...action.patch } : l)) };
    case "SET_QUANTITY":
      return { cart: state.cart.map((l) => (l.id === action.lineId ? { ...l, quantity: action.quantity } : l)) };
    case "REMOVE_LINE":
      return { cart: state.cart.filter((l) => l.id !== action.lineId) };
    case "CLEAR":
      return { cart: [] };
    case "SET_CART":
      return { cart: action.cart };
    default:
      return state;
  }
}

const STORAGE_KEY = "pos_v2_cart_v1";

export function useCart(initial?: CartLine[]) {
  const [state, dispatch] = useReducer(reducer, { cart: initial ?? [] });

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) dispatch({ type: "SET_CART", cart: parsed });
      }
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state.cart));
    } catch {}
  }, [state.cart]);

  const addLine = useCallback((line: Omit<CartLine, "id">) => {
    const withId = { ...line, id: uuidv4() } as CartLine;
    dispatch({ type: "ADD_LINE", line: withId });
    return withId.id;
  }, []);

  const updateLine = useCallback((lineId: string, patch: Partial<CartLine>) => {
    dispatch({ type: "UPDATE_LINE", lineId, patch });
  }, []);

  const setQuantity = useCallback((lineId: string, qty: number) => {
    const q = Math.max(1, Math.floor(qty));
    dispatch({ type: "SET_QUANTITY", lineId, quantity: q });
  }, []);

  const removeLine = useCallback((lineId: string) => dispatch({ type: "REMOVE_LINE", lineId }), []);

  const clear = useCallback(() => dispatch({ type: "CLEAR" }), []);

  const subtotal = state.cart.reduce((s, l) => s + l.unit_price * l.quantity - (l.discount_amount || 0), 0);
  const tax = state.cart.reduce((s, l) => s + ((l.tax_rate || 0) / 100) * (l.unit_price * l.quantity - (l.discount_amount || 0)), 0);
  const total = subtotal + tax;

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
  };
}
