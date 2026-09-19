/**
 * Holiday Edit — batch 2: the remaining 27 gift sets from Sephora Middle East
 * (Qatar) — 14 Sephora Collection + 13 Benefit — at the USD prices set by the
 * user. Follows scripts/add-holiday-edit-products.ts (batch 1).
 *
 * - price_usd is the user's written price; price_gbp is a derived reference
 *   value (usd / 1.3).
 * - Images were downloaded from img-product.sephora.me (not in the image-proxy
 *   allowlist) and are self-hosted in public/<slug>.jpg.
 * - Descriptions are condensed from the Sephora ME product pages (or, where
 *   the page had none, written from the product photo).
 *
 * Idempotent (upserts on product_url). Prints each product's id so the ids can
 * be pasted into lib/holiday-collection.ts.
 *
 * Run:  npx ts-node scripts/add-holiday-edit-products-2.ts
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
    "brand": "Sephora Collection",
    "name": "Too Hot to Miss 5 Makeup Top Picks",
    "category": "Makeup",
    "price_usd": 84,
    "product_url": "https://www.sephora.me/qa-en/p/too-hot-to-miss-5-makeup-top-picks/P1000215857",
    "image_url": "/sephora-collection-too-hot-to-miss-5-makeup-top-picks.jpg",
    "description": "5 trendy makeup essentials in a glittery pouch: Size Up mascara in Brown, Fluff & Fix brow setting wax, a blush, a makeup setting spray and a gloss balm."
  },
  {
    "brand": "Sephora Collection",
    "name": "Mask Mania 20 Masks from Head to Toe",
    "category": "Skincare",
    "price_usd": 92,
    "product_url": "https://www.sephora.me/qa-en/p/mask-mania-20-masks-from-head-to-toe/P1000215837",
    "image_url": "/sephora-collection-mask-mania-20-masks-from-head-to-toe.jpg",
    "description": "20 masks in one limited-edition skincare gift set with a sequined pouch. Face, eyes, lips, nose, feet, hands and hair: no area is forgotten."
  },
  {
    "brand": "Sephora Collection",
    "name": "Makeup Setting Duo",
    "category": "Makeup",
    "price_usd": 47,
    "product_url": "https://www.sephora.me/qa-en/p/makeup-setting-duo/P1000215848",
    "image_url": "/sephora-collection-makeup-setting-duo.jpg",
    "description": "Two Sephora Collection makeup setting sprays, one full-size and one travel size, with an ultra-fine mist that sets makeup and keeps a fresh complexion all day."
  },
  {
    "brand": "Sephora Collection",
    "name": "Size Up Squad Mascara Trio",
    "category": "Makeup",
    "price_usd": 62,
    "product_url": "https://www.sephora.me/qa-en/p/size-up-squad-mascara-trio/P1000215842",
    "image_url": "/sephora-collection-size-up-squad-mascara-trio.jpg",
    "description": "Three Size Up mascaras in one holiday set, so you can change your look: an intense look, natural color or waterproof wear. Size Up gives lashes an oversized, fuller, longer, curled fringe in a few strokes."
  },
  {
    "brand": "Sephora Collection",
    "name": "Beauty Break Set 4 Skincare Must-Haves",
    "category": "Skincare",
    "price_usd": 60,
    "product_url": "https://www.sephora.me/qa-en/p/beauty-break-set-4-skincare-must-haves/P1000215840",
    "image_url": "/sephora-collection-beauty-break-set-4-skincare-must-haves.jpg",
    "description": "A complete facial skincare routine in a glittery pouch: a cleansing gel, a serum, a mask and a nourishing finishing step, all Sephora Collection must-haves."
  },
  {
    "brand": "Sephora Collection",
    "name": "Premium Advent Calendar 24 Surprises in a Vanity Case",
    "category": "Makeup",
    "price_usd": 169,
    "product_url": "https://www.sephora.me/qa-en/p/premium-advent-calendar-24-surprises-in-a-vanity-case/P1000215402",
    "image_url": "/sephora-collection-premium-advent-calendar-24-surprises-in-a-vanity-case.jpg",
    "description": "The 2026 Sephora Collection Premium Advent Calendar: a sequined vanity case holding 24 surprises to open from December 1 to December 24, bringing together makeup and skincare essentials in generous formats."
  },
  {
    "brand": "Sephora Collection",
    "name": "MIST & Match Mini Perfume Mist Trio",
    "category": "Fragrance",
    "price_usd": 46,
    "product_url": "https://www.sephora.me/qa-en/p/mist-match-mini-perfume-mist-trio/P1000215844",
    "image_url": "/sephora-collection-mist-match-mini-perfume-mist-trio.jpg",
    "description": "Three mini body and hair mists in a festive pouch: Bamboo + Rose, Vanilla + Almond Milk and Cherry + Whipped Cream. Wear them as you like, according to your mood."
  },
  {
    "brand": "Sephora Collection",
    "name": "Gloss Balm Trio 3 Tinted Lip Balms, Including 1 Exclusive Shade",
    "category": "Makeup",
    "price_usd": 52,
    "product_url": "https://www.sephora.me/qa-en/p/gloss-balm-trio-3-tinted-lip-balms-including-1-exclusive-shade/P1000215843",
    "image_url": "/sephora-collection-gloss-balm-trio-3-tinted-lip-balms.jpg",
    "description": "Three full-size tinted gloss balms: two iconic shades, pink and mauve, plus a brand-new limited-edition beige taupe made for the holidays. Nourished lips with a delicately glossy finish."
  },
  {
    "brand": "Sephora Collection",
    "name": "Retractable Eyepen Duo 1 Black Pencil and 1 Brown Pencil",
    "category": "Makeup",
    "price_usd": 38,
    "product_url": "https://www.sephora.me/qa-en/p/retractable-eyepen-duo-1-black-pencil-and-1-brown-pencil/P1000215874",
    "image_url": "/sephora-collection-retractable-eyepen-duo.jpg",
    "description": "Two waterproof retractable eyeliners with an ultra-creamy texture, one deep black and one intense brown. They apply easily and blend effortlessly, from precise lines to smoky finishes."
  },
  {
    "brand": "Sephora Collection",
    "name": "Blush Blush Glow Set",
    "category": "Makeup",
    "price_usd": 58,
    "product_url": "https://www.sephora.me/qa-en/p/blush-blush-glow-set/P1000215855",
    "image_url": "/sephora-collection-blush-blush-glow-set.jpg",
    "description": "A blush and highlighter palette with a dual-ended brush: a multi-use cream blush, a matte powder blush and a luminous powder highlighter for the cheeks."
  },
  {
    "brand": "Sephora Collection",
    "name": "Advent Calendar 24 Makeup, Skincare, and Accessories Surprises",
    "category": "Makeup",
    "price_usd": 115,
    "product_url": "https://www.sephora.me/qa-en/p/advent-calendar-24-makeup-skincare-and-accessories-surprises/P1000215401",
    "image_url": "/sephora-collection-advent-calendar-24-makeup-skincare-and-accessories.jpg",
    "description": "A Sephora Collection advent calendar with a new surprise every day for 24 days: iconic makeup, face and body care, and essential accessories."
  },
  {
    "brand": "Sephora Collection",
    "name": "The Selfcare Edit 8 Skincare Masks from Head to Toe",
    "category": "Skincare",
    "price_usd": 57,
    "product_url": "https://www.sephora.me/qa-en/p/the-selfcare-edit-8-skincare-masks-from-head-to-toe/P1000215839",
    "image_url": "/sephora-collection-the-selfcare-edit-8-skincare-masks.jpg",
    "description": "8 masks to pamper you from head to toe, for the face, eye contour, hair and feet. A selection to brighten, purify, soothe and target dark circles."
  },
  {
    "brand": "Sephora Collection",
    "name": "Cheek and Lip Tint Duo 2 Shades: Red and Burgundy",
    "category": "Makeup",
    "price_usd": 47,
    "product_url": "https://www.sephora.me/qa-en/p/cheek-and-lip-tint-duo-2-shades-red-and-burgundy/P1000215869",
    "image_url": "/sephora-collection-cheek-and-lip-tint-duo.jpg",
    "description": "A 2-in-1 duo in red and burgundy that colors cheeks and lips in one step. The light, buildable texture applies with your fingertips for a natural veil of color and a transfer-proof finish, in a sparkly pouch."
  },
  {
    "brand": "Sephora Collection",
    "name": "Lash & Brow Duo",
    "category": "Makeup",
    "price_usd": 46,
    "product_url": "https://www.sephora.me/qa-en/p/lash-brow-duo/P1000215847",
    "image_url": "/sephora-collection-lash-brow-duo.jpg",
    "description": "An eye and eyebrow duo: Size Up mascara for fuller, well-defined lashes and Fluff & Fix eyebrow wax to tame, texturize and set brows with a long-lasting laminated effect."
  },
  {
    "brand": "Benefit Cosmetics",
    "name": "BADgal Party Co. Mini Volumizing Lash Duo",
    "category": "Makeup",
    "price_usd": 39,
    "product_url": "https://www.sephora.me/qa-en/p/badgal-party-co-mini-volumizing-lash-duo/P10064667",
    "image_url": "/benefit-badgal-party-co-mini-volumizing-lash-duo.jpg",
    "description": "A mini mascara duo for the holiday party: BADgal BANG! volumizing and lengthening mascara for bold drama, and BADgal Bounce mascara for full, fluffy lashes."
  },
  {
    "brand": "Benefit Cosmetics",
    "name": "Lash & Bronze Duo",
    "category": "Makeup",
    "price_usd": 109,
    "product_url": "https://www.sephora.me/qa-en/p/lash-bronze-duo/Benefit-Bundle2",
    "image_url": "/benefit-lash-bronze-duo.jpg",
    "description": "A lash and bronze duo pairing BADgal BANG! volumizing mascara with Hoola matte bronzer, in a bright pink zip pouch."
  },
  {
    "brand": "Benefit Cosmetics",
    "name": "The Brow Booth Full-Size & Mini Brow Trio",
    "category": "Makeup",
    "price_usd": 72,
    "product_url": "https://www.sephora.me/qa-en/p/the-brow-booth-full-size-mini-brow-trio/P10064661",
    "image_url": "/benefit-the-brow-booth-full-size-mini-brow-trio.jpg",
    "description": "Camera-ready brows in a full-size and mini trio: Precisely, My Brow Pencil to define with natural, hair-like strokes, Precisely, My Brow Wax to shape and tame with rich color, and 24-HR Brow Setter for flake-free, all-day hold."
  },
  {
    "brand": "Benefit Cosmetics",
    "name": "Beauty Star Cinema Full-Size & Mini Must-Haves",
    "category": "Makeup",
    "price_usd": 107,
    "product_url": "https://www.sephora.me/qa-en/p/beauty-star-cinema-full-size-mini-must-haves/P10064657",
    "image_url": "/benefit-beauty-star-cinema-full-size-mini-must-haves.jpg",
    "description": "Full-size and mini Benefit favorites in a striped bucket bag: Benetint lip & cheek stain, Hoola matte powder bronzer, BADgal Bounce volumizing mascara, The POREfessional Super Setter setting spray and 24-HR Brow Setter clear brow gel."
  },
  {
    "brand": "Benefit Cosmetics",
    "name": "Beneville Fruit Stand Mini Lash & Brow Duo",
    "category": "Makeup",
    "price_usd": 44,
    "product_url": "https://www.sephora.me/qa-en/p/beneville-fruit-stand-mini-lash-brow-duo/P10064660",
    "image_url": "/benefit-beneville-fruit-stand-mini-lash-brow-duo.jpg",
    "description": "A mini lash and brow duo: BADgal BANG! volumizing mascara in Intense Pitch Black for bigger, bolder lashes, and 24-HR Brow Setter clear brow gel for crunch-free, flake-free hold."
  },
  {
    "brand": "Benefit Cosmetics",
    "name": "The Lash Scoop Volumizing Mascara Duo",
    "category": "Makeup",
    "price_usd": 68,
    "product_url": "https://www.sephora.me/qa-en/p/the-lash-scoop-volumizing-mascara-duo/P10064666",
    "image_url": "/benefit-the-lash-scoop-volumizing-mascara-duo.jpg",
    "description": "A double batch of Benefit's most popular volumizing mascara: BADgal BANG! and BADgal BANG! Waterproof, the same volumizing formula in original and waterproof, in ice-cream-themed packaging."
  },
  {
    "brand": "Benefit Cosmetics",
    "name": "You've Got Benetint Limited-Edition Tint Duo",
    "category": "Makeup",
    "price_usd": 54,
    "product_url": "https://www.sephora.me/qa-en/p/you-ve-got-benetint-limited-edition-tint-duo/P10064658",
    "image_url": "/benefit-youve-got-benetint-limited-edition-tint-duo.jpg",
    "description": "A limited-edition Benetint duo: the bestselling Original Rose and a new limited-edition Cinnamon shade made for the holidays, for a sheer, buildable flush on lips and cheeks."
  },
  {
    "brand": "Benefit Cosmetics",
    "name": "Tint & Define Duo",
    "category": "Makeup",
    "price_usd": 79,
    "product_url": "https://www.sephora.me/qa-en/p/tint-define-duo/Benefit-Bundle3",
    "image_url": "/benefit-tint-define-duo.jpg",
    "description": "A tint and brow duo: Benetint rose-tinted lip & cheek stain and 24-HR Brow Setter clear brow gel, in a bright pink zip pouch."
  },
  {
    "brand": "Benefit Cosmetics",
    "name": "Beauty Bus Stop Mini Cheek Palette",
    "category": "Makeup",
    "price_usd": 58,
    "product_url": "https://www.sephora.me/qa-en/p/beauty-bus-stop-mini-cheek-palette/P10064662",
    "image_url": "/benefit-beauty-bus-stop-mini-cheek-palette.jpg",
    "description": "A mini cheek palette in a bus-shaped compact: Hoola powder bronzer in Original for sun-kissed warmth, Willa soft neutral-rose blush for a petal-like flush, and Cookie for a buildable golden glow."
  },
  {
    "brand": "Benefit Cosmetics",
    "name": "The Hotel Beneville 24-Day Beauty Advent Calendar",
    "category": "Makeup",
    "price_usd": 235,
    "product_url": "https://www.sephora.me/qa-en/p/the-hotel-beneville-24-day-beauty-advent-calendar/P10064656",
    "image_url": "/benefit-the-hotel-beneville-24-day-beauty-advent-calendar.jpg",
    "description": "A 24-day beauty advent calendar with an all-access pass to Beneville's holiday hotspot: bestselling beauty, iconic favorites and a few VIP-only surprises behind every door."
  },
  {
    "brand": "Benefit Cosmetics",
    "name": "Rhythm & Beauty Radio Full-Size & Mini Bestsellers Trio",
    "category": "Makeup",
    "price_usd": 74,
    "product_url": "https://www.sephora.me/qa-en/p/rhythm-beauty-radio-full-size-mini-bestsellers-trio/P10064669",
    "image_url": "/benefit-rhythm-beauty-radio-full-size-mini-bestsellers-trio.jpg",
    "description": "A full-size and mini bestsellers trio in a radio-shaped box: BADgal BANG! volumizing mascara, Benetint rose-tinted lip & cheek stain and 24-HR Brow Setter clear brow gel."
  },
  {
    "brand": "Benefit Cosmetics",
    "name": "BADgal Hypetower Lash & Liner Duo",
    "category": "Makeup",
    "price_usd": 63,
    "product_url": "https://www.sephora.me/qa-en/p/badgal-hypetower-lash-liner-duo/P10064664",
    "image_url": "/benefit-badgal-hypetower-lash-liner-duo.jpg",
    "description": "A lash and liner duo built around BADgal BANG! volumizing mascara and the new BADgal Hypeliner gel eyeliner for budge-proof color, in a pink tower-shaped gift pack."
  },
  {
    "brand": "Benefit Cosmetics",
    "name": "The Beneville Times Lip & Lash Trio",
    "category": "Makeup",
    "price_usd": 72,
    "product_url": "https://www.sephora.me/qa-en/p/the-beneville-times-lip-lash-trio/P10064659",
    "image_url": "/benefit-the-beneville-times-lip-lash-trio.jpg",
    "description": "A lip and lash trio: BADgal BANG! volumizing mascara, Benetint rose-tinted lip & cheek stain in Original Rose and the returning limited-edition Beneglaze nourishing rose-tinted lip gloss."
  }
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
}

main().catch((err) => {
  console.error("Failed:", err);
  process.exit(1);
});
