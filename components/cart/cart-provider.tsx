"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { CART_STORAGE_KEY, cartCount, emptyCart, type CartItem, type CartState } from "@/lib/cart/types";

type CartContextValue = {
  items: CartItem[];
  count: number;
  ready: boolean;
  add: (productId: number, quantity?: number, variantId?: number | null) => void;
  setQuantity: (productId: number, variantId: number | null, quantity: number) => void;
  remove: (productId: number, variantId: number | null) => void;
  clear: () => void;
};

const CartContext = createContext<CartContextValue | null>(null);

function readStorage(): CartState {
  if (typeof window === "undefined") return emptyCart();
  try {
    const raw = window.localStorage.getItem(CART_STORAGE_KEY);
    if (!raw) return emptyCart();
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") return emptyCart();
    const items = (parsed as { items?: unknown }).items;
    if (!Array.isArray(items)) return emptyCart();
    const cleaned: CartItem[] = [];
    for (const item of items) {
      if (!item || typeof item !== "object") continue;
      const rec = item as Record<string, unknown>;
      const productId = Number(rec.productId);
      const quantity = Number(rec.quantity);
      if (!Number.isInteger(productId) || productId <= 0) continue;
      if (!Number.isInteger(quantity) || quantity <= 0) continue;
      const variantId = rec.variantId == null ? null : Number(rec.variantId);
      cleaned.push({ productId, variantId, quantity: Math.min(quantity, 20) });
    }
    return { items: cleaned };
  } catch {
    return emptyCart();
  }
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<CartState>(emptyCart);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setState(readStorage());
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    try {
      window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(state));
    } catch {
      // localStorage বন্ধ থাকলে কার্ট সেশনেই থাকবে — চুপচাপ উপেক্ষা
    }
  }, [state, ready]);

  const add = useCallback((productId: number, quantity = 1, variantId: number | null = null) => {
    setState((prev) => {
      const existing = prev.items.find(
        (i) => i.productId === productId && (i.variantId ?? null) === (variantId ?? null),
      );
      if (existing) {
        return {
          items: prev.items.map((i) =>
            i === existing ? { ...i, quantity: Math.min(i.quantity + quantity, 20) } : i,
          ),
        };
      }
      return {
        items: [...prev.items, { productId, variantId, quantity: Math.min(quantity, 20) }],
      };
    });
  }, []);

  const setQuantity = useCallback(
    (productId: number, variantId: number | null, quantity: number) => {
      setState((prev) => ({
        items: prev.items
          .map((i) =>
            i.productId === productId && (i.variantId ?? null) === (variantId ?? null)
              ? { ...i, quantity: Math.max(0, Math.min(quantity, 20)) }
              : i,
          )
          .filter((i) => i.quantity > 0),
      }));
    },
    [],
  );

  const remove = useCallback((productId: number, variantId: number | null) => {
    setState((prev) => ({
      items: prev.items.filter(
        (i) => !(i.productId === productId && (i.variantId ?? null) === (variantId ?? null)),
      ),
    }));
  }, []);

  const clear = useCallback(() => setState(emptyCart()), []);

  const value = useMemo<CartContextValue>(
    () => ({
      items: state.items,
      count: cartCount(state),
      ready,
      add,
      setQuantity,
      remove,
      clear,
    }),
    [state, ready, add, setQuantity, remove, clear],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const context = useContext(CartContext);
  if (!context) throw new Error("useCart অবশ্যই CartProvider-এর ভেতরে ব্যবহার করতে হবে");
  return context;
}
