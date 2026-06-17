/**
 * One-off: update Kiehl's avocado eye cream prices to promo rates.
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

const UPDATES = [
  { id: "236f4952-5fc1-436e-b609-6e6f2fd53f9d", newPriceUsd: 42 },  // 14ml
  { id: "39bcccfb-6e26-45ce-97e7-f3cf2429e08a", newPriceUsd: 65 },  // 28ml
];

(async () => {
  const { neon } = await import("@neondatabase/serverless");
  const sql = neon(process.env.DATABASE_URL!);

  for (const { id, newPriceUsd } of UPDATES) {
    const [row] = await sql`select name, price_usd from products where id = ${id}` as any[];
    if (!row) { console.log("Not found:", id); continue; }
    await sql`update products set price_usd = ${newPriceUsd}, price_locked = true where id = ${id}`;
    console.log(`✓ ${row.name}: $${row.price_usd} → $${newPriceUsd}`);
  }
  console.log("Done.");
})().catch(e => { console.error(e.message); process.exit(1); });
