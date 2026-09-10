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
  "c39655d2-3dfd-4268-a3ec-ff59bec6699d": { compareAtUsd: 140, label: "Limited Time Offer" }
};

export function getPromo(id: string | undefined): Promo | null {
  return (id && PROMOS[id]) || null;
}
