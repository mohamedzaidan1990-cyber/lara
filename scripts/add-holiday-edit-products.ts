/**
 * Holiday Edit — batch 1: 9 gift sets from Sephora Middle East (Qatar) —
 * 7 Tarte + 2 Sephora Collection — at the USD prices set by the user, plus
 * two catalogue repricings for the same holiday push.
 *
 * - price_usd is the user's written price; price_gbp is a derived reference
 *   value (usd / 1.3, same as the other recent manual imports).
 * - Images were downloaded from img-product.sephora.me (not in the image-proxy
 *   allowlist) and are self-hosted in public/<slug>.jpg.
 * - Descriptions are condensed from the Sephora ME product pages.
 * - Repricing: Benebingo 81 -> 87 and BAD & Bouncy Volumizing Mascara Duo
 *   61 -> 62, per user. price_gbp keeps those rows' existing ratio (usd/1.27).
 *
 * Idempotent (upserts on product_url). Prints each product's id so the ids can
 * be pasted into lib/holiday-collection.ts.
 *
 * Run:  npx ts-node scripts/add-holiday-edit-products.ts
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
  price_usd: number;
  product_url: string;
  image_url: string;
  description: string;
}

const PRODUCTS: ProductSeed[] = [
  {
    "brand": "Tarte",
    "name": "Face Card Never Declines CC Undereye & Brush",
    "category": "Makeup",
    "price_usd": 48,
    "product_url": "https://www.sephora.me/qa-en/p/face-card-never-declines-cc-undereye-brush/P10064863",
    "image_url": "/tarte-face-card-never-declines-cc-undereye-brush.jpg",
    "description": "The limited-edition viral CC undereye color corrector with a bonus brush, for dark circle defense. Dark circles? Redness? Blemishes? You're covered."
  },
  {
    "brand": "Tarte",
    "name": "Front Row Energy Travel Essentials",
    "category": "Makeup",
    "price_usd": 59,
    "product_url": "https://www.sephora.me/qa-en/p/front-row-energy-travel-essentials/P10064864",
    "image_url": "/tarte-front-row-energy-travel-essentials.jpg",
    "description": "A holiday gift set of 3 best-selling minis: a limited-edition Amazonian clay eyeshadow palette in pinks and golds with a reusable charm, tartelette™ tubing mascara with a limited-edition iced-out cap, and the maracuja juicy lip balm. Comes in a giftable box with a to & from tag."
  },
  {
    "brand": "Tarte",
    "name": "SPOTTED: The Icons Best-Sellers Set",
    "category": "Makeup",
    "price_usd": 59,
    "product_url": "https://www.sephora.me/qa-en/p/spotted-the-icons-best-sellers-set/P10064866",
    "image_url": "/tarte-spotted-the-icons-best-sellers-set.jpg",
    "description": "Two icons in one gift: shape tape™ full-coverage concealer (light neutral, 10 ml) and tartelette™ tubing mascara (black, 8 ml) with a limited-edition iced-out cap. Comes in a clear reusable pouch topped with a pearl charm to clip onto a mascara, bag, keychain or phone case."
  },
  {
    "brand": "Tarte",
    "name": "You Know You Love Me Collector's Set",
    "category": "Makeup",
    "price_usd": 79,
    "product_url": "https://www.sephora.me/qa-en/p/you-know-you-love-me-collector-s-set/P10064868",
    "image_url": "/tarte-you-know-you-love-me-collectors-set.jpg",
    "description": "An 8-piece giftable collector's set: 2 mascaras (tartelette™ tubing and maneater™), 2 maracuja juicy lips in shimmering rosy copper plump and coconut vinyl, and 2 mini Amazonian clay eyeshadow palettes in warm golden shades and cool rosy neutrals. Each palette comes with a reusable wristlet clutch with a gold chain, sized for an ID and a credit card."
  },
  {
    "brand": "Tarte",
    "name": "Eyes on Me Mascara & Liner Clutch",
    "category": "Makeup",
    "price_usd": 63,
    "product_url": "https://www.sephora.me/qa-en/p/eyes-on-me-mascara-liner-clutch/P10064862",
    "image_url": "/tarte-eyes-on-me-mascara-liner-clutch.jpg",
    "description": "4 full-size best-sellers plus a bonus reusable clutch: tartelette™ tubing lash primer, tartelette™ tubing mascara and tartelette™ XL tubing mascara (each removes in tubes with warm water), and an ultra-thin waterproof slanted liner. The clutch is sized to fit a phone, ID, credit card and touch-ups."
  },
  {
    "brand": "Tarte",
    "name": "Don't Kiss & Tell Maracuja Juicy Lip Trio",
    "category": "Makeup",
    "price_usd": 54,
    "product_url": "https://www.sephora.me/qa-en/p/don-t-kiss-tell-maracuja-juicy-lip-trio/P10064861",
    "image_url": "/tarte-dont-kiss-tell-maracuja-juicy-lip-trio.jpg",
    "description": "A trio of viral maracuja juicy lips with limited-edition blinged-out caps: plump in cherry blossom, balm in rose and vinyl in shimmering mixed berries. A 10+ superfruit complex and maracuja leave lips looking smoother and softer. Gift all three or keep them, with a to & from tag included."
  },
  {
    "brand": "Tarte",
    "name": "XOXO Blush & Glow™ Macaron Trio",
    "category": "Makeup",
    "price_usd": 52,
    "product_url": "https://www.sephora.me/qa-en/p/xoxo-blush-glow-macaron-trio/P10064867",
    "image_url": "/tarte-xoxo-blush-glow-macaron-trio.jpg",
    "description": "Three limited-edition mini macaron blushes, each a cream and baked radiant blush duo in new shades, to wear solo or stacked. The tarte blend bar™ doubles as a divider and a mixing ledge. Comes in a giftable ornament box with a to & from tag."
  },
  {
    "brand": "Sephora Collection",
    "name": "Feeling Cherry Lip & Hand Cherry Duo",
    "category": "Makeup",
    "price_usd": 37,
    "product_url": "https://www.sephora.me/qa-en/p/feeling-cherry-lip-hand-cherry-duo/P1000215863",
    "image_url": "/sephora-collection-feeling-cherry-lip-hand-cherry-duo.jpg",
    "description": "A cherry-scented hand cream and moisturizing lip oil duo in a mini tinsel pouch with a shimmering festive finish. Two Sephora Collection essentials, small enough to keep close all winter."
  },
  {
    "brand": "Sephora Collection",
    "name": "Outrageous Charm Outrageous Plump Effect",
    "category": "Makeup",
    "price_usd": 32,
    "product_url": "https://www.sephora.me/qa-en/p/outrageous-charm-outrageous-plump-effect/P1000215866",
    "image_url": "/sephora-collection-outrageous-charm-outrageous-plump-effect.jpg",
    "description": "The Outrageous Plump Effect Gloss in an exclusive Christmas shade: a brown with iridescent pink highlights for an instant plumping effect and a glossy finish. Comes with a reinvented charm, a burgundy case with a limited-edition sparkling pompom."
  }
];

const REPRICE: Array<{ product_url: string; price_usd: number }> = [
  { product_url: "https://www.benefitcosmetics.com/products/benebingo", price_usd: 87 },
  { product_url: "https://www.benefitcosmetics.com/products/bad-bouncy-volumizing-mascara-duo", price_usd: 62 }
];

const round2 = (n: number): number => Math.round(n * 100) / 100;

async function main(): Promise<void> {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL is not set.");
    process.exit(1);
  }
  await ensureSchema();
  const sql = getSql();

  for (const p of PRODUCTS) {
    const gbp = round2(p.price_usd / 1.3);
    const rows = (await sql`
      insert into products (
        brand, name, category, price_gbp, price_usd, deliverable_lebanon,
        product_url, image_url, images, description, price_locked
      )
      values (
        ${p.brand}, ${p.name}, ${p.category}, ${gbp}, ${p.price_usd}, true,
        ${p.product_url}, ${p.image_url}, ${JSON.stringify([p.image_url])}::jsonb,
        ${p.description}, true
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
        description = excluded.description,
        price_locked = true,
        archived = false,
        scraped_at = now()
      returning id
    `) as Array<{ id: string }>;
    console.log(`OK  ${rows[0].id}  ${p.brand} — ${p.name} — $${p.price_usd}`);
  }

  for (const r of REPRICE) {
    const before = (await sql`select price_usd::float8 as usd from products where product_url = ${r.product_url}`) as Array<{ usd: number }>;
    const rows = (await sql`
      update products
      set price_usd = ${r.price_usd}, price_gbp = ${round2(r.price_usd / 1.27)}, price_locked = true
      where product_url = ${r.product_url}
      returning id, name
    `) as Array<{ id: string; name: string }>;
    if (rows.length !== 1) throw new Error(`Expected to reprice exactly 1 row for ${r.product_url}, got ${rows.length}`);
    console.log(`REPRICED  ${rows[0].id}  ${rows[0].name}: $${before[0]?.usd} -> $${r.price_usd}`);
  }
}

main().catch((err) => {
  console.error("Failed:", err);
  process.exit(1);
});
