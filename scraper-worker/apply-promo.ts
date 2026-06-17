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
    where lower(brand) like '%bobbi brown%'
      and lower(name) like '%weightless%'
      and lower(name) like '%foundation%'
      and lower(name) like '%30%'
  ` as any[];

  console.log("Found:", rows.length);
  rows.forEach(r => console.log(`  [${r.id}] ${r.name} | $${r.price_usd} / £${r.price_gbp}`));

  if (rows.length === 1) {
    await sql`update products set price_usd = 68, price_locked = true where id = ${rows[0].id}`;
    console.log(`✓ Updated to $68`);
  } else if (rows.length > 1) {
    console.log("Multiple matches — not updating.");
  } else {
    const broad = await sql`
      select id, brand, name, price_usd from products
      where lower(brand) like '%bobbi%' and lower(name) like '%weightless%'
    ` as any[];
    console.log("Broader search:", broad.length);
    broad.forEach(r => console.log(`  [${r.id}] ${r.name} | $${r.price_usd}`));
  }
})().catch(e => { console.error(e.message); process.exit(1); });
