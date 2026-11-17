// Brand-wide percentage sales, applied at display + add-to-cart time.
//
// products.price_usd stays the REGULAR price (the scraper keeps refreshing
// it). Wherever a product's price is shown or added to the cart, run it
// through getBrandSale()/salePrice(): the sale price is the headline, the
// regular price is shown struck through, and the cart line is created at the
// sale price (orders are priced from the cart line).
//
// Products that already carry their own deal (lib/promotions.ts, Mix & Match)
// are skipped so discounts don't stack. To end a sale, delete its entry.

import { getPromo } from "./promotions";
import { getMixAndMatch } from "./mix-and-match";

interface BrandSaleRule {
  brand: string; // compared case-insensitively against products.brand
  pct: number;
  label: string;
  /** Product names matching this are NOT discounted. */
  exclude?: RegExp;
  /** Product ids NOT discounted. */
  excludeIds?: string[];
}

// Huda Beauty minis: anything named mini / travel, names starting "Baby"
// (Baby Bake, Baby Blush Duo — a "Baby Pink" shade is NOT a mini), plus the
// minis whose names only give a size: 2ml concealers & correctors, 7ml
// mascara, 30ml setting spray, 10ml EDP. (?<![\d.]) stops "4.2ml" matching.
const HUDA_MINIS = /\bmini\b|^baby\b|\btravel\b|(?<![\d.])2\s?ml\b|(?<![\d.])7\s?ml\b|setting spray 30\s?ml|eau de parfum 10\s?ml/i;

const RULES: BrandSaleRule[] = [
  // Huda Beauty — 15% off every full-size product (started 2026-11-18).
  {
    brand: "huda beauty",
    pct: 15,
    label: "15% Off",
    exclude: HUDA_MINIS,
    excludeIds: []
  }
];

export interface BrandSale {
  pct: number;
  label: string;
}

export function getBrandSale(p: { id?: string | null; brand?: string | null; name?: string | null }): BrandSale | null {
  const brand = (p.brand ?? "").trim().toLowerCase();
  if (!brand) return null;
  if (p.id && (getPromo(p.id) || getMixAndMatch(p.id))) return null;
  for (const r of RULES) {
    if (r.brand !== brand) continue;
    if (r.exclude && r.exclude.test(p.name ?? "")) return null;
    if (p.id && r.excludeIds?.includes(p.id)) return null;
    return { pct: r.pct, label: r.label };
  }
  return null;
}

/** Sale USD rounded to whole dollars (the storefront shows whole dollars). */
export function saleUsd(usd: number, sale: BrandSale | null): number {
  return sale ? Math.round(usd * (1 - sale.pct / 100)) : usd;
}

export function saleGbp(gbp: number, sale: BrandSale | null): number {
  return sale ? Math.round(gbp * (1 - sale.pct / 100) * 100) / 100 : gbp;
}
