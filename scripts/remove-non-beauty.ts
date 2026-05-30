/**
 * Remove non-beauty products (clothing, jewellery, glassware, accessories) and
 * mis-parsed markup blobs from the catalog. Mirrors isNonBeauty() in
 * scraper-worker/scraper.ts. Word-boundary regex + protective exceptions so
 * legitimate beauty terms (K-beauty "glass skin", "ring light" tools, the
 * Hourglass brand) are never deleted.
 *
 * Run:  npx ts-node scripts/remove-non-beauty.ts
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

  const deleted = (await sql`
    delete from products
    where
      -- mis-parsed markup / garbage rows
      length(brand) > 180 or length(name) > 200 or brand ~ '[<>{}]' or name ~ '[<>{}]'
      -- anything outside the four beauty categories
      or category not in ('Makeup', 'Skincare', 'Haircare', 'Beauty tools')
      -- clothing / jewellery / glassware / accessories (word-boundary matched)
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
    returning brand, name, category
  `) as Array<{ brand: string; name: string; category: string }>;

  const after = (await sql`select count(*)::int as n from products`) as Array<{ n: number }>;
  console.log(`Removed ${deleted.length} non-beauty / garbage products.`);
  console.log(`Products: ${before[0]?.n ?? 0} → ${after[0]?.n ?? 0}`);
  console.log("\nSample removed:");
  for (const r of deleted.slice(0, 25)) {
    const brand = (r.brand || "").slice(0, 30);
    console.log(`  [${r.category}] ${brand} — ${(r.name || "").slice(0, 60)}`);
  }
}

main().catch((err) => { console.error("remove-non-beauty failed:", err); process.exit(1); });
