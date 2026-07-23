import type { CartItem } from "./cart";

// "Spend $100 on Huda Beauty, get a Blush Filter Liquid Blush free."
// Single source of truth — used by the cart auto-gift watcher, the cart
// sidebar progress nudge, and the homepage/brand promo banners, so the
// threshold and gift product only ever need to change in one place.
export const HUDA_BLUSH_PROMO = {
  brand: "Huda Beauty",
  thresholdUsd: 100,
  gift: {
    // Real product id — must exist in `products` so its live image/price stay
    // accurate; the cart line item itself is injected at $0.
    id: "4a7b11f1-5691-406a-abc8-fc542c65bbc9",
    brand: "Huda Beauty",
    name: "Blush Filter Liquid Blush",
    image_url:
      "https://hudabeauty.com/cdn/shop/files/BLUSH-FILTER-REFRESH_PDP_PACKSHOTS_FINAL_6-STRAWBERRY-LATTE.webp?v=1774424494",
    product_url: "https://hudabeauty.com/en-gb/products/blush-filter-liquid-blush-hb01345m",
    category: "Makeup"
  },
  // Cart item id for the injected gift line — distinguishes it from a
  // genuinely purchased unit of the same product.
  cartItemId: "promo-huda-blush-gift"
} as const;

// Sum of non-gift Huda Beauty items currently in the cart.
export function hudaSubtotal(items: CartItem[]): number {
  return items
    .filter((i) => i.brand === HUDA_BLUSH_PROMO.brand && !i.is_promo_gift)
    .reduce((sum, i) => sum + i.price_usd * i.quantity, 0);
}

export function formatUsd(value: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value);
}
