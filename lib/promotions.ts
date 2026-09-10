export interface Promo {
  compareAtUsd: number;
  label: string;
}

// Add entries as
//   "<product uuid>": { compareAtUsd: <number>, label: "Special Promotion" }
// The uuid MUST exist in `products`. The compare-at price + label render
// as a strikethrough and badge on both the product card and the PDP.
const PROMOS: Record<string, Promo> = {
  // Kiehl's Best Sellers Hydrate & Help Protect Skincare Set — $100 (was $140).
  "c39655d2-3dfd-4268-a3ec-ff59bec6699d": { compareAtUsd: 140, label: "Limited Time Offer" },

  // "Mix & Match — Any 4" edit — compare-at is 2x the promo price; the cart
  // charges retail until 4+ of these are in the basket. See lib/mix-and-match.ts.
  "8bd9871e-a3bf-405e-b168-704ffd197698": { compareAtUsd: 40, label: "Any 4 for this price" }, // gisou-lip-oil-raspberry-swirl
  "4e3afa47-bd5f-40eb-9ee1-e2844241d337": { compareAtUsd: 40, label: "Any 4 for this price" }, // gisou-lip-oil-bee-llini-peach
  "6bfe5abb-43d7-4693-bfe7-3c8ff692b741": { compareAtUsd: 40, label: "Any 4 for this price" }, // gisou-lip-oil-glazed-plum
  "77d5e642-ca1a-48ab-ada4-f00d73af58fe": { compareAtUsd: 40, label: "Any 4 for this price" }, // gisou-hair-perfume-wildflower-honey
  "a08f1d2e-95e9-43fa-ae8c-d6ae0051e6e4": { compareAtUsd: 40, label: "Any 4 for this price" }, // gisou-hair-perfume-wild-rose
  "dce6744e-53f8-4baa-98bf-275f2d623b36": { compareAtUsd: 40, label: "Any 4 for this price" }, // gisou-hair-perfume-lavender-berry
  "3fcf4a82-d12c-47af-922d-1072a455d87b": { compareAtUsd: 60, label: "Any 4 for this price" }, // milk-jelly-lip-kit
  "2deb4629-4155-4f59-9dd6-c4fe032a3277": { compareAtUsd: 50, label: "Any 4 for this price" }, // rare-beauty-find-comfort-mist
  "9341a859-26f7-4bd1-8a68-18859ef56e41": { compareAtUsd: 50, label: "Any 4 for this price" }, // sol-danca-mistica
  "a169ca6b-5e9c-4272-bae4-8af38c361a81": { compareAtUsd: 50, label: "Any 4 for this price" }, // sephora-blush-trio-candy-lover
  "df4c9110-3baf-48e1-b527-09e4b1c682d7": { compareAtUsd: 60, label: "Any 4 for this price" }, // sephora-x-waad-shaat
  "7002c330-0bca-40b1-899f-01f44ef9ef2e": { compareAtUsd: 60, label: "Any 4 for this price" }, // sephora-x-talia-fawaz
  "6bd05d04-0d90-4b51-8e06-8a90317c6998": { compareAtUsd: 50, label: "Any 4 for this price" }, // fenty-mini-killawatt-wattabrat
  "7273f117-dfcc-49a8-97f3-85f7fa420012": { compareAtUsd: 50, label: "Any 4 for this price" }, // tarte-maracuja-juicy-lip-plump-pink
  "61b3408f-5d07-43f3-80b4-1c9a04b12d97": { compareAtUsd: 80, label: "Any 4 for this price" }, // fenty-match-stix-duo-mocha-i-scream
  "ee7b9949-30fb-4e53-b5de-7537ec062def": { compareAtUsd: 50, label: "Any 4 for this price" }  // huda-faux-filler-extra-shine-she-fire
};

export function getPromo(id: string | undefined): Promo | null {
  return (id && PROMOS[id]) || null;
}
