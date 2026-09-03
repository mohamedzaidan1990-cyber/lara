export interface Promo {
  compareAtUsd: number;
  label: string;
}

// No active compare-at promotions. Add entries as
//   "<product uuid>": { compareAtUsd: <number>, label: "Special Promotion" }
// The uuid MUST exist in `products`.
const PROMOS: Record<string, Promo> = {};

export function getPromo(id: string | undefined): Promo | null {
  return (id && PROMOS[id]) || null;
}
