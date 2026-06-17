/**
 * One-off: find and update Clarins double serum foundation price.
 * Run: railway run --service lara npx tsx scraper-worker/apply-promo.ts
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
function load(f: string): void {
  let text: string;
  try { text = readFileSync(f, "utf8"); } catch { return; }
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq < 0) continue;
    const k = line.slice(0, eq).trim();
    if (!process.env[k]) process.env[k] = line.slice(eq + 1).trim().replace(/^['"]|['"]$/g, "");
  }
}
load(resolve(__dirname, "..", ".env.local"));
load(resolve(__dirname, ".env"));

(async () => {
  const { neon } = await import("@neondatabase/serverless");
  const sql = neon(process.env.DATABASE_URL!);

  const rows = await sql`
    select id, brand, name, price_usd, price_gbp
    from products
    where lower(brand) like '%clarins%'
      and lower(name) like '%double serum%'
      and lower(name) like '%foundation%'
  ` as any[];

  console.log("Found:", rows.length);
  rows.forEach(r => console.log(`  [${r.id}] ${r.name} | $${r.price_usd} / £${r.price_gbp}`));

  if (rows.length === 1) {
    await sql`update products set price_usd = 80, price_locked = true where id = ${rows[0].id}`;
    console.log(`✓ Updated to $80`);
  } else if (rows.length > 1) {
    console.log("Multiple matches — not updating. Narrow the search.");
  } else {
    console.log("No match found.");
  }
})().catch(e => { console.error(e.message); process.exit(1); });
