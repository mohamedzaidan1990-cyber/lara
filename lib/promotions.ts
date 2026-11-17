export interface Promo {
  compareAtUsd: number;
  label: string;
  /** Optional extra perk shown as a banner on the PDP (e.g. a golden ticket). */
  perk?: { title: string; text: string };
}

// Add entries as
//   "<product uuid>": { compareAtUsd: <number>, label: "Special Promotion" }
// The uuid MUST exist in `products`. The compare-at price + label render
// as a strikethrough and badge on both the product card and the PDP.
const PROMOS: Record<string, Promo> = {
  // Kiehl's Best Sellers Hydrate & Help Protect Skincare Set — $80 (was $140) + golden ticket.
  "c39655d2-3dfd-4268-a3ec-ff59bec6699d": {
    compareAtUsd: 140,
    label: "Limited Time Offer",
    perk: {
      title: "Golden Ticket Inside",
      text: "Every set comes with a golden ticket. Prizes range from a discount on your next order to mini-size items, and one lucky buyer wins a full-size item."
    }
  }
};

export function getPromo(id: string | undefined): Promo | null {
  return (id && PROMOS[id]) || null;
}
