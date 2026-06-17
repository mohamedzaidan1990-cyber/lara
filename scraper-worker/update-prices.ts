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

  // Find matching products
  const rows = await sql`
    select id, brand, name, price_usd, price_gbp, on_sale, original_price_usd
    from products
    where lower(name) like '%avocado%' and lower(brand) like '%kiehl%'
    order by name
  ` as any[];

  console.log("Found:", rows.length);
  rows.forEach(r => console.log(`  [${r.id}] ${r.name} | $${r.price_usd} / £${r.price_gbp} | sale:${r.on_sale}`));
})().catch(e => { console.error(e.message); process.exit(1); });
