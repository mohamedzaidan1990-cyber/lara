/**
 * One-off import: 30 Lanolips products sourced from Sephora Qatar
 * screenshots. Pricing rule (per user instruction, flat — no set/kit
 * distinction this time):
 *   price_usd = qar_price / 3.645 + 8
 *
 * Checked the catalog first — no existing Lanolips/Lano products, so
 * all 30 are new.
 *
 * Per instruction, images were NOT cropped from the screenshots —
 * each was sourced from lanolips.com's product pages (via Shopify's
 * public predictive-search / product .json endpoints, cross-checked
 * by title) or, for 3 items not sold on the current US site, from
 * Cult Beauty, Sephora UK/feelunique, and Selfridges listings of the
 * same product. Every image was visually verified against its
 * screenshot before use.
 *
 * One item — "Sunny Bites Mini Pack" — could not be found on any
 * retailer (official site, Sephora regional sites, Space NK,
 * Selfridges, general web search); per user's explicit choice, it's
 * added with price data but no image (image_url left empty) rather
 * than guessed or cropped from the screenshot.
 *
 * price_gbp is a derived reference value (price_usd * 0.79) since the
 * source listing was in QAR, not GBP.
 *
 * Run:  npx ts-node scripts/add-lanolips-products.ts
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
  for (const raw of text.split(/\r?\n/)) {
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
  { brand: "Lanolips", name: "Ceramide Milkshake Balm", category: "Skincare", price_gbp: 17.16, price_usd: 21.72, product_url: "https://www.sephora.qa/brand/lanolips/#ceramide-milkshake-balm", image_url: "/lanolips-ceramide-milkshake-balm.jpg", deliverable_lebanon: true },
  { brand: "Lanolips", name: "101 Ointment Delicious Mini Bites", category: "Skincare", price_gbp: 16.5, price_usd: 20.89, product_url: "https://www.sephora.qa/brand/lanolips/#101-ointment-delicious-mini-bites", image_url: "/lanolips-101-ointment-delicious-mini-bites.jpg", deliverable_lebanon: true },
  { brand: "Lanolips", name: "Ceramide Milkshake Mini Balms", category: "Skincare", price_gbp: 18.24, price_usd: 23.09, product_url: "https://www.sephora.qa/brand/lanolips/#ceramide-milkshake-mini-balms", image_url: "/lanolips-ceramide-milkshake-mini-balms.jpg", deliverable_lebanon: true },
  { brand: "Lanolips", name: "101 Delicious Mini Treats", category: "Skincare", price_gbp: 18.24, price_usd: 23.09, product_url: "https://www.sephora.qa/brand/lanolips/#101-delicious-mini-treats", image_url: "/lanolips-101-delicious-mini-treats.jpg", deliverable_lebanon: true },
  { brand: "Lanolips", name: "101 Ointment Strawberry & Phone Lip Balm Holder", category: "Skincare", price_gbp: 26.91, price_usd: 34.06, product_url: "https://www.sephora.qa/brand/lanolips/#101-ointment-strawberry-phone-lip-balm-holder", image_url: "/lanolips-101-ointment-strawberry-phone-lip-balm-holder.jpg", deliverable_lebanon: true },
  { brand: "Lanolips", name: "101 Ointment Multipurpose Superbalm Original", category: "Skincare", price_gbp: 17.59, price_usd: 22.27, product_url: "https://www.sephora.qa/brand/lanolips/#101-ointment-multipurpose-superbalm-original", image_url: "/lanolips-101-ointment-multipurpose-superbalm-original.jpg", deliverable_lebanon: true },
  { brand: "Lanolips", name: "Sunny Bites Mini Pack", category: "Skincare", price_gbp: 18.24, price_usd: 23.09, product_url: "https://www.sephora.qa/brand/lanolips/#sunny-bites-mini-pack", image_url: "", deliverable_lebanon: true },
  { brand: "Lanolips", name: "Tinted Lip Balm SPF30", category: "Makeup", price_gbp: 16.5, price_usd: 20.89, product_url: "https://www.sephora.qa/brand/lanolips/#tinted-lip-balm-spf30", image_url: "/lanolips-tinted-lip-balm-spf30.jpg", deliverable_lebanon: true },
  { brand: "Lanolips", name: "Sun Balm SPF 30 Tropical & Phone Lip Balm Holder", category: "Skincare", price_gbp: 26.91, price_usd: 34.06, product_url: "https://www.sephora.qa/brand/lanolips/#sun-balm-spf30-tropical-phone-lip-balm-holder", image_url: "/lanolips-sun-balm-spf30-tropical-phone-lip-balm-holder.jpg", deliverable_lebanon: true },
  { brand: "Lanolips", name: "101 Ointment Multi-Balm Strawberry", category: "Skincare", price_gbp: 16.5, price_usd: 20.89, product_url: "https://www.sephora.qa/brand/lanolips/#101-ointment-multi-balm-strawberry", image_url: "/lanolips-101-ointment-multi-balm-strawberry.jpg", deliverable_lebanon: true },
  { brand: "Lanolips", name: "12 Hour Overnight Lip Mask", category: "Skincare", price_gbp: 18.45, price_usd: 23.36, product_url: "https://www.sephora.qa/brand/lanolips/#12-hour-overnight-lip-mask", image_url: "/lanolips-12-hour-overnight-lip-mask.jpg", deliverable_lebanon: true },
  { brand: "Lanolips", name: "Lip Heroes Day & Night Duo", category: "Skincare", price_gbp: 29.08, price_usd: 36.81, product_url: "https://www.sephora.qa/brand/lanolips/#lip-heroes-day-night-duo", image_url: "/lanolips-lip-heroes-day-night-duo.jpg", deliverable_lebanon: true },
  { brand: "Lanolips", name: "Lip Rituals Scrub & Balm Strawberry", category: "Skincare", price_gbp: 29.08, price_usd: 36.81, product_url: "https://www.sephora.qa/brand/lanolips/#lip-rituals-scrub-balm-strawberry", image_url: "/lanolips-lip-rituals-scrub-balm-strawberry.jpg", deliverable_lebanon: true },
  { brand: "Lanolips", name: "101 Ointment Multi-Balm Raspberry Shortcake", category: "Skincare", price_gbp: 16.5, price_usd: 20.89, product_url: "https://www.sephora.qa/brand/lanolips/#101-ointment-multi-balm-raspberry-shortcake", image_url: "/lanolips-101-ointment-multi-balm-raspberry-shortcake.jpg", deliverable_lebanon: true },
  { brand: "Lanolips", name: "Everywhere Cream", category: "Skincare", price_gbp: 17.59, price_usd: 22.27, product_url: "https://www.sephora.qa/brand/lanolips/#everywhere-cream", image_url: "/lanolips-everywhere-cream.jpg", deliverable_lebanon: true },
  { brand: "Lanolips", name: "Glossy Balm Berry", category: "Makeup", price_gbp: 16.5, price_usd: 20.89, product_url: "https://www.sephora.qa/brand/lanolips/#glossy-balm-berry", image_url: "/lanolips-glossy-balm-berry.jpg", deliverable_lebanon: true },
  { brand: "Lanolips", name: "Sun Balm SPF 30 Tropical", category: "Skincare", price_gbp: 18.24, price_usd: 23.09, product_url: "https://www.sephora.qa/brand/lanolips/#sun-balm-spf30-tropical", image_url: "/lanolips-sun-balm-spf30-tropical.jpg", deliverable_lebanon: true },
  { brand: "Lanolips", name: "Hyaluronic Lip Oil Raspberry", category: "Makeup", price_gbp: 18.24, price_usd: 23.09, product_url: "https://www.sephora.qa/brand/lanolips/#hyaluronic-lip-oil-raspberry", image_url: "/lanolips-hyaluronic-lip-oil-raspberry.jpg", deliverable_lebanon: true },
  { brand: "Lanolips", name: "Lip Rituals Scrub & Balm Coconutter", category: "Skincare", price_gbp: 29.08, price_usd: 36.81, product_url: "https://www.sephora.qa/brand/lanolips/#lip-rituals-scrub-balm-coconutter", image_url: "/lanolips-lip-rituals-scrub-balm-coconutter.jpg", deliverable_lebanon: true },
  { brand: "Lanolips", name: "101 Dry Skin Super Cream - Multipurpose for Face + Body", category: "Skincare", price_gbp: 17.59, price_usd: 22.27, product_url: "https://www.sephora.qa/brand/lanolips/#101-dry-skin-super-cream", image_url: "/lanolips-101-dry-skin-super-cream.jpg", deliverable_lebanon: true },
  { brand: "Lanolips", name: "101 Ointment Multi-Balm Glazed Donut 10g", category: "Skincare", price_gbp: 16.5, price_usd: 20.89, product_url: "https://www.sephora.qa/brand/lanolips/#101-ointment-multi-balm-glazed-donut-10g", image_url: "/lanolips-101-ointment-multi-balm-glazed-donut-10g.jpg", deliverable_lebanon: true },
  { brand: "Lanolips", name: "12 Hour Overnight Hand Mask", category: "Skincare", price_gbp: 18.24, price_usd: 23.09, product_url: "https://www.sephora.qa/brand/lanolips/#12-hour-overnight-hand-mask", image_url: "/lanolips-12-hour-overnight-hand-mask.jpg", deliverable_lebanon: true },
  { brand: "Lanolips", name: "101 Ointment Multi-Balm Peach", category: "Skincare", price_gbp: 16.5, price_usd: 20.89, product_url: "https://www.sephora.qa/brand/lanolips/#101-ointment-multi-balm-peach", image_url: "/lanolips-101-ointment-multi-balm-peach.jpg", deliverable_lebanon: true },
  { brand: "Lanolips", name: "101 Ointment Multi-Balm Coconutter", category: "Skincare", price_gbp: 16.5, price_usd: 20.89, product_url: "https://www.sephora.qa/brand/lanolips/#101-ointment-multi-balm-coconutter", image_url: "/lanolips-101-ointment-multi-balm-coconutter.jpg", deliverable_lebanon: true },
  { brand: "Lanolips", name: "101 Ointment Multi-Balm Watermelon", category: "Skincare", price_gbp: 16.5, price_usd: 20.89, product_url: "https://www.sephora.qa/brand/lanolips/#101-ointment-multi-balm-watermelon", image_url: "/lanolips-101-ointment-multi-balm-watermelon.jpg", deliverable_lebanon: true },
  { brand: "Lanolips", name: "Glossy Balm Candy", category: "Makeup", price_gbp: 16.5, price_usd: 20.89, product_url: "https://www.sephora.qa/brand/lanolips/#glossy-balm-candy", image_url: "/lanolips-glossy-balm-candy.jpg", deliverable_lebanon: true },
  { brand: "Lanolips", name: "101 Ointment Multi-Balm Vanilla", category: "Skincare", price_gbp: 18.24, price_usd: 23.09, product_url: "https://www.sephora.qa/brand/lanolips/#101-ointment-multi-balm-vanilla", image_url: "/lanolips-101-ointment-multi-balm-vanilla.jpg", deliverable_lebanon: true },
  { brand: "Lanolips", name: "Hyaluronic Lip Oil Honey", category: "Makeup", price_gbp: 18.24, price_usd: 23.09, product_url: "https://www.sephora.qa/brand/lanolips/#hyaluronic-lip-oil-honey", image_url: "/lanolips-hyaluronic-lip-oil-honey.jpg", deliverable_lebanon: true },
  { brand: "Lanolips", name: "Rose Gold 101 Ointment", category: "Skincare", price_gbp: 16.5, price_usd: 20.89, product_url: "https://www.sephora.qa/brand/lanolips/#rose-gold-101-ointment", image_url: "/lanolips-rose-gold-101-ointment.jpg", deliverable_lebanon: true },
  { brand: "Lanolips", name: "101 Ointment Multi-Balm Banana Cream Pie", category: "Skincare", price_gbp: 17.16, price_usd: 21.72, product_url: "https://www.sephora.qa/brand/lanolips/#101-ointment-multi-balm-banana-cream-pie", image_url: "/lanolips-101-ointment-multi-balm-banana-cream-pie.jpg", deliverable_lebanon: true }
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

  console.log(`\nInserted/updated ${inserted}/${PRODUCTS.length} Lanolips products.`);
}

main().catch((err) => {
  console.error("Import failed:", err);
  process.exit(1);
});
