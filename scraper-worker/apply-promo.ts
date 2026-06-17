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
  { search: { name: "%beauty flash balm%" },                                          newPrice: 66,  label: "Beauty Flash Balm" },
  { search: { name: "%plus advanced serum%30%" },                                     newPrice: 115, label: "Plus Advanced Serum 30ml" },
  { search: { name: "%double serum%" },                                               newPrice: 115, label: "Double Serum" },
  { search: { name: "%extra firming%day cream%refill%dry%" },                         newPrice: 100, label: "Extra Firming Day Cream Refill (dry)" },
];

(async () => {
  const { neon } = await import("@neondatabase/serverless");
  const sql = neon(process.env.DATABASE_URL!);

  for (const { search, newPrice, label } of UPDATES) {
    const rows = await sql`
      select id, brand, name, price_usd, price_gbp
      from products
      where lower(brand) like '%clarins%'
        and lower(name) like ${search.name}
      order by name
    ` as any[];

    if (rows.length === 0) {
      // Broader fallback — split the pattern on % and search each word
      const words = search.name.replace(/%/g, " ").trim().split(/\s+/).filter(w => w.length > 3);
      const broad = await sql`
        select id, brand, name, price_usd from products
        where lower(brand) like '%clarins%'
      ` as any[];
      const filtered = broad.filter(r =>
        words.every(w => r.name.toLowerCase().includes(w))
      );
      console.log(`[${label}] No exact match. Broad hits (${filtered.length}):`);
      filtered.forEach(r => console.log(`  [${r.id}] ${r.name} | $${r.price_usd}`));
    } else if (rows.length > 1) {
      console.log(`[${label}] Multiple matches (${rows.length}) — not updating:`);
      rows.forEach(r => console.log(`  [${r.id}] ${r.name} | $${r.price_usd}`));
    } else {
      await sql`update products set price_usd = ${newPrice}, price_locked = true where id = ${rows[0].id}`;
      console.log(`✓ [${label}] "${rows[0].name}" $${rows[0].price_usd} → $${newPrice}`);
    }
  }
  console.log("Done.");
})().catch(e => { console.error(e.message); process.exit(1); });
