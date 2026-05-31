/**
 * Cleanup: remove mis-priced products (wrong-currency conversions) and any
 * remaining non-beauty items. Pricing bounds are applied verbatim; the
 * non-beauty name filters use word boundaries + protective exceptions so
 * legitimate beauty terms ("glass skin", "ring light", the Hourglass brand)
 * are never deleted.
 *
 * Run:  npx ts-node scripts/clean-pricing.ts
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
function loadDotenv(file: string): void {
  let text: string;
  try { text = readFileSync(resolve(process.cwd(), file), "utf8"); } catch { return; }
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("="); if (eq === -1) continue;
    const k = line.slice(0, eq).trim();
    const v = line.slice(eq + 1).trim().replace(/^['"]|['"]$/g, "");
    if (!process.env[k]) process.env[k] = v;
  }
}
loadDotenv(".env.local");
loadDotenv(".env");

import { getSql } from "../lib/db";

async function main(): Promise<void> {
  const sql = getSql();
  const before = (await sql`select count(*)::int as n from products`) as Array<{ n: number }>;

  // 1. Suspicious pricing (likely wrong currency conversion).
  const mispriced = (await sql`
    delete from products
    where (lower(brand) like '%huda%' and (price_usd < 5 or price_usd > 300))
       or (lower(brand) like '%kylie%' and price_usd > 200)
       or (lower(brand) like '%fenty%' and price_usd > 500)
    returning brand, name, price_usd::float8 as price_usd
  `) as Array<{ brand: string; name: string; price_usd: number }>;

  // 2. Non-beauty / garbage (word-boundary; protects glass-skin / ring-light /
  // Hourglass).
  const nonBeauty = (await sql`
    delete from products
    where category not in ('Makeup', 'Skincare', 'Haircare', 'Beauty tools')
       or name ~* '\ycandles?\y'
       or (
         (
           name ~* '\y(t-?shirt|shirt|dress|jeans|trousers|leggings|hoodie|sweater|jumper|jacket|skirt|denim|necklace|bracelet|anklet|earrings?|jewell?ery|pendant|brooch|sunglasses|handbag|wallet|keyring|clothing)\y'
           or name ~* '\yrings?\y'
           or name ~* '\ybottles?\y'
           or name ~* '\yglass(ware)?\y'
           or name ~* '\yaccessor(y|ies)\y'
         )
         and name !~* 'glass\s*skin|ring\s*light'
       )
    returning brand, name
  `) as Array<{ brand: string; name: string }>;

  const after = (await sql`select count(*)::int as n from products`) as Array<{ n: number }>;

  console.log(`Mis-priced removed: ${mispriced.length}`);
  for (const r of mispriced.slice(0, 20)) console.log(`  $${r.price_usd}  ${r.brand} — ${r.name.slice(0, 50)}`);
  console.log(`Non-beauty/garbage removed: ${nonBeauty.length}`);
  for (const r of nonBeauty.slice(0, 20)) console.log(`  ${r.brand} — ${r.name.slice(0, 50)}`);
  console.log(`\nProducts: ${before[0]?.n ?? 0} → ${after[0]?.n ?? 0}`);
}

main().catch((err) => { console.error("clean-pricing failed:", err); process.exit(1); });
