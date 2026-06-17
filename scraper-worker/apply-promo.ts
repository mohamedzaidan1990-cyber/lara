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
  // "Clarins Double Serum" — the main (non-Eye, non-Foundation, non-Light) variant
  { id: "eaa31591-2b77-468b-a61e-410cc01c47f4", newPrice: 115 },
  // Extra-Firming Day Cream Refill for Dry Skin Types 50ml
  { id: "8ef4536f-a1e5-4959-882a-220c5f4f8366", newPrice: 100 },
];

(async () => {
  const { neon } = await import("@neondatabase/serverless");
  const sql = neon(process.env.DATABASE_URL!);

  for (const { id, newPrice } of UPDATES) {
    const [row] = await sql`select name, price_usd from products where id = ${id}` as any[];
    if (!row) { console.log("Not found:", id); continue; }
    await sql`update products set price_usd = ${newPrice}, price_locked = true where id = ${id}`;
    console.log(`✓ "${row.name}" $${row.price_usd} → $${newPrice}`);
  }
  console.log("Done.");
})().catch(e => { console.error(e.message); process.exit(1); });
