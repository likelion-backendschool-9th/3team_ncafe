"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type Temperature = "hot" | "ice";
export const MAX_CART_ITEM_QUANTITY = 20;

export type CartItem = {
  id: string;
  menuId: string;
  name: string;
  imageUrl: string;
  price: number;
  quantity: number;
  available: boolean;
  selected: boolean;
  temperature: Temperature | null;
};

type AddItemInput = Omit<CartItem, "id" | "selected">;

type CartContextValue = {
  items: CartItem[];
  addItem: (input: AddItemInput) => void;
  removeItem: (id: string) => void;
  setQuantity: (id: string, quantity: number) => void;
  toggleSelected: (id: string, selected: boolean) => void;
  toggleAll: (selected: boolean) => void;
};

const storageKey = "ncafe_mock_cart";
const CartContext = createContext<CartContextValue | null>(null);

function readStoredItems(): CartItem[] {
  try {
    const raw = window.localStorage.getItem(storageKey);
    return raw ? JSON.parse(raw) as CartItem[] : [];
  } catch {
    return [];
  }
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    // localStorage는 서버에 없어서 첫 렌더 후에만 읽을 수 있음(SSR 불일치 방지)
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setItems(readStoredItems());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(items));
    } catch {
      // 저장 공간이 없거나 접근이 막혀도 화면 동작에는 영향 없음
    }
  }, [items, hydrated]);

  function addItem(input: AddItemInput) {
    setItems((current) => {
      const existing = current.find((item) => item.menuId === input.menuId && item.temperature === input.temperature);
      if (existing) {
        return current.map((item) => (
          item === existing
            ? { ...item, quantity: Math.min(MAX_CART_ITEM_QUANTITY, item.quantity + input.quantity) }
            : item
        ));
      }
      return [...current, { ...input, quantity: Math.min(MAX_CART_ITEM_QUANTITY, input.quantity), id: crypto.randomUUID(), selected: true }];
    });
  }

  function removeItem(id: string) {
    setItems((current) => current.filter((item) => item.id !== id));
  }

  function setQuantity(id: string, quantity: number) {
    setItems((current) => current.map((item) => (
      item.id === id ? { ...item, quantity: Math.min(MAX_CART_ITEM_QUANTITY, Math.max(1, quantity)) } : item
    )));
  }

  function toggleSelected(id: string, selected: boolean) {
    setItems((current) => current.map((item) => (item.id === id ? { ...item, selected } : item)));
  }

  function toggleAll(selected: boolean) {
    setItems((current) => current.map((item) => ({ ...item, selected })));
  }

  return (
    <CartContext.Provider value={{ items, addItem, removeItem, setQuantity, toggleSelected, toggleAll }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextValue {
  const context = useContext(CartContext);
  if (!context) throw new Error("useCart는 CartProvider 안에서만 사용할 수 있습니다.");
  return context;
}
