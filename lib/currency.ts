const FIXED_RATE = 1.35;

// Service markup. Fragrance carries a flat 20% margin on the base Selfridges
// price; everything else is tiered — higher margin on lower-priced items.
export function getMarkupMultiplier(priceGbp: number, gbpToUsd: number, category?: string): number {
  if (category === "Fragrance") return 1.2; // flat 20% on perfumes
  const priceUsd = priceGbp * gbpToUsd;
  if (priceUsd < 30) return 1.2; // 20% markup under $30
  if (priceUsd < 50) return 1.15; // 15% markup $30–$50
  return 1.1; // 10% markup $50+
}

export async function getGBPtoUSD(): Promise<number> {
  return FIXED_RATE;
}

export async function convertGbpToUsd(priceGbp: number, category?: string): Promise<number> {
  const rate = await getGBPtoUSD();
  const multiplier = getMarkupMultiplier(priceGbp, rate, category);
  return Math.round(priceGbp * rate * multiplier * 100) / 100;
}

// Base-tier markup (10%), used by the exchange-rate estimate endpoint. Actual
// per-product markup is tiered — see getMarkupMultiplier.
export const CURRENCY_MARKUP = 1.1;
export const CURRENCY_FALLBACK_RATE = FIXED_RATE;
