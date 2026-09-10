/**
 * Build the "Mix & Match — Any 4" homepage promotion (15 in-stock items).
 *
 * Pricing per explicit user instruction:
 *   - products.price_usd = the PROMO price (headline price everywhere)
 *   - strikethrough / compare-at = 2x the promo price ("value is double")
 *   - GBP = round(USD / 1.30, 2)  (reference figure only)
 *   - the cart charges the retail (2x) price until 4+ Mix & Match units are
 *     in the basket, then drops each to its promo price (see lib/cart.ts +
 *     lib/mix-and-match.ts)
 *
 * Two rows already exist and are RE-PRICED to their promo price:
 *   Milk Makeup "The Jelly Lip Kit"           3fcf4a82  $54 -> $30
 *   Rare Beauty "Find Comfort Fragrance Mist" 2deb4629  $55 -> $25
 *
 * After running, this prints ready-to-paste blocks for:
 *   lib/mix-and-match.ts, lib/promotions.ts, lib/home-promos.ts
 *
 * Run:  npx ts-node scripts/add-mix-and-match-promo.ts
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

const gbp = (usd: number): number => Math.round((usd / 1.3) * 100) / 100;

interface Row {
  key: string;                 // slug for output
  existingId?: string;         // update by id instead of insert
  brand: string;
  name: string;
  category: string;
  promoUsd: number;
  product_url: string;
  image_url: string;
}

const ROWS: Row[] = [
  // ---- Gisou Honey Infused Lip Oils — Gloss Hour Edition (minis, 8ml) — $25 ea
  { key: "gisou-lip-oil-raspberry-swirl", brand: "Gisou", name: "Honey Infused Lip Oil 8ml — Raspberry Swirl (Gloss Hour Edition)", category: "Makeup", promoUsd: 25,
    product_url: "https://seasonsbyb.co.uk/p/mix-and-match/gisou-lip-oil-raspberry-swirl", image_url: "/gisou-lip-oil-gloss-hour.jpg" },
  { key: "gisou-lip-oil-bee-llini-peach", brand: "Gisou", name: "Honey Infused Lip Oil 8ml — Bee-llini Peach (Gloss Hour Edition)", category: "Makeup", promoUsd: 25,
    product_url: "https://seasonsbyb.co.uk/p/mix-and-match/gisou-lip-oil-bee-llini-peach", image_url: "/gisou-lip-oil-gloss-hour.jpg" },
  { key: "gisou-lip-oil-glazed-plum", brand: "Gisou", name: "Honey Infused Lip Oil 8ml — Glazed Plum (Gloss Hour Edition)", category: "Makeup", promoUsd: 25,
    product_url: "https://seasonsbyb.co.uk/p/mix-and-match/gisou-lip-oil-glazed-plum", image_url: "/gisou-lip-oil-gloss-hour.jpg" },

  // ---- Gisou Honey Infused Hair Perfume Minis — Mirsalehi Bee Garden (15ml) — $30 ea
  { key: "gisou-hair-perfume-wildflower-honey", brand: "Gisou", name: "Honey Infused Hair Perfume 15ml — Wildflower Honey (Bee Garden Mini)", category: "Fragrance", promoUsd: 30,
    product_url: "https://seasonsbyb.co.uk/p/mix-and-match/gisou-hair-perfume-wildflower-honey", image_url: "/gisou-hair-perfume-minis-bee-garden.jpg" },
  { key: "gisou-hair-perfume-wild-rose", brand: "Gisou", name: "Honey Infused Hair Perfume 15ml — Wild Rose (Bee Garden Mini)", category: "Fragrance", promoUsd: 30,
    product_url: "https://seasonsbyb.co.uk/p/mix-and-match/gisou-hair-perfume-wild-rose", image_url: "/gisou-hair-perfume-minis-bee-garden.jpg" },
  { key: "gisou-hair-perfume-lavender-berry", brand: "Gisou", name: "Honey Infused Hair Perfume 15ml — Lavender Berry (Bee Garden Mini)", category: "Fragrance", promoUsd: 30,
    product_url: "https://seasonsbyb.co.uk/p/mix-and-match/gisou-hair-perfume-lavender-berry", image_url: "/gisou-hair-perfume-minis-bee-garden.jpg" },

  // ---- Existing rows, repriced to promo ----
  { key: "milk-jelly-lip-kit", existingId: "3fcf4a82-45a5-4cc2-9f0e-000000000000", brand: "Milk Makeup", name: "The Jelly Lip Kit - Lip Stain & Lip Oil Duo", category: "Makeup", promoUsd: 30,
    product_url: "", image_url: "/milk-makeup-jelly-lip-kit.jpg" },
  { key: "rare-beauty-find-comfort-mist", existingId: "2deb4629-0000-0000-0000-000000000000", brand: "Rare Beauty", name: "Find Comfort Fragrance Mist", category: "Fragrance", promoUsd: 25,
    product_url: "", image_url: "/rare-beauty-find-comfort-fragrance-mist.jpg" },

  // ---- New rows ----
  { key: "sol-danca-mistica", brand: "Sol de Janeiro", name: "Dança Mística Perfume Mist 90ml", category: "Fragrance", promoUsd: 25,
    product_url: "https://www.soldejaneiro.com/products/danca-mistica-perfume-mist", image_url: "/sol-de-janeiro-danca-mistica-mist.jpg" },
  { key: "sephora-blush-trio-candy-lover", brand: "Sephora Collection", name: "Blush Blush Blush Trio of Blushes — Candy Lover", category: "Makeup", promoUsd: 25,
    product_url: "https://seasonsbyb.co.uk/p/mix-and-match/sephora-blush-blush-blush-candy-lover", image_url: "/sephora-blush-blush-blush-trio.jpg" },
  { key: "sephora-x-waad-shaat", brand: "Sephora Collection", name: "Sephora x Waad Shaat Makeup Set", category: "Makeup", promoUsd: 30,
    product_url: "https://seasonsbyb.co.uk/p/mix-and-match/sephora-x-waad-shaat", image_url: "/sephora-x-waad-shaat.jpg" },
  { key: "fenty-mini-killawatt-wattabrat", brand: "Fenty Beauty", name: "Mini Killawatt Freestyle Highlighter — WattaBrat", category: "Makeup", promoUsd: 25,
    product_url: "https://fentybeauty.com/products/mini-killawatt-freestyle-highlighter-wattabrat", image_url: "/fenty-mini-killawatt-wattabrat.jpg" },
  { key: "tarte-maracuja-juicy-lip-plump-pink", brand: "Tarte", name: "Maracuja Juicy Lip Plump — Pink", category: "Makeup", promoUsd: 25,
    product_url: "https://seasonsbyb.co.uk/p/mix-and-match/tarte-maracuja-juicy-lip-plump-pink", image_url: "/tarte-maracuja-juicy-lip-plump-pink.jpg" },
  { key: "fenty-match-stix-duo-mocha-i-scream", brand: "Fenty Beauty", name: "Match Stix Duo Contour + Highlighter — Mocha / I Scream", category: "Makeup", promoUsd: 40,
    product_url: "https://seasonsbyb.co.uk/p/mix-and-match/fenty-match-stix-duo-mocha-i-scream", image_url: "/fenty-match-stix-duo-mocha-i-scream.jpg" },
  { key: "huda-faux-filler-extra-shine-she-fire", brand: "Huda Beauty", name: "FAUX FILLER Extra Shine — She Fire", category: "Makeup", promoUsd: 25,
    product_url: "https://seasonsbyb.co.uk/p/mix-and-match/huda-faux-filler-extra-shine-she-fire", image_url: "/huda-faux-filler-extra-shine-she-fire.jpg" }
];

async function main(): Promise<void> {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL is not set.");
    process.exit(1);
  }
  await ensureSchema();
  const sql = getSql();

  const results: Array<{ key: string; id: string; promoUsd: number }> = [];

  for (const r of ROWS) {
    const promoGbp = gbp(r.promoUsd);
    let id: string;

    if (r.existingId) {
      // Reprice an existing row by id-prefix match (ids in this file are truncated).
      const prefix = r.existingId.slice(0, 8);
      const rows = (await sql`
        update products set
          price_usd = ${r.promoUsd},
          price_gbp = ${promoGbp},
          image_url = ${r.image_url},
          images = ${JSON.stringify([r.image_url])}::jsonb,
          price_locked = true,
          scraped_at = now()
        where id::text like ${prefix + "%"}
        returning id
      `) as Array<{ id: string }>;
      if (rows.length !== 1) {
        console.error(`  !! expected 1 row for ${r.key} (prefix ${prefix}), got ${rows.length}`);
        process.exit(1);
      }
      id = rows[0].id;
      console.log(`REPRICED  ${r.brand} — ${r.name} -> $${r.promoUsd}  (${id})`);
    } else {
      const rows = (await sql`
        insert into products (
          brand, name, category, price_gbp, price_usd, deliverable_lebanon,
          product_url, image_url, images, price_locked
        )
        values (
          ${r.brand}, ${r.name}, ${r.category}, ${promoGbp}, ${r.promoUsd}, true,
          ${r.product_url}, ${r.image_url}, ${JSON.stringify([r.image_url])}::jsonb, true
        )
        on conflict (product_url) do update set
          brand = excluded.brand,
          name = excluded.name,
          category = excluded.category,
          price_gbp = excluded.price_gbp,
          price_usd = excluded.price_usd,
          deliverable_lebanon = true,
          image_url = excluded.image_url,
          images = excluded.images,
          price_locked = true,
          scraped_at = now()
        returning id
      `) as Array<{ id: string }>;
      id = rows[0].id;
      console.log(`OK        ${r.brand} — ${r.name} -> $${r.promoUsd}  (${id})`);
    }

    results.push({ key: r.key, id, promoUsd: r.promoUsd });
  }

  // ---- Emit config blocks ----
  console.log("\n\n// ===== lib/mix-and-match.ts — MIX_AND_MATCH entries =====");
  for (const x of results) {
    const retailUsd = x.promoUsd * 2;
    console.log(
      `  "${x.id}": { promoUsd: ${x.promoUsd}, promoGbp: ${gbp(x.promoUsd)}, retailUsd: ${retailUsd}, retailGbp: ${gbp(retailUsd)} }, // ${x.key}`
    );
  }

  console.log("\n// ===== lib/promotions.ts — PROMOS entries =====");
  for (const x of results) {
    console.log(`  "${x.id}": { compareAtUsd: ${x.promoUsd * 2}, label: "Any 4 for this price" }, // ${x.key}`);
  }

  console.log("\n// ===== lib/home-promos.ts — productIds =====");
  console.log("  " + results.map((x) => `"${x.id}"`).join(",\n  "));
}

main().catch((err) => {
  console.error("Build failed:", err);
  process.exit(1);
});
