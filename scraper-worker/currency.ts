// Fixed exchange rate. The live-rate approach was replaced with a fixed 1.35
// because the actual cost to source and deliver to Lebanon is consistently
// priceGbp × 1.45 (GBP→USD at 1.35 plus ~7% for shipping/import fees).
const FIXED_GBP_TO_USD = 1.35;

// Selling-price markup on top of the Lebanon-landed cost (priceGbp × 1.45).
// Applied in order — first match wins.
export function getMarkupMultiplier(priceGbp: number, category?: string, brand?: string): number {
  if (brand && /^the ordinary$/i.test(brand.trim())) return 1.5; // 50% on The Ordinary
  if (brand && /^huda beauty$/i.test(brand.trim())) return 1.1; // flat 10% on all Huda Beauty (incl. fragrance)
  if (category === "Health & Nutrition") return 1.1; // flat 10% (base × 1.45 already applied → ×1.595 total)
  if (priceGbp <= 20) return 1.35; // 35% on anything £20 or under
  if (category === "Fragrance") return 1.2; // flat 20% on perfumes
  const priceUsd = priceGbp * FIXED_GBP_TO_USD;
  if (priceUsd < 30) return 1.25; // 25% on £20–~£22 range (< $30 at fixed rate)
  if (priceUsd < 50) return 1.15; // 15% on $30–$49
  return 1.1;  // 10% on $50+
}

// Returns the fixed GBP→USD rate. Kept as an async function so call-sites that
// use it for back-conversion (e.g. Space NK USD→GBP) don't need changing.
export async function getGBPtoUSD(): Promise<number> {
  return FIXED_GBP_TO_USD;
}

// Per-brand price surcharge applied on top of the standard markup.
// Add brands here (lowercase) when their pricing needs a permanent adjustment.
const BRAND_SURCHARGE: Record<string, number> = {
  "morphe": 1.10,
};

// Lebanon-landed cost: priceGbp × 1.45 (rate 1.35 + 7% delivery/import fees).
// Markup applied on top; result ceiled to the nearest whole dollar.
export async function convertGbpToUsd(priceGbp: number, category?: string, brand?: string): Promise<number> {
  const costUsd = priceGbp * 1.45;
  const multiplier = getMarkupMultiplier(priceGbp, category, brand);
  const surcharge = brand ? (BRAND_SURCHARGE[brand.toLowerCase().trim()] ?? 1) : 1;
  return Math.ceil(costUsd * multiplier * surcharge);
}
