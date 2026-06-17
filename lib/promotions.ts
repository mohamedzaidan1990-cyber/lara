export interface Promo {
  compareAtUsd: number;
  label: string;
}

const PROMOS: Record<string, Promo> = {
  "236f4952-5fc1-436e-b609-6e6f2fd53f9d": { compareAtUsd: 46.25, label: "Special Promotion" },
  "39bcccfb-6e26-45ce-97e7-f3cf2429e08a": { compareAtUsd: 73.73, label: "Special Promotion" },
};

export function getPromo(id: string | undefined): Promo | null {
  return (id && PROMOS[id]) || null;
}
