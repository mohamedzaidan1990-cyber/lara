// "Mix & Match — Any 4" promotion.
//
// products.price_usd for these rows holds the PROMO price (headline price
// everywhere). Each entry here also carries the RETAIL price (2x promo,
// "value is double" — except the six Gisou minis, flat $40 per user
// instruction) and both GBP figures. The cart charges retail until 4+ Mix &
// Match units are in the basket, then drops each to its promo price —
// see computeCartPricing() in lib/cart.ts.
//
// Pair every id here with a lib/promotions.ts entry (compareAtUsd = retail,
// label "Any 4 for this price") and list it in lib/home-promos.ts.

export const MIX_AND_MATCH_GROUP = "mix-and-match-any-4";
export const MIX_AND_MATCH_MIN = 4;
export const MIX_AND_MATCH_LABEL = "Any 4 for this price";

export interface MixAndMatchEntry {
  promoUsd: number;
  promoGbp: number;
  retailUsd: number;
  retailGbp: number;
}

// Promotion ended 2026-11-18 (owner): entries removed and the 12 products put
// back to their retail price (scripts/end-mix-and-match-promo.ts). The cart
// machinery stays in place but is inert while this map is empty.
const MIX_AND_MATCH: Record<string, MixAndMatchEntry> = {};

export function getMixAndMatch(id: string | undefined | null): MixAndMatchEntry | null {
  return (id && MIX_AND_MATCH[id]) || null;
}

export function mixAndMatchIds(): string[] {
  return Object.keys(MIX_AND_MATCH);
}
