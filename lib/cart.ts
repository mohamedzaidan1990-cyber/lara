"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface CartItem {
  id: string;
  brand: string;
  name: string;
  price_usd: number;
  price_gbp: number;
  image_url: string;
  product_url: string;
  category: string;
  quantity: number;
}

interface CartState {
  items: CartItem[];
  // UI (not persisted)
  isOpen: boolean;
  openCart: () => void;
  closeCart: () => void;
  addItem: (item: Omit<CartItem, "quantity"> & { quantity?: number }) => void;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  clearCart: () => void;
}

export const useCart = create<CartState>()(
  persist(
    (set) => ({
      items: [],
      isOpen: false,
      openCart: () => set({ isOpen: true }),
      closeCart: () => set({ isOpen: false }),
      addItem: (item) =>
        set((state) => {
          const qty = item.quantity ?? 1;
          const existing = state.items.find((i) => i.id === item.id);
          if (existing) {
            return {
              items: state.items.map((i) => (i.id === item.id ? { ...i, quantity: i.quantity + qty } : i))
            };
          }
          return { items: [...state.items, { ...item, quantity: qty }] };
        }),
      removeItem: (id) => set((state) => ({ items: state.items.filter((i) => i.id !== id) })),
      updateQuantity: (id, quantity) =>
        set((state) => ({
          items: state.items.map((i) => (i.id === id ? { ...i, quantity: Math.max(1, quantity) } : i))
        })),
      clearCart: () => set({ items: [] })
    }),
    {
      name: "snb-cart",
      // Only persist the items — not the open/closed UI state.
      partialize: (state) => ({ items: state.items })
    }
  )
);

export interface CartTotals {
  totalItems: number;
  totalUSD: number;
  totalGBP: number;
}

export function computeTotals(items: CartItem[]): CartTotals {
  return items.reduce<CartTotals>(
    (acc, i) => ({
      totalItems: acc.totalItems + i.quantity,
      totalUSD: acc.totalUSD + i.price_usd * i.quantity,
      totalGBP: acc.totalGBP + i.price_gbp * i.quantity
    }),
    { totalItems: 0, totalUSD: 0, totalGBP: 0 }
  );
}
