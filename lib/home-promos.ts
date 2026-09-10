// Named promotion blocks shown on the homepage, directly under the hero, in
// this order. Each block renders its own titled section with a ProductCard
// grid; blocks whose products are all missing/archived are skipped.
//
// To add a promotion: append an entry with a title and the product uuid(s).
// The uuid(s) MUST exist in `products`. Pair with a lib/promotions.ts entry
// on the same id(s) if you want the strikethrough compare-at price + badge.

export interface HomePromo {
  title: string;
  productIds: string[];
}

export const HOME_PROMOS: HomePromo[] = [
  {
    title: "Kiehl's Limited Time Offer",
    productIds: ["c39655d2-3dfd-4268-a3ec-ff59bec6699d"]
  }
];
