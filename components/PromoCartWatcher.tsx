"use client";

import { useEffect } from "react";
import { useCart } from "@/lib/cart";
import { HUDA_BLUSH_PROMO, hudaSubtotal } from "@/lib/huda-blush-promo";

// Keeps the free Huda Beauty blush in sync with cart contents: adds it the
// moment Huda Beauty spend reaches the threshold, removes it the moment spend
// drops back below (e.g. the customer deletes the item that qualified them).
// Runs as a side effect on the persisted cart store rather than inside
// addItem/removeItem so it reacts correctly to every path that changes the
// cart (quantity steppers, remove buttons, checkout clearing it, etc.).
export default function PromoCartWatcher() {
  const items = useCart((s) => s.items);
  const addItem = useCart((s) => s.addItem);
  const removeItem = useCart((s) => s.removeItem);

  useEffect(() => {
    const hasGift = items.some((i) => i.id === HUDA_BLUSH_PROMO.cartItemId);
    const qualifies = hudaSubtotal(items) >= HUDA_BLUSH_PROMO.thresholdUsd;

    if (qualifies && !hasGift) {
      addItem({
        id: HUDA_BLUSH_PROMO.cartItemId,
        brand: HUDA_BLUSH_PROMO.gift.brand,
        name: `${HUDA_BLUSH_PROMO.gift.name} — Free Gift`,
        price_usd: 0,
        price_gbp: 0,
        image_url: HUDA_BLUSH_PROMO.gift.image_url,
        product_url: HUDA_BLUSH_PROMO.gift.product_url,
        category: HUDA_BLUSH_PROMO.gift.category,
        is_promo_gift: true,
        quantity: 1
      });
    } else if (!qualifies && hasGift) {
      removeItem(HUDA_BLUSH_PROMO.cartItemId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items]);

  return null;
}
