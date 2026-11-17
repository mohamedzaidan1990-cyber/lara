// Named promotion blocks. A block with exactly one product renders as a
// normal product card on the homepage. A block with more than one product
// renders as a single "folder" tile (image collage + price range) that links
// to /promo/<slug>, which lists every item in the edit — instead of dumping
// every product card onto the homepage.
//
// To add a promotion: append an entry with a slug, title and product uuid(s).
// The uuid(s) MUST exist in `products`. Pair with a lib/promotions.ts entry
// on the same id(s) if you want the strikethrough compare-at price + badge.

export interface HomePromo {
  slug: string;
  title: string;
  productIds: string[];
  // Optional line shown under the title (explains the offer).
  note?: string;
}

export const HOME_PROMOS: HomePromo[] = [
  {
    slug: "kiehls-limited-time-offer",
    title: "Kiehl's Limited Time Offer",
    productIds: ["c39655d2-3dfd-4268-a3ec-ff59bec6699d"]
  }
];

export function getHomePromoBySlug(slug: string): HomePromo | null {
  return HOME_PROMOS.find((p) => p.slug === slug) ?? null;
}
