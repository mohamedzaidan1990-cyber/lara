/**
 * Remove non-beauty items that the designer brand-page crawl pulled in
 * (handbags, leather goods, shoes, clothing, scarves, belts, candles, incense,
 * homeware). Word-boundary matched with a protection list so genuine beauty
 * items are kept: makeup/wash/beauty bags, vanity cases, brushes, hair
 * diffusers, foot/heel-balm, "Watch Ya Tone" etc.
 *
 * Run:  npx ts-node scripts/remove-fashion-home.ts
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
function load(f: string): void { let t: string; try { t = readFileSync(resolve(process.cwd(), f), "utf8"); } catch { return; } for (const raw of t.split(/\r?\n/)) { const l = raw.trim(); if (!l || l.startsWith("#")) continue; const e = l.indexOf("="); if (e < 0) continue; const k = l.slice(0, e).trim(); if (!process.env[k]) process.env[k] = l.slice(e + 1).trim().replace(/^['"]|['"]$/g, ""); } }
load(".env.local"); load(".env");
import { getSql } from "../lib/db";

const NONBEAUTY = "\\y(handbag|tote bag|tote|clutch|crossbody|cross-?body|shoulder[ -]?bag|bowling bag|backpack|satchel|bags?|wallet|purse|coin case|card[ -]?holder|belt|watch|watches|sunglasses|necklace|bracelet|anklet|earrings?|jewell?ery|pendant|brooch|cufflinks?|keyring|key[ -]?ring|scarf|scarves|gloves|beanie|shawl|umbrella|candle|diffuser|incense|vase|homeware|trinket|notebook|passport|luggage|suitcase|sneakers?|trainers?|loafers?|sandals?|stilettos?|shoes|boots|dress|skirt|trousers|jeans|t-?shirt|sweater|cardigan|hoodie|blazer|jacket|knitwear|teddy)\\y";
const PROTECT = "makeup bag|cosmetic bag|wash bag|toiletry|vanity case|brush bag|make-?up bag|beauty bag|organiser|pouch|ring light|heel balm|heel cream|cracked heel|foot|hair diffuser|curly hair|diffuser attachment|watch ya|watch your|trial kit";

async function main(): Promise<void> {
  const sql = getSql();
  const before = (await sql`select count(*)::int as n from products`) as Array<{ n: number }>;
  if (before[0].n < 1000) { console.error(`Refusing: only ${before[0].n} products.`); process.exit(1); }

  const deleted = (await sql`
    delete from products
    where name ~* ${NONBEAUTY} and name !~* ${PROTECT}
    returning brand, name
  `) as Array<{ brand: string; name: string }>;
  const after = (await sql`select count(*)::int as n from products`) as Array<{ n: number }>;

  console.log(`Removed ${deleted.length} non-beauty (fashion/home) products.`);
  console.log(`Products: ${before[0].n} -> ${after[0].n}`);
  const byBrand: Record<string, number> = {};
  for (const r of deleted) byBrand[r.brand] = (byBrand[r.brand] || 0) + 1;
  console.log("By brand:", Object.entries(byBrand).sort((a, b) => b[1] - a[1]).slice(0, 12).map(([b, n]) => `${b}(${n})`).join(", "));
}
main().catch((e) => { console.error("remove-fashion-home failed:", e.message); process.exit(1); });
