// "Mix & Match — Any 4" promotion.
//
// products.price_usd for these rows holds the PROMO price (headline price
// everywhere). Each entry here also carries the RETAIL price (2x promo,
// "value is double") and both GBP figures. The cart charges retail until 4+
// Mix & Match units are in the basket, then drops each to its promo price —
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

const MIX_AND_MATCH: Record<string, MixAndMatchEntry> = {
  "8bd9871e-a3bf-405e-b168-704ffd197698": { promoUsd: 25, promoGbp: 19.23, retailUsd: 50, retailGbp: 38.46 }, // gisou-lip-oil-raspberry-swirl
  "4e3afa47-bd5f-40eb-9ee1-e2844241d337": { promoUsd: 25, promoGbp: 19.23, retailUsd: 50, retailGbp: 38.46 }, // gisou-lip-oil-bee-llini-peach
  "6bfe5abb-43d7-4693-bfe7-3c8ff692b741": { promoUsd: 25, promoGbp: 19.23, retailUsd: 50, retailGbp: 38.46 }, // gisou-lip-oil-glazed-plum
  "77d5e642-ca1a-48ab-ada4-f00d73af58fe": { promoUsd: 30, promoGbp: 23.08, retailUsd: 60, retailGbp: 46.15 }, // gisou-hair-perfume-wildflower-honey
  "a08f1d2e-95e9-43fa-ae8c-d6ae0051e6e4": { promoUsd: 30, promoGbp: 23.08, retailUsd: 60, retailGbp: 46.15 }, // gisou-hair-perfume-wild-rose
  "dce6744e-53f8-4baa-98bf-275f2d623b36": { promoUsd: 30, promoGbp: 23.08, retailUsd: 60, retailGbp: 46.15 }, // gisou-hair-perfume-lavender-berry
  "3fcf4a82-d12c-47af-922d-1072a455d87b": { promoUsd: 30, promoGbp: 23.08, retailUsd: 60, retailGbp: 46.15 }, // milk-jelly-lip-kit
  "2deb4629-4155-4f59-9dd6-c4fe032a3277": { promoUsd: 25, promoGbp: 19.23, retailUsd: 50, retailGbp: 38.46 }, // rare-beauty-find-comfort-mist
  "9341a859-26f7-4bd1-8a68-18859ef56e41": { promoUsd: 25, promoGbp: 19.23, retailUsd: 50, retailGbp: 38.46 }, // sol-danca-mistica
  "a169ca6b-5e9c-4272-bae4-8af38c361a81": { promoUsd: 25, promoGbp: 19.23, retailUsd: 50, retailGbp: 38.46 }, // sephora-blush-trio-candy-lover
  "df4c9110-3baf-48e1-b527-09e4b1c682d7": { promoUsd: 30, promoGbp: 23.08, retailUsd: 60, retailGbp: 46.15 }, // sephora-x-waad-shaat
  "7002c330-0bca-40b1-899f-01f44ef9ef2e": { promoUsd: 30, promoGbp: 23.08, retailUsd: 60, retailGbp: 46.15 }, // sephora-x-talia-fawaz
  "6bd05d04-0d90-4b51-8e06-8a90317c6998": { promoUsd: 25, promoGbp: 19.23, retailUsd: 50, retailGbp: 38.46 }, // fenty-mini-killawatt-wattabrat
  "7273f117-dfcc-49a8-97f3-85f7fa420012": { promoUsd: 25, promoGbp: 19.23, retailUsd: 50, retailGbp: 38.46 }, // tarte-maracuja-juicy-lip-plump-pink
  "61b3408f-5d07-43f3-80b4-1c9a04b12d97": { promoUsd: 40, promoGbp: 30.77, retailUsd: 80, retailGbp: 61.54 }, // fenty-match-stix-duo-mocha-i-scream
  "ee7b9949-30fb-4e53-b5de-7537ec062def": { promoUsd: 25, promoGbp: 19.23, retailUsd: 50, retailGbp: 38.46 }  // huda-faux-filler-extra-shine-she-fire
};

export function getMixAndMatch(id: string | undefined | null): MixAndMatchEntry | null {
  return (id && MIX_AND_MATCH[id]) || null;
}

export function mixAndMatchIds(): string[] {
  return Object.keys(MIX_AND_MATCH);
}
