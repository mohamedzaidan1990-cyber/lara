const FRANKFURTER_URL = "https://api.frankfurter.app/latest?from=GBP&to=USD";
const CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours
const FALLBACK_RATE = 1.33;

// Tiered service markup — higher margin on lower-priced items.
export function getMarkupMultiplier(priceGbp: number, gbpToUsd: number): number {
  const priceUsd = priceGbp * gbpToUsd;
  if (priceUsd < 30) return 1.2; // 20% markup under $30
  if (priceUsd < 50) return 1.15; // 15% markup $30–$50
  return 1.1; // 10% markup $50+
}

interface RateCache {
  rate: number;
  fetchedAt: number;
}

interface FrankfurterResponse {
  rates?: { USD?: number };
}

let cached: RateCache | null = null;
let inflight: Promise<number> | null = null;

async function fetchRate(): Promise<number> {
  try {
    const res = await fetch(FRANKFURTER_URL, {
      headers: { accept: "application/json" }
    });
    if (!res.ok) {
      throw new Error(`Frankfurter responded ${res.status}`);
    }
    const data = (await res.json()) as FrankfurterResponse;
    const usd = data.rates?.USD;
    if (typeof usd !== "number" || !Number.isFinite(usd) || usd <= 0) {
      throw new Error("Frankfurter returned no USD rate");
    }
    return usd;
  } catch (err) {
    console.warn("[currency] Frankfurter fetch failed, falling back to", FALLBACK_RATE, err);
    return FALLBACK_RATE;
  }
}

export async function getGBPtoUSD(): Promise<number> {
  const now = Date.now();
  if (cached && now - cached.fetchedAt < CACHE_TTL_MS) {
    return cached.rate;
  }
  if (inflight) return inflight;
  inflight = (async () => {
    try {
      const rate = await fetchRate();
      cached = { rate, fetchedAt: Date.now() };
      return rate;
    } finally {
      inflight = null;
    }
  })();
  return inflight;
}

export async function convertGbpToUsd(priceGbp: number): Promise<number> {
  const rate = await getGBPtoUSD();
  const multiplier = getMarkupMultiplier(priceGbp, rate);
  return Math.round(priceGbp * rate * multiplier * 100) / 100;
}
