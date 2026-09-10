"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { MIX_AND_MATCH_GROUP, MIX_AND_MATCH_MIN } from "./mix-and-match";

export interface CartItem {
  id: string;
  brand: string;
  name: string;
  // Base price. For a Mix & Match item this is its RETAIL price (the safe
  // default charge); computeCartPricing() drops it to promo_price once 4+
  // Mix & Match units are in the basket.
  price_usd: number;
  price_gbp: number;
  image_url: string;
  product_url: string;
  category: string;
  quantity: number;
  is_promo_gift?: boolean;
  // "Mix & Match — Any 4" promo metadata (set when adding such a product).
  promo_group?: string;
  promo_price_usd?: number;
  promo_price_gbp?: number;
  retail_price_usd?: number;
  retail_price_gbp?: number;
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
      partialize: (state) => ({ items: state.items }),
      // One-time cleanup: the retired "free Huda blush" promo injected a line
      // with this id. Drop it on load so no one checks out with a phantom gift.
      onRehydrateStorage: () => (state) => {
        if (!state) return;
        state.items = state.items.filter((i) => i.id !== "promo-huda-blush-gift");
      }
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

// ----- "Mix & Match — Any 4" pricing -----
// Mix & Match items charge at their retail price until the basket holds
// MIX_AND_MATCH_MIN of them (counting quantity), then each drops to its promo
// price. Everything downstream — cart sidebar, checkout, the price sent to the
// order API — reads effective_usd/gbp from here.

export interface PricedCartItem extends CartItem {
  effective_usd: number;
  effective_gbp: number;
  promo_applied: boolean;
}

export interface BundleState {
  count: number; // Mix & Match units in the basket
  min: number; // threshold to unlock promo pricing
  active: boolean; // count >= min
  unitsToGo: number; // max(0, min - count)
  savingUsd: number; // retail − promo across all Mix & Match units
}

export interface CartPricing {
  items: PricedCartItem[];
  bundle: BundleState | null; // null when the basket has no Mix & Match items
  totalItems: number;
  totalUSD: number;
  totalGBP: number;
}

const round2 = (n: number): number => Math.round(n * 100) / 100;

export function computeCartPricing(items: CartItem[]): CartPricing {
  const mixItems = items.filter((i) => i.promo_group === MIX_AND_MATCH_GROUP);
  const count = mixItems.reduce((n, i) => n + i.quantity, 0);
  const active = count >= MIX_AND_MATCH_MIN;

  const priced: PricedCartItem[] = items.map((i) => {
    if (i.promo_group === MIX_AND_MATCH_GROUP) {
      const usd = active ? i.promo_price_usd ?? i.price_usd : i.retail_price_usd ?? i.price_usd;
      const gbp = active ? i.promo_price_gbp ?? i.price_gbp : i.retail_price_gbp ?? i.price_gbp;
      return { ...i, effective_usd: usd, effective_gbp: gbp, promo_applied: active };
    }
    return { ...i, effective_usd: i.price_usd, effective_gbp: i.price_gbp, promo_applied: false };
  });

  const totals = priced.reduce(
    (acc, i) => ({
      totalItems: acc.totalItems + i.quantity,
      totalUSD: acc.totalUSD + i.effective_usd * i.quantity,
      totalGBP: acc.totalGBP + i.effective_gbp * i.quantity
    }),
    { totalItems: 0, totalUSD: 0, totalGBP: 0 }
  );

  const savingUsd = mixItems.reduce(
    (s, i) => s + ((i.retail_price_usd ?? i.price_usd) - (i.promo_price_usd ?? i.price_usd)) * i.quantity,
    0
  );

  const bundle: BundleState | null =
    mixItems.length > 0
      ? {
          count,
          min: MIX_AND_MATCH_MIN,
          active,
          unitsToGo: Math.max(0, MIX_AND_MATCH_MIN - count),
          savingUsd: round2(savingUsd)
        }
      : null;

  return {
    items: priced,
    bundle,
    totalItems: totals.totalItems,
    totalUSD: round2(totals.totalUSD),
    totalGBP: round2(totals.totalGBP)
  };
}
