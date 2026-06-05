/**
 * Remove non-beauty items: pure non-beauty brands (Selfridges tech sub-brands +
 * kids craft), designer footwear/bags/clothing, electronics, and home goods.
 * Tightened word-boundary regex + protections so real beauty is never deleted
 * (cushion foundation, plush/vinyl lip products, ghd plates, EyeWear eyeshadow,
 * makeup/wash bags, foot/heel balm, hair diffusers, eye-bag treatments).
 *
 * Run:  npx ts-node scripts/remove-non-beauty-v2.ts
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
function load(f: string): void { let t: string; try { t = readFileSync(resolve(process.cwd(), f), "utf8"); } catch { return; } for (const raw of t.split(/\r?\n/)) { const l = raw.trim(); if (!l || l.startsWith("#")) continue; const e = l.indexOf("="); if (e < 0) continue; const k = l.slice(0, e).trim(); if (!process.env[k]) process.env[k] = l.slice(e + 1).trim().replace(/^['"]|['"]$/g, ""); } }
load(".env.local"); load(".env");
import { getSql } from "../lib/db";

const NB_BRANDS = ["smartech", "the tech bar", "omy"];
const NB = "\\y(shoes?|sneakers?|trainers?|loafers?|sandals?|mules?|espadrilles?|ballerinas?|brogues?|slingbacks?|stilettos?|moccasins?|clogs?|pumps|courts?|heeled|booties?|boots?|slides|handbag|tote|clutch|crossbody|cross-?body|shoulder[ -]?bag|bowling bag|backpack|satchel|bags?|wallet|purse|card[ -]?holder|cardholder|luggage|suitcase|holdall|belt|watches|sunglasses|necklace|bracelet|anklet|earrings?|jewell?ery|pendant|brooch|cufflinks?|keyring|scarf|scarves|fisherman hat|dress|skirt|trousers|jeans|t-?shirt|sweater|cardigan|hoodie|blazer|jacket|jumper|leggings|camera|headphones?|earphones?|earbuds?|airpods?|smartphone|phone case|power ?bank|projector|turntable|bath towel|cushion cover|soap plate|stoneware mug|incense|reed diffuser)\\y";
const PROTECT = "makeup bag|cosmetic bag|wash bag|toiletry|vanity case|brush bag|make-?up bag|beauty bag|organiser|pouch|eye bag|trial kit";
const WHITE_HOME = "\\y(towel|duvet|cushion cover|pillowcase|stoneware|porcelain|soap (plate|dish)|ceramic|mug|bedding|blanket|throw|goose-down|tog)\\y";

async function main(): Promise<void> {
  const sql = getSql();
  const before = (await sql`select count(*)::int as n from products`) as Array<{ n: number }>;
  const deleted = (await sql`
    delete from products
    where lower(brand) = any(${NB_BRANDS})
       or (name ~* ${NB} and name !~* ${PROTECT})
       or (lower(brand) = 'the white company' and name ~* ${WHITE_HOME})
    returning brand
  `) as Array<{ brand: string }>;
  const after = (await sql`select count(*)::int as n from products`) as Array<{ n: number }>;
  const byBrand: Record<string, number> = {};
  for (const r of deleted) byBrand[r.brand] = (byBrand[r.brand] || 0) + 1;
  console.log(`Removed ${deleted.length} non-beauty products.`);
  console.log(`Products: ${before[0].n} -> ${after[0].n}`);
  console.log("By brand:", Object.entries(byBrand).sort((a, b) => b[1] - a[1]).slice(0, 14).map(([b, n]) => `${b}(${n})`).join(", "));
}
main().catch((e) => { console.error("cleanup failed:", e.message); process.exit(1); });
