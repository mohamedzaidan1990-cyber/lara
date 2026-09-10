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
  // Optional line shown under the title (explains the offer).
  note?: string;
}

export const HOME_PROMOS: HomePromo[] = [
  {
    title: "Kiehl's Limited Time Offer",
    productIds: ["c39655d2-3dfd-4268-a3ec-ff59bec6699d"]
  },
  {
    title: "Mix & Match — Any 4",
    note:
      "Buy any 4 from this edit — mix & match across brands — and pay these prices. With fewer than 4, each is charged at its regular price.",
    productIds: [
      "8bd9871e-a3bf-405e-b168-704ffd197698",
      "4e3afa47-bd5f-40eb-9ee1-e2844241d337",
      "6bfe5abb-43d7-4693-bfe7-3c8ff692b741",
      "77d5e642-ca1a-48ab-ada4-f00d73af58fe",
      "a08f1d2e-95e9-43fa-ae8c-d6ae0051e6e4",
      "dce6744e-53f8-4baa-98bf-275f2d623b36",
      "3fcf4a82-d12c-47af-922d-1072a455d87b",
      "2deb4629-4155-4f59-9dd6-c4fe032a3277",
      "9341a859-26f7-4bd1-8a68-18859ef56e41",
      "a169ca6b-5e9c-4272-bae4-8af38c361a81",
      "df4c9110-3baf-48e1-b527-09e4b1c682d7",
      "6bd05d04-0d90-4b51-8e06-8a90317c6998",
      "7273f117-dfcc-49a8-97f3-85f7fa420012",
      "61b3408f-5d07-43f3-80b4-1c9a04b12d97",
      "ee7b9949-30fb-4e53-b5de-7537ec062def"
    ]
  }
];
