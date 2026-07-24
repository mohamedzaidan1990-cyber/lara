/**
 * One-off import: 129 Dior products sourced from Sephora Qatar screenshots
 * (74 screenshots, scrolled catalogue capture on 2026-07-21). 17 additional
 * candidates were extracted but are held back pending a real product photo
 * (see scripts/dior-import/skipped_no_image.json) — not imported here.
 *
 * Pricing rule (per user instruction):
 *   price_usd = round(qar_price / 3.645 * 1.15, 2)  if base <= $60
 *   price_usd = round(qar_price / 3.645 * 1.10, 2)  if base > $60
 * price_gbp is a derived reference value (price_usd * 0.79) since the
 * source listing was in QAR, not GBP.
 *
 * During extraction, two pairs of cards turned out to be the same product
 * captured twice (once with the "Dior" brand prefix folded into the name,
 * once without) at an identical QAR price — merged before import:
 *   "Dior Prestige Le Baume Démaquillant" / "Prestige Le Baume Démaquillant"
 *   "Dior Prestige Le Sucre de Gommage Face Scrub" / "Prestige Le Sucre de Gommage"
 * Several other same-price, similarly-named pairs (e.g. "Dior Addict Lip
 * Glow" vs "...Lip Glow Oil"/"...Lip Glow Butter", "Rouge Dior" vs "Rouge
 * Dior Balm", "Diorshow Iconic Overcurl" vs "...Waterproof") were checked
 * against their review counts and kept as distinct — Dior genuinely sells
 * multiple SKUs in the same line at the same price point.
 *
 * Images were not cropped from the screenshots. Each was sourced from the
 * matching product's real listing on Selfridges.com (preferred — reliable
 * scene7 CDN), falling back to Sephora.com, Nordstrom.com, or Boots.com,
 * verified by title match against the screenshot before download.
 *
 * Run:  npx ts-node scripts/add-dior-products.ts
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

function loadDotenv(file: string): void {
  let text: string;
  try {
    text = readFileSync(resolve(process.cwd(), file), "utf8");
  } catch {
    return;
  }
  for (const raw of text.split("\n")) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    const value = line.slice(eq + 1).trim().replace(/^['"]|['"]$/g, "");
    if (!process.env[key]) process.env[key] = value;
  }
}
loadDotenv(".env.local");
loadDotenv(".env");

import { ensureSchema, getSql } from "../lib/db";

interface ProductSeed {
  brand: string;
  name: string;
  category: string;
  price_gbp: number;
  price_usd: number;
  product_url: string;
  image_url: string;
  deliverable_lebanon: boolean;
}

const PRODUCTS: ProductSeed[] = [
  { brand: "DIOR", name: "Dior Addict Lip Glow Oil 24h Hydrating Lip Oil", category: "Makeup", price_gbp: 47.36, price_usd: 59.95, product_url: "https://www.sephora.qa/brand/dior/#dior-addict-lip-glow-oil-24h-hydrating-lip-oil", image_url: "/dior-addict-lip-glow-oil-24h-hydrating-lip-oil.jpg", deliverable_lebanon: true },
  { brand: "DIOR", name: "Dior Addict Lip Glow Butter High-Shine Lip Treatment", category: "Makeup", price_gbp: 47.36, price_usd: 59.95, product_url: "https://www.sephora.qa/brand/dior/#dior-addict-lip-glow-butter-high-shine-lip-treatment", image_url: "/dior-addict-lip-glow-butter-high-shine-lip-treatment.jpg", deliverable_lebanon: true },
  { brand: "DIOR", name: "Miss Dior Melt-In Hand Cream", category: "Skincare", price_gbp: 67.95, price_usd: 86.01, product_url: "https://www.sephora.qa/brand/dior/#miss-dior-melt-in-hand-cream", image_url: "/miss-dior-melt-in-hand-cream.jpg", deliverable_lebanon: true },
  { brand: "DIOR", name: "Dior Addict Glass Lipstick Ultra-Shine and Hydrating Lipstick", category: "Makeup", price_gbp: 53.59, price_usd: 67.83, product_url: "https://www.sephora.qa/brand/dior/#dior-addict-glass-lipstick-ultra-shine-and-hydrating-lipstick", image_url: "/dior-addict-glass-lipstick-ultra-shine-and-hydrating-lipstick.jpg", deliverable_lebanon: true },
  { brand: "DIOR", name: "Le Baume - Limited Edition Multi-Use Repairing Balm", category: "Skincare", price_gbp: 65.56, price_usd: 82.99, product_url: "https://www.sephora.qa/brand/dior/#le-baume-limited-edition-multi-use-repairing-balm", image_url: "/le-baume-limited-edition-multi-use-repairing-balm.jpg", deliverable_lebanon: true },
  { brand: "DIOR", name: "Forever Skin Glow Foundation - 24h Wear and Radiant Glow", category: "Makeup", price_gbp: 66.76, price_usd: 84.5, product_url: "https://www.sephora.qa/brand/dior/#forever-skin-glow-foundation-24h-wear-and-radiant-glow", image_url: "/forever-skin-glow-foundation-24h-wear-and-radiant-glow.jpg", deliverable_lebanon: true },
  { brand: "DIOR", name: "Dior Forever Glow Maximizer", category: "Makeup", price_gbp: 48.6, price_usd: 61.52, product_url: "https://www.sephora.qa/brand/dior/#dior-forever-glow-maximizer", image_url: "/dior-forever-glow-maximizer.jpg", deliverable_lebanon: true },
  { brand: "DIOR", name: "Forever Blush Soft Filter", category: "Makeup", price_gbp: 48.6, price_usd: 61.52, product_url: "https://www.sephora.qa/brand/dior/#forever-blush-soft-filter", image_url: "/forever-blush-soft-filter.jpg", deliverable_lebanon: true },
  { brand: "DIOR", name: "Diorshow Flash Stick Ultra-Gliding Eyeshadow Stick", category: "Makeup", price_gbp: 43.62, price_usd: 55.21, product_url: "https://www.sephora.qa/brand/dior/#diorshow-flash-stick-ultra-gliding-eyeshadow-stick", image_url: "/diorshow-flash-stick-ultra-gliding-eyeshadow-stick.jpg", deliverable_lebanon: true },
  { brand: "DIOR", name: "Dior Addict Lip Glow", category: "Makeup", price_gbp: 47.36, price_usd: 59.95, product_url: "https://www.sephora.qa/brand/dior/#dior-addict-lip-glow", image_url: "/dior-addict-lip-glow.jpg", deliverable_lebanon: true },
  { brand: "DIOR", name: "Forever Skin Wear Blurring Natural Matte Foundation", category: "Makeup", price_gbp: 66.76, price_usd: 84.5, product_url: "https://www.sephora.qa/brand/dior/#forever-skin-wear-blurring-natural-matte-foundation", image_url: "/forever-skin-wear-blurring-natural-matte-foundation.jpg", deliverable_lebanon: true },
  { brand: "DIOR", name: "Dior Addict Lip Maximizer", category: "Makeup", price_gbp: 47.36, price_usd: 59.95, product_url: "https://www.sephora.qa/brand/dior/#dior-addict-lip-maximizer", image_url: "/dior-addict-lip-maximizer.jpg", deliverable_lebanon: true },
  { brand: "DIOR", name: "Forever Skin Bronze Ultra-Melting Bronzing Balm Stick", category: "Makeup", price_gbp: 64.37, price_usd: 81.48, product_url: "https://www.sephora.qa/brand/dior/#forever-skin-bronze-ultra-melting-bronzing-balm-stick", image_url: "/forever-skin-bronze-ultra-melting-bronzing-balm-stick.jpg", deliverable_lebanon: true },
  { brand: "DIOR", name: "Miss Dior Blooming Bouquet Mini Miss Solid Perfume", category: "Fragrance", price_gbp: 70.33, price_usd: 89.03, product_url: "https://www.sephora.qa/brand/dior/#miss-dior-blooming-bouquet-mini-miss-solid-perfume", image_url: "/miss-dior-blooming-bouquet-mini-miss-solid-perfume.jpg", deliverable_lebanon: false },
  { brand: "DIOR", name: "Dior Forever Skin Contour", category: "Makeup", price_gbp: 59.61, price_usd: 75.45, product_url: "https://www.sephora.qa/brand/dior/#dior-forever-skin-contour", image_url: "/dior-forever-skin-contour.jpg", deliverable_lebanon: true },
  { brand: "DIOR", name: "Dior Forever Natural Velvet Compact Foundation", category: "Makeup", price_gbp: 69.14, price_usd: 87.52, product_url: "https://www.sephora.qa/brand/dior/#dior-forever-natural-velvet-compact-foundation", image_url: "/dior-forever-natural-velvet-compact-foundation.jpg", deliverable_lebanon: true },
  { brand: "DIOR", name: "Forever Nude Radiant Filter Blurring Setting Powder", category: "Makeup", price_gbp: 64.37, price_usd: 81.48, product_url: "https://www.sephora.qa/brand/dior/#forever-nude-radiant-filter-blurring-setting-powder", image_url: "/forever-nude-radiant-filter-blurring-setting-powder.jpg", deliverable_lebanon: true },
  { brand: "DIOR", name: "Dior Addict Rosy Glow Eau de Parfum", category: "Fragrance", price_gbp: 116.82, price_usd: 147.87, product_url: "https://www.sephora.qa/brand/dior/#dior-addict-rosy-glow-eau-de-parfum", image_url: "/dior-addict-rosy-glow-eau-de-parfum.jpg", deliverable_lebanon: false },
  { brand: "DIOR", name: "Dior Addict Purple Glow Eau de Parfum", category: "Fragrance", price_gbp: 116.82, price_usd: 147.87, product_url: "https://www.sephora.qa/brand/dior/#dior-addict-purple-glow-eau-de-parfum", image_url: "/dior-addict-purple-glow-eau-de-parfum.jpg", deliverable_lebanon: false },
  { brand: "DIOR", name: "Dior Addict Peachy Glow Eau de Parfum", category: "Fragrance", price_gbp: 116.82, price_usd: 147.87, product_url: "https://www.sephora.qa/brand/dior/#dior-addict-peachy-glow-eau-de-parfum", image_url: "/dior-addict-peachy-glow-eau-de-parfum.jpg", deliverable_lebanon: false },
  { brand: "DIOR", name: "Diorshow Overvolume Extreme Volume Mascara", category: "Makeup", price_gbp: 49.85, price_usd: 63.1, product_url: "https://www.sephora.qa/brand/dior/#diorshow-overvolume-extreme-volume-mascara", image_url: "/diorshow-overvolume-extreme-volume-mascara.jpg", deliverable_lebanon: true },
  { brand: "DIOR", name: "Diorshow 24h Buildable Volume Mascara", category: "Makeup", price_gbp: 49.85, price_usd: 63.1, product_url: "https://www.sephora.qa/brand/dior/#diorshow-24h-buildable-volume-mascara", image_url: "/diorshow-24h-buildable-volume-mascara.jpg", deliverable_lebanon: true },
  { brand: "DIOR", name: "Rouge Dior Contour Universal Clear Lip Liner", category: "Makeup", price_gbp: 36.14, price_usd: 45.75, product_url: "https://www.sephora.qa/brand/dior/#rouge-dior-contour-universal-clear-lip-liner", image_url: "/rouge-dior-contour-universal-clear-lip-liner.jpg", deliverable_lebanon: true },
  { brand: "DIOR", name: "Le Baume", category: "Skincare", price_gbp: 65.56, price_usd: 82.99, product_url: "https://www.sephora.qa/brand/dior/#le-baume", image_url: "/le-baume.jpg", deliverable_lebanon: true },
  { brand: "DIOR", name: "Diorshow Iconic Overcurl Waterproof Mascara", category: "Makeup", price_gbp: 49.85, price_usd: 63.1, product_url: "https://www.sephora.qa/brand/dior/#diorshow-iconic-overcurl-waterproof-mascara", image_url: "/dior-diorshow-iconic-overcurl-waterproof-mascara.jpg", deliverable_lebanon: true },
  { brand: "DIOR", name: "Dior Homme Spray Deodorant", category: "Fragrance", price_gbp: 52.35, price_usd: 66.26, product_url: "https://www.sephora.qa/brand/dior/#dior-homme-spray-deodorant", image_url: "/dior-dior-homme-spray-deodorant.jpg", deliverable_lebanon: false },
  { brand: "DIOR", name: "Forever Glow Maximizer Longwear Liquid Highlighter", category: "Makeup", price_gbp: 47.36, price_usd: 59.95, product_url: "https://www.sephora.qa/brand/dior/#forever-glow-maximizer-longwear-liquid-highlighter", image_url: "/dior-forever-glow-maximizer-longwear-liquid-highlighter.jpg", deliverable_lebanon: true },
  { brand: "DIOR", name: "Sauvage Stick Deodorant", category: "Fragrance", price_gbp: 52.35, price_usd: 66.26, product_url: "https://www.sephora.qa/brand/dior/#sauvage-stick-deodorant", image_url: "/dior-sauvage-stick-deodorant.jpg", deliverable_lebanon: false },
  { brand: "DIOR", name: "Diorshow Maximizer 4D Lash Primer Serum", category: "Makeup", price_gbp: 49.85, price_usd: 63.1, product_url: "https://www.sephora.qa/brand/dior/#diorshow-maximizer-4d-lash-primer-serum", image_url: "/dior-diorshow-maximizer-4d-lash-primer-serum.jpg", deliverable_lebanon: true },
  { brand: "DIOR", name: "Mattifying Invisible UV Stick SPF 50 PA++++", category: "Skincare", price_gbp: 70.33, price_usd: 89.03, product_url: "https://www.sephora.qa/brand/dior/#mattifying-invisible-uv-stick-spf-50-pa", image_url: "/dior-mattifying-invisible-uv-stick-spf-50-pa.jpg", deliverable_lebanon: true },
  { brand: "DIOR", name: "Miss Dior Eau De Parfum Mini Miss Solid Perfume", category: "Fragrance", price_gbp: 82.25, price_usd: 104.12, product_url: "https://www.sephora.qa/brand/dior/#miss-dior-eau-de-parfum-mini-miss-solid-perfume", image_url: "/dior-miss-dior-eau-de-parfum-mini-miss-solid-perfume.jpg", deliverable_lebanon: false },
  { brand: "DIOR", name: "Solar The Self-Tanning Drops - Illuminating Self-Tanning", category: "Skincare", price_gbp: 67.95, price_usd: 86.01, product_url: "https://www.sephora.qa/brand/dior/#solar-the-self-tanning-drops-illuminating-self-tanning", image_url: "/dior-solar-the-self-tanning-drops-illuminating-self-tanning.jpg", deliverable_lebanon: true },
  { brand: "DIOR", name: "J'adore Les Adorables Shimmering Oil", category: "Skincare", price_gbp: 79.87, price_usd: 101.1, product_url: "https://www.sephora.qa/brand/dior/#j-adore-les-adorables-shimmering-oil", image_url: "/dior-j-adore-les-adorables-shimmering-oil.jpg", deliverable_lebanon: true },
  { brand: "DIOR", name: "Prestige Le Protecteur UV Jeunesse et Lumiere", category: "Skincare", price_gbp: 120.4, price_usd: 152.4, product_url: "https://www.sephora.qa/brand/dior/#prestige-le-protecteur-uv-jeunesse-et-lumiere", image_url: "/dior-prestige-le-protecteur-uv-jeunesse-et-lumiere.jpg", deliverable_lebanon: true },
  { brand: "DIOR", name: "Le Biphase OFF/ON Biphase Makeup Remover", category: "Skincare", price_gbp: 47.36, price_usd: 59.95, product_url: "https://www.sephora.qa/brand/dior/#le-biphase-off-on-biphase-makeup-remover", image_url: "/dior-le-biphase-off-on-biphase-makeup-remover.jpg", deliverable_lebanon: true },
  { brand: "DIOR", name: "J'adore Les Adorables - Golden Gel Shimmering", category: "Skincare", price_gbp: 71.52, price_usd: 90.53, product_url: "https://www.sephora.qa/brand/dior/#j-adore-les-adorables-golden-gel-shimmering", image_url: "/dior-j-adore-les-adorables-golden-gel-shimmering.jpg", deliverable_lebanon: true },
  { brand: "DIOR", name: "J'Adore Les Adorables Shower Gel", category: "Skincare", price_gbp: 65.56, price_usd: 82.99, product_url: "https://www.sephora.qa/brand/dior/#j-adore-les-adorables-shower-gel", image_url: "/dior-j-adore-les-adorables-shower-gel.jpg", deliverable_lebanon: true },
  { brand: "DIOR", name: "Vernis Nail Polish with Gel Effect and Couture Colour", category: "Makeup", price_gbp: 34.89, price_usd: 44.17, product_url: "https://www.sephora.qa/brand/dior/#vernis-nail-polish-with-gel-effect-and-couture-colour", image_url: "/dior-vernis-nail-polish-with-gel-effect-and-couture-colour.jpg", deliverable_lebanon: true },
  { brand: "DIOR", name: "Miss Dior Parfum Mini Miss Solid Perfume", category: "Fragrance", price_gbp: 89.4, price_usd: 113.17, product_url: "https://www.sephora.qa/brand/dior/#miss-dior-parfum-mini-miss-solid-perfume", image_url: "/dior-miss-dior-parfum-mini-miss-solid-perfume.jpg", deliverable_lebanon: false },
  { brand: "DIOR", name: "L'Eau Micellaire OFF/ON Micellar Water Makeup Remover", category: "Skincare", price_gbp: 52.45, price_usd: 66.39, product_url: "https://www.sephora.qa/brand/dior/#l-eau-micellaire-off-on-micellar-water-makeup-remover", image_url: "/dior-l-eau-micellaire-off-on-micellar-water-makeup-remover.jpg", deliverable_lebanon: true },
  { brand: "DIOR", name: "Diorsnow Essence of Light Serum", category: "Skincare", price_gbp: 152.58, price_usd: 193.14, product_url: "https://www.sephora.qa/brand/dior/#diorsnow-essence-of-light-serum", image_url: "/dior-diorsnow-essence-of-light-serum.jpg", deliverable_lebanon: true },
  { brand: "DIOR", name: "Dior Prestige - La Creme Lumiere", category: "Skincare", price_gbp: 495.89, price_usd: 627.71, product_url: "https://www.sephora.qa/brand/dior/#dior-prestige-la-creme-lumiere", image_url: "/dior-prestige-la-creme-lumiere.jpg", deliverable_lebanon: true },
  { brand: "DIOR", name: "Sauvage Hair Serum Taming and Hydrating", category: "Haircare", price_gbp: 88.21, price_usd: 111.66, product_url: "https://www.sephora.qa/brand/dior/#sauvage-hair-serum-taming-and-hydrating", image_url: "/dior-sauvage-hair-serum-taming-and-hydrating.jpg", deliverable_lebanon: true },
  { brand: "DIOR", name: "J'adore Perfumed Deodorant", category: "Fragrance", price_gbp: 61.98, price_usd: 78.46, product_url: "https://www.sephora.qa/brand/dior/#j-adore-perfumed-deodorant", image_url: "/dior-j-adore-perfumed-deodorant.jpg", deliverable_lebanon: false },
  { brand: "DIOR", name: "Capture Pro-Collagen Shot", category: "Skincare", price_gbp: 96.55, price_usd: 122.22, product_url: "https://www.sephora.qa/brand/dior/#capture-pro-collagen-shot", image_url: "/dior-capture-pro-collagen-shot.jpg", deliverable_lebanon: true },
  { brand: "DIOR", name: "Capture Day Creme", category: "Skincare", price_gbp: 141.85, price_usd: 179.56, product_url: "https://www.sephora.qa/brand/dior/#capture-day-creme", image_url: "/dior-capture-day-creme.jpg", deliverable_lebanon: true },
  { brand: "DIOR", name: "Hydra Life Balancing Hydration 2 in 1 Sorbet", category: "Skincare", price_gbp: 44.86, price_usd: 56.79, product_url: "https://www.sephora.qa/brand/dior/#hydra-life-balancing-hydration-2-in-1-sorbet", image_url: "/dior-hydra-life-balancing-hydration-2-in-1-sorbet.jpg", deliverable_lebanon: true },
  { brand: "DIOR", name: "Prestige La Micro-Brume de Rose", category: "Skincare", price_gbp: 307.55, price_usd: 389.3, product_url: "https://www.sephora.qa/brand/dior/#prestige-la-micro-brume-de-rose", image_url: "/dior-prestige-la-micro-brume-de-rose.jpg", deliverable_lebanon: true },
  { brand: "DIOR", name: "Dior Prestige La Creme Mains de Rose", category: "Skincare", price_gbp: 76.29, price_usd: 96.57, product_url: "https://www.sephora.qa/brand/dior/#dior-prestige-la-creme-mains-de-rose", image_url: "/dior-dior-prestige-la-creme-mains-de-rose.jpg", deliverable_lebanon: true },
  { brand: "DIOR", name: "Dior The Micellar Water", category: "Skincare", price_gbp: 47.36, price_usd: 59.95, product_url: "https://www.sephora.qa/brand/dior/#dior-the-micellar-water", image_url: "/dior-dior-the-micellar-water.jpg", deliverable_lebanon: true },
  { brand: "DIOR", name: "Dior Solar - The Protective Creme", category: "Skincare", price_gbp: 47.36, price_usd: 59.95, product_url: "https://www.sephora.qa/brand/dior/#dior-solar-the-protective-creme", image_url: "/dior-dior-solar-the-protective-creme.jpg", deliverable_lebanon: true },
  { brand: "DIOR", name: "J'adore Les Adorables - Shimmering Scrub", category: "Skincare", price_gbp: 90.6, price_usd: 114.68, product_url: "https://www.sephora.qa/brand/dior/#j-adore-les-adorables-shimmering-scrub", image_url: "/dior-j-adore-les-adorables-shimmering-scrub.jpg", deliverable_lebanon: true },
  { brand: "DIOR", name: "J'Adore Les Adorables Body Milk", category: "Skincare", price_gbp: 76.29, price_usd: 96.57, product_url: "https://www.sephora.qa/brand/dior/#j-adore-les-adorables-body-milk", image_url: "/dior-j-adore-les-adorables-body-milk.jpg", deliverable_lebanon: true },
  { brand: "DIOR", name: "Snow Micro-Infused Lotion", category: "Skincare", price_gbp: 84.63, price_usd: 107.13, product_url: "https://www.sephora.qa/brand/dior/#snow-micro-infused-lotion", image_url: "/dior-snow-micro-infused-lotion.jpg", deliverable_lebanon: true },
  { brand: "DIOR", name: "Capture Soft Creme Face Cream", category: "Skincare", price_gbp: 141.85, price_usd: 179.56, product_url: "https://www.sephora.qa/brand/dior/#capture-soft-creme-face-cream", image_url: "/dior-capture-soft-creme-face-cream.jpg", deliverable_lebanon: true },
  { brand: "DIOR", name: "Hydra Life Sorbet Water Essence", category: "Skincare", price_gbp: 69.14, price_usd: 87.52, product_url: "https://www.sephora.qa/brand/dior/#hydra-life-sorbet-water-essence", image_url: "/dior-hydra-life-sorbet-water-essence.jpg", deliverable_lebanon: true },
  { brand: "DIOR", name: "Dior Prestige - Le Micro-Caviar de Rose", category: "Skincare", price_gbp: 507.81, price_usd: 642.8, product_url: "https://www.sephora.qa/brand/dior/#dior-prestige-le-micro-caviar-de-rose", image_url: "/dior-dior-prestige-le-micro-caviar-de-rose.jpg", deliverable_lebanon: true },
  { brand: "DIOR", name: "J'adore Les Adorables - Body Cream", category: "Skincare", price_gbp: 103.71, price_usd: 131.28, product_url: "https://www.sephora.qa/brand/dior/#j-adore-les-adorables-body-cream", image_url: "/dior-j-adore-les-adorables-body-cream.jpg", deliverable_lebanon: true },
  { brand: "DIOR", name: "Capture Night Creme Face", category: "Skincare", price_gbp: 170.47, price_usd: 215.78, product_url: "https://www.sephora.qa/brand/dior/#capture-night-creme-face", image_url: "/dior-capture-night-creme-face.jpg", deliverable_lebanon: true },
  { brand: "DIOR", name: "Capture Totale - Retishot", category: "Skincare", price_gbp: 109.67, price_usd: 138.82, product_url: "https://www.sephora.qa/brand/dior/#capture-totale-retishot", image_url: "/dior-capture-totale-retishot.jpg", deliverable_lebanon: true },
  { brand: "DIOR", name: "Capture Rich Creme Texture Face Cream", category: "Skincare", price_gbp: 141.85, price_usd: 179.56, product_url: "https://www.sephora.qa/brand/dior/#capture-rich-creme-texture-face-cream", image_url: "/dior-capture-rich-creme-texture-face-cream.jpg", deliverable_lebanon: true },
  { brand: "DIOR", name: "Dior Prestige Le Baume Demaquillant", category: "Skincare", price_gbp: 113.25, price_usd: 143.35, product_url: "https://www.sephora.qa/brand/dior/#dior-prestige-le-baume-demaquillant", image_url: "/dior-dior-prestige-le-baume-demaquillant.jpg", deliverable_lebanon: true },
  { brand: "DIOR", name: "Dior Hydra Life Fresh", category: "Skincare", price_gbp: 77.48, price_usd: 98.08, product_url: "https://www.sephora.qa/brand/dior/#dior-hydra-life-fresh", image_url: "/dior-dior-hydra-life-fresh.jpg", deliverable_lebanon: true },
  { brand: "DIOR", name: "Dior Hydra Life Intense", category: "Skincare", price_gbp: 77.48, price_usd: 98.08, product_url: "https://www.sephora.qa/brand/dior/#dior-hydra-life-intense", image_url: "/dior-dior-hydra-life-intense.jpg", deliverable_lebanon: true },
  { brand: "DIOR", name: "Capture Totale Intensive Essence Lotion", category: "Skincare", price_gbp: 81.06, price_usd: 102.61, product_url: "https://www.sephora.qa/brand/dior/#capture-totale-intensive-essence-lotion", image_url: "/dior-capture-totale-intensive-essence-lotion.jpg", deliverable_lebanon: true },
  { brand: "DIOR", name: "Cleansing Milk - Micellar Milk for Face and Eyes", category: "Skincare", price_gbp: 47.36, price_usd: 59.95, product_url: "https://www.sephora.qa/brand/dior/#cleansing-milk-micellar-milk-for-face-and-eyes", image_url: "/dior-cleansing-milk-micellar-milk-for-face-and-eyes.jpg", deliverable_lebanon: true },
  { brand: "DIOR", name: "Dior Solar - The Protective Face and Body Oil", category: "Skincare", price_gbp: 52.35, price_usd: 66.26, product_url: "https://www.sephora.qa/brand/dior/#dior-solar-the-protective-face-and-body-oil", image_url: "/dior-dior-solar-the-protective-face-and-body-oil.jpg", deliverable_lebanon: true },
  { brand: "DIOR", name: "Dior Solar - The After-Sun Balm", category: "Skincare", price_gbp: 52.45, price_usd: 66.39, product_url: "https://www.sephora.qa/brand/dior/#dior-solar-the-after-sun-balm", image_url: "/dior-dior-solar-the-after-sun-balm.jpg", deliverable_lebanon: true },
  { brand: "DIOR", name: "Dior Prestige La Creme Texture Fine", category: "Skincare", price_gbp: 437.48, price_usd: 553.77, product_url: "https://www.sephora.qa/brand/dior/#dior-prestige-la-creme-texture-fine", image_url: "/dior-dior-prestige-la-creme-texture-fine.jpg", deliverable_lebanon: true },
  { brand: "DIOR", name: "Capture Eye Creme", category: "Skincare", price_gbp: 106.09, price_usd: 134.29, product_url: "https://www.sephora.qa/brand/dior/#capture-eye-creme", image_url: "/dior-capture-eye-creme.jpg", deliverable_lebanon: true },
  { brand: "DIOR", name: "Dior Prestige La Lotion Essence de Rose", category: "Skincare", price_gbp: 177.62, price_usd: 224.83, product_url: "https://www.sephora.qa/brand/dior/#dior-prestige-la-lotion-essence-de-rose", image_url: "/dior-dior-prestige-la-lotion-essence-de-rose.jpg", deliverable_lebanon: true },
  { brand: "DIOR", name: "Dior Prestige Le Concentre Yeux", category: "Skincare", price_gbp: 257.48, price_usd: 325.93, product_url: "https://www.sephora.qa/brand/dior/#dior-prestige-le-concentre-yeux", image_url: "/dior-dior-prestige-le-concentre-yeux.jpg", deliverable_lebanon: true },
  { brand: "DIOR", name: "Capture Totale Hyalushots", category: "Skincare", price_gbp: 90.6, price_usd: 114.68, product_url: "https://www.sephora.qa/brand/dior/#capture-totale-hyalushots", image_url: "/dior-capture-totale-hyalushots.jpg", deliverable_lebanon: true },
  { brand: "DIOR", name: "Dior Prestige Le Sucre de Gommage Face Scrub", category: "Skincare", price_gbp: 127.55, price_usd: 161.45, product_url: "https://www.sephora.qa/brand/dior/#dior-prestige-le-sucre-de-gommage-face-scrub", image_url: "/dior-dior-prestige-le-sucre-de-gommage-face-scrub.jpg", deliverable_lebanon: true },
  { brand: "DIOR", name: "Dior Prestige - La Creme Texture Riche", category: "Skincare", price_gbp: 437.48, price_usd: 553.77, product_url: "https://www.sephora.qa/brand/dior/#dior-prestige-la-creme-texture-riche", image_url: "/dior-dior-prestige-la-creme-texture-riche.jpg", deliverable_lebanon: true },
  { brand: "DIOR", name: "Rouge Dior Forever Liquid", category: "Makeup", price_gbp: 49.85, price_usd: 63.1, product_url: "https://www.sephora.qa/brand/dior/#rouge-dior-forever-liquid", image_url: "/dior-rouge-dior-forever-liquid.jpg", deliverable_lebanon: true },
  { brand: "DIOR", name: "Dior Prestige - La Creme Texture Essentielle", category: "Skincare", price_gbp: 437.48, price_usd: 553.77, product_url: "https://www.sephora.qa/brand/dior/#dior-prestige-la-creme-texture-essentielle", image_url: "/dior-dior-prestige-la-creme-texture-essentielle.jpg", deliverable_lebanon: true },
  { brand: "DIOR", name: "Miss Dior Comforting Body Cream", category: "Skincare", price_gbp: 95.36, price_usd: 120.71, product_url: "https://www.sephora.qa/brand/dior/#miss-dior-comforting-body-cream", image_url: "/dior-miss-dior-comforting-body-cream.jpg", deliverable_lebanon: true },
  { brand: "DIOR", name: "Dior Forever Skin Perfect Multi-Use Foundation Stick", category: "Makeup", price_gbp: 61.98, price_usd: 78.46, product_url: "https://www.sephora.qa/brand/dior/#dior-forever-skin-perfect-multi-use-foundation-stick", image_url: "/dior-dior-forever-skin-perfect-multi-use-foundation-stick.jpg", deliverable_lebanon: true },
  { brand: "DIOR", name: "Dior Forever Skin Correct", category: "Makeup", price_gbp: 46.11, price_usd: 58.37, product_url: "https://www.sephora.qa/brand/dior/#dior-forever-skin-correct", image_url: "/dior-dior-forever-skin-correct.jpg", deliverable_lebanon: true },
  { brand: "DIOR", name: "Rouge Dior On Stage", category: "Makeup", price_gbp: 53.59, price_usd: 67.83, product_url: "https://www.sephora.qa/brand/dior/#rouge-dior-on-stage", image_url: "/dior-rouge-dior-on-stage.jpg", deliverable_lebanon: true },
  { brand: "DIOR", name: "Dior Forever Glow Star Filter", category: "Makeup", price_gbp: 60.79, price_usd: 76.95, product_url: "https://www.sephora.qa/brand/dior/#dior-forever-glow-star-filter", image_url: "/dior-dior-forever-glow-star-filter.jpg", deliverable_lebanon: true },
  { brand: "DIOR", name: "Diorshow Liquid Liner", category: "Makeup", price_gbp: 49.85, price_usd: 63.1, product_url: "https://www.sephora.qa/brand/dior/#diorshow-liquid-liner", image_url: "/dior-diorshow-liquid-liner.jpg", deliverable_lebanon: true },
  { brand: "DIOR", name: "Diorshow Mono", category: "Makeup", price_gbp: 48.6, price_usd: 61.52, product_url: "https://www.sephora.qa/brand/dior/#diorshow-mono", image_url: "/dior-diorshow-mono.jpg", deliverable_lebanon: true },
  { brand: "DIOR", name: "Dior Forever Hydra Nude", category: "Makeup", price_gbp: 66.76, price_usd: 84.5, product_url: "https://www.sephora.qa/brand/dior/#dior-forever-hydra-nude", image_url: "/dior-dior-forever-hydra-nude.jpg", deliverable_lebanon: true },
  { brand: "DIOR", name: "Diorshow Stylo Waterproof Eyeliner", category: "Makeup", price_gbp: 38.63, price_usd: 48.9, product_url: "https://www.sephora.qa/brand/dior/#diorshow-stylo-waterproof-eyeliner", image_url: "/dior-diorshow-stylo-waterproof-eyeliner.jpg", deliverable_lebanon: true },
  { brand: "DIOR", name: "Rouge Dior", category: "Makeup", price_gbp: 56.03, price_usd: 70.92, product_url: "https://www.sephora.qa/brand/dior/#rouge-dior", image_url: "/dior-rouge-dior.jpg", deliverable_lebanon: true },
  { brand: "DIOR", name: "Dior Contour", category: "Makeup", price_gbp: 36.14, price_usd: 45.75, product_url: "https://www.sephora.qa/brand/dior/#dior-contour", image_url: "/dior-dior-contour.jpg", deliverable_lebanon: true },
  { brand: "DIOR", name: "Diorshow Onstage Crayon - Waterproof Kohl Eyeliner", category: "Makeup", price_gbp: 38.63, price_usd: 48.9, product_url: "https://www.sephora.qa/brand/dior/#diorshow-onstage-crayon-waterproof-kohl-eyeliner", image_url: "/dior-diorshow-onstage-crayon-waterproof-kohl-eyeliner.jpg", deliverable_lebanon: true },
  { brand: "DIOR", name: "Sourcils Poudre Powder Eyebrow Pencil with Brush", category: "Makeup", price_gbp: 37.39, price_usd: 47.33, product_url: "https://www.sephora.qa/brand/dior/#sourcils-poudre-powder-eyebrow-pencil-with-brush", image_url: "/dior-sourcils-poudre-powder-eyebrow-pencil-with-brush.jpg", deliverable_lebanon: true },
  { brand: "DIOR", name: "Diorshow Brow Styler", category: "Makeup", price_gbp: 42.38, price_usd: 53.64, product_url: "https://www.sephora.qa/brand/dior/#diorshow-brow-styler", image_url: "/dior-diorshow-brow-styler.jpg", deliverable_lebanon: true },
  { brand: "DIOR", name: "Vernis - Couture Color Gel Effect Nail Polish", category: "Makeup", price_gbp: 39.88, price_usd: 50.48, product_url: "https://www.sephora.qa/brand/dior/#vernis-couture-color-gel-effect-nail-polish", image_url: "/dior-vernis-couture-color-gel-effect-nail-polish.jpg", deliverable_lebanon: true },
  { brand: "DIOR", name: "Diorshow Iconic Overcurl", category: "Makeup", price_gbp: 49.85, price_usd: 63.1, product_url: "https://www.sephora.qa/brand/dior/#diorshow-iconic-overcurl", image_url: "/dior-diorshow-iconic-overcurl.jpg", deliverable_lebanon: true },
  { brand: "DIOR", name: "Dior Addict Lip Maximizer Lip Plumping Gloss", category: "Makeup", price_gbp: 44.86, price_usd: 56.79, product_url: "https://www.sephora.qa/brand/dior/#dior-addict-lip-maximizer-lip-plumping-gloss", image_url: "/dior-dior-addict-lip-maximizer-lip-plumping-gloss.jpg", deliverable_lebanon: true },
  { brand: "DIOR", name: "Dreamskin Care & Perfect Le Fluide Perfecteur", category: "Skincare", price_gbp: 133.51, price_usd: 169.0, product_url: "https://www.sephora.qa/brand/dior/#dreamskin-care-perfect-le-fluide-perfecteur", image_url: "/dior-dreamskin-care-perfect-le-fluide-perfecteur.jpg", deliverable_lebanon: true },
  { brand: "DIOR", name: "Capture Le Serum", category: "Skincare", price_gbp: 141.85, price_usd: 179.56, product_url: "https://www.sephora.qa/brand/dior/#capture-le-serum", image_url: "/dior-capture-le-serum.jpg", deliverable_lebanon: true },
  { brand: "DIOR", name: "Dior Addict - Shine Lipstick", category: "Makeup", price_gbp: 53.59, price_usd: 67.83, product_url: "https://www.sephora.qa/brand/dior/#dior-addict-shine-lipstick", image_url: "/dior-dior-addict-shine-lipstick.jpg", deliverable_lebanon: true },
  { brand: "DIOR", name: "Forever Nude Bronze Powder", category: "Makeup", price_gbp: 64.37, price_usd: 81.48, product_url: "https://www.sephora.qa/brand/dior/#forever-nude-bronze-powder", image_url: "/dior-forever-nude-bronze-powder.jpg", deliverable_lebanon: true },
  { brand: "DIOR", name: "Diorshow 5 Couleurs - Eye Palette 5 Eyeshadows", category: "Makeup", price_gbp: 76.29, price_usd: 96.57, product_url: "https://www.sephora.qa/brand/dior/#diorshow-5-couleurs-eye-palette-5-eyeshadows", image_url: "/dior-diorshow-5-couleurs-eye-palette-5-eyeshadows.jpg", deliverable_lebanon: true },
  { brand: "DIOR", name: "Diorshow On Set Brow Mascara", category: "Makeup", price_gbp: 34.89, price_usd: 44.17, product_url: "https://www.sephora.qa/brand/dior/#diorshow-on-set-brow-mascara", image_url: "/dior-diorshow-on-set-brow-mascara.jpg", deliverable_lebanon: true },
  { brand: "DIOR", name: "Rouge Blush - Couture Color Long-Wear Blush", category: "Makeup", price_gbp: 60.79, price_usd: 76.95, product_url: "https://www.sephora.qa/brand/dior/#rouge-blush-couture-color-long-wear-blush", image_url: "/dior-rouge-blush-couture-color-long-wear-blush.jpg", deliverable_lebanon: true },
  { brand: "DIOR", name: "Diorshow 5 Couleurs - Limited Edition Eye Palette", category: "Makeup", price_gbp: 73.9, price_usd: 93.55, product_url: "https://www.sephora.qa/brand/dior/#diorshow-5-couleurs-limited-edition-eye-palette", image_url: "/dior-diorshow-5-couleurs-limited-edition-eye-palette.jpg", deliverable_lebanon: true },
  { brand: "DIOR", name: "Dior Prestige Le Cushion Teint de Rose", category: "Makeup", price_gbp: 122.78, price_usd: 155.42, product_url: "https://www.sephora.qa/brand/dior/#dior-prestige-le-cushion-teint-de-rose", image_url: "/dior-dior-prestige-le-cushion-teint-de-rose.jpg", deliverable_lebanon: true },
  { brand: "DIOR", name: "Dior Prestige La Micro-Lotion De Rose Advanced Formula", category: "Skincare", price_gbp: 141.85, price_usd: 179.56, product_url: "https://www.sephora.qa/brand/dior/#dior-prestige-la-micro-lotion-de-rose-advanced-formula", image_url: "/dior-dior-prestige-la-micro-lotion-de-rose-advanced-formula.jpg", deliverable_lebanon: true },
  { brand: "DIOR", name: "Dior Addict Lip Tint - 24-Hour Hydration Non-Transfer Lip Ink", category: "Makeup", price_gbp: 47.36, price_usd: 59.95, product_url: "https://www.sephora.qa/brand/dior/#dior-addict-lip-tint-24-hour-hydration-non-transfer-lip-ink", image_url: "/dior-dior-addict-lip-tint-24-hour-hydration-non-transfer-lip-ink.jpg", deliverable_lebanon: true },
  { brand: "DIOR", name: "Huile Abricot - Nutritive Serum for Nails and Cuticles", category: "Makeup", price_gbp: 39.88, price_usd: 50.48, product_url: "https://www.sephora.qa/brand/dior/#huile-abricot-nutritive-serum-for-nails-and-cuticles", image_url: "/dior-huile-abricot-nutritive-serum-for-nails-and-cuticles.jpg", deliverable_lebanon: true },
  { brand: "DIOR", name: "Prestige Le Micro-Serum de Rose Yeux", category: "Skincare", price_gbp: 307.55, price_usd: 389.3, product_url: "https://www.sephora.qa/brand/dior/#prestige-le-micro-serum-de-rose-yeux", image_url: "/dior-prestige-le-micro-serum-de-rose-yeux.jpg", deliverable_lebanon: true },
  { brand: "DIOR", name: "L'Huile OFF/ON Rinse-off Makeup Remover", category: "Skincare", price_gbp: 52.45, price_usd: 66.39, product_url: "https://www.sephora.qa/brand/dior/#l-huile-off-on-rinse-off-makeup-remover", image_url: "/dior-l-huile-off-on-rinse-off-makeup-remover.jpg", deliverable_lebanon: true },
  { brand: "DIOR", name: "Dior Snow Essence of Light Creme", category: "Skincare", price_gbp: 115.62, price_usd: 146.36, product_url: "https://www.sephora.qa/brand/dior/#dior-snow-essence-of-light-creme", image_url: "/dior-dior-snow-essence-of-light-creme.jpg", deliverable_lebanon: true },
  { brand: "DIOR", name: "Dior Solar The Self-Tanning Gel", category: "Skincare", price_gbp: 77.48, price_usd: 98.08, product_url: "https://www.sephora.qa/brand/dior/#dior-solar-the-self-tanning-gel", image_url: "/dior-dior-solar-the-self-tanning-gel.jpg", deliverable_lebanon: true },
  { brand: "DIOR", name: "Rouge Dior Balm", category: "Makeup", price_gbp: 56.03, price_usd: 70.92, product_url: "https://www.sephora.qa/brand/dior/#rouge-dior-balm", image_url: "/dior-rouge-dior-balm.jpg", deliverable_lebanon: true },
  { brand: "DIOR", name: "Dior Prestige La Micro-Huile De Rose Activated Serum", category: "Skincare", price_gbp: 330.2, price_usd: 417.97, product_url: "https://www.sephora.qa/brand/dior/#dior-prestige-la-micro-huile-de-rose-activated-serum", image_url: "/dior-dior-prestige-la-micro-huile-de-rose-activated-serum.jpg", deliverable_lebanon: true },
  { brand: "DIOR", name: "J'adior Solid Perfume Eau de Parfum", category: "Fragrance", price_gbp: 72.71, price_usd: 92.04, product_url: "https://www.sephora.qa/brand/dior/#j-adior-solid-perfume-eau-de-parfum", image_url: "/dior-j-adior-solid-perfume-eau-de-parfum.jpg", deliverable_lebanon: false },
  { brand: "DIOR", name: "Forever Perfect Fix Face Mist", category: "Makeup", price_gbp: 52.35, price_usd: 66.26, product_url: "https://www.sephora.qa/brand/dior/#forever-perfect-fix-face-mist", image_url: "/dior-forever-perfect-fix-face-mist.jpg", deliverable_lebanon: true },
  { brand: "DIOR", name: "Dior Prestige La Mousse Micellaire Face Cleanser", category: "Skincare", price_gbp: 109.67, price_usd: 138.82, product_url: "https://www.sephora.qa/brand/dior/#dior-prestige-la-mousse-micellaire-face-cleanser", image_url: "/dior-dior-prestige-la-mousse-micellaire-face-cleanser.jpg", deliverable_lebanon: true },
  { brand: "DIOR", name: "Capture Totale Super Potent Cleanser", category: "Skincare", price_gbp: 64.37, price_usd: 81.48, product_url: "https://www.sephora.qa/brand/dior/#capture-totale-super-potent-cleanser", image_url: "/dior-capture-totale-super-potent-cleanser.jpg", deliverable_lebanon: true },
  { brand: "DIOR", name: "Dior Addict Lip Maximizer Serum - Lip Plumper", category: "Makeup", price_gbp: 47.36, price_usd: 59.95, product_url: "https://www.sephora.qa/brand/dior/#dior-addict-lip-maximizer-serum-lip-plumper", image_url: "/dior-dior-addict-lip-maximizer-serum-lip-plumper.jpg", deliverable_lebanon: true },
  { brand: "DIOR", name: "Dior Forever Natural Bronze - Limited Dioriviera Edition", category: "Makeup", price_gbp: 65.56, price_usd: 82.99, product_url: "https://www.sephora.qa/brand/dior/#dior-forever-natural-bronze-limited-dioriviera-edition", image_url: "/dior-dior-forever-natural-bronze-limited-dioriviera-edition.jpg", deliverable_lebanon: true },
  { brand: "DIOR", name: "Dior Solar - The Protective Milk", category: "Skincare", price_gbp: 52.35, price_usd: 66.26, product_url: "https://www.sephora.qa/brand/dior/#dior-solar-the-protective-milk", image_url: "/dior-dior-solar-the-protective-milk.jpg", deliverable_lebanon: true },
  { brand: "DIOR", name: "Dior Forever Glow Veil Radiance Primer", category: "Makeup", price_gbp: 54.83, price_usd: 69.41, product_url: "https://www.sephora.qa/brand/dior/#dior-forever-glow-veil-radiance-primer", image_url: "/dior-dior-forever-glow-veil-radiance-primer.jpg", deliverable_lebanon: true },
  { brand: "DIOR", name: "Dior Homme Soothing Shaving Creme", category: "Skincare", price_gbp: 63.18, price_usd: 79.97, product_url: "https://www.sephora.qa/brand/dior/#dior-homme-soothing-shaving-creme", image_url: "/dior-dior-homme-soothing-shaving-creme.jpg", deliverable_lebanon: true },
  { brand: "DIOR", name: "Capture Dreamskin 1-Minute Mask", category: "Skincare", price_gbp: 76.29, price_usd: 96.57, product_url: "https://www.sephora.qa/brand/dior/#capture-dreamskin-1-minute-mask", image_url: "/dior-capture-dreamskin-1-minute-mask.jpg", deliverable_lebanon: true },
  { brand: "DIOR", name: "Dior Forever Velvet Veil Blurring Matte Primer", category: "Makeup", price_gbp: 54.83, price_usd: 69.41, product_url: "https://www.sephora.qa/brand/dior/#dior-forever-velvet-veil-blurring-matte-primer", image_url: "/dior-dior-forever-velvet-veil-blurring-matte-primer.jpg", deliverable_lebanon: true },
  { brand: "DIOR", name: "Diorshow Iconic Overcurl Refill", category: "Makeup", price_gbp: 34.89, price_usd: 44.17, product_url: "https://www.sephora.qa/brand/dior/#diorshow-iconic-overcurl-refill", image_url: "/dior-diorshow-iconic-overcurl-refill.jpg", deliverable_lebanon: true },
  { brand: "DIOR", name: "Base Vernis - Protective Strengthening Nail Care Base", category: "Makeup", price_gbp: 39.88, price_usd: 50.48, product_url: "https://www.sephora.qa/brand/dior/#base-vernis-protective-strengthening-nail-care-base", image_url: "/dior-base-vernis-protective-strengthening-nail-care-base.jpg", deliverable_lebanon: true },
  { brand: "DIOR", name: "Creme Abricot - Strengthening Nail Care", category: "Makeup", price_gbp: 39.88, price_usd: 50.48, product_url: "https://www.sephora.qa/brand/dior/#creme-abricot-strengthening-nail-care", image_url: "/dior-creme-abricot-strengthening-nail-care.jpg", deliverable_lebanon: true },
  { brand: "DIOR", name: "Dissolvant Douceur - Gentle Nail Polish Remover", category: "Makeup", price_gbp: 32.41, price_usd: 41.02, product_url: "https://www.sephora.qa/brand/dior/#dissolvant-douceur-gentle-nail-polish-remover", image_url: "/dior-dissolvant-douceur-gentle-nail-polish-remover.jpg", deliverable_lebanon: true },
  { brand: "DIOR", name: "Top Coat - Finishing Lacquer", category: "Makeup", price_gbp: 39.88, price_usd: 50.48, product_url: "https://www.sephora.qa/brand/dior/#top-coat-finishing-lacquer", image_url: "/dior-top-coat-finishing-lacquer.jpg", deliverable_lebanon: true },
  { brand: "DIOR", name: "La Mousse OFF/ON Foaming Cleanser", category: "Skincare", price_gbp: 64.37, price_usd: 81.48, product_url: "https://www.sephora.qa/brand/dior/#la-mousse-off-on-foaming-cleanser", image_url: "/dior-la-mousse-off-on-foaming-cleanser.jpg", deliverable_lebanon: true }
];

async function main(): Promise<void> {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL is not set. Make sure .env.local exists in the project root.");
    process.exit(1);
  }

  await ensureSchema();
  const sql = getSql();

  let inserted = 0;
  for (const p of PRODUCTS) {
    try {
      await sql`
        insert into products (
          brand, name, category, price_gbp, price_usd, deliverable_lebanon, product_url, image_url
        )
        values (
          ${p.brand}, ${p.name}, ${p.category}, ${p.price_gbp}, ${p.price_usd},
          ${p.deliverable_lebanon}, ${p.product_url}, ${p.image_url}
        )
        on conflict (product_url) do update set
          brand = excluded.brand,
          name = excluded.name,
          category = excluded.category,
          price_gbp = excluded.price_gbp,
          price_usd = excluded.price_usd,
          deliverable_lebanon = excluded.deliverable_lebanon,
          image_url = excluded.image_url,
          scraped_at = now()
      `;
      inserted += 1;
      console.log(`  OK  ${p.name} — $${p.price_usd}`);
    } catch (err) {
      console.error(`FAIL  ${p.name}:`, err);
    }
  }

  console.log(`\nInserted/updated ${inserted}/${PRODUCTS.length} DIOR products.`);
}

main().catch((err) => {
  console.error("Import failed:", err);
  process.exit(1);
});
