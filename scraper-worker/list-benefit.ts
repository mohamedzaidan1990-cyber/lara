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
    select id, brand, name, price_gbp, product_url
    from products
    where lower(brand) like '%benefit%'
    order by name
  ` as any[];
  console.log("Benefit products in DB:", rows.length);
  rows.forEach(r => console.log(
    `  ${r.brand} | ${r.name.slice(0,50)} | £${r.price_gbp} | ${r.product_url?.slice(0,80)}`
  ));
})().catch(e => { console.error(e.message); process.exit(1); });
