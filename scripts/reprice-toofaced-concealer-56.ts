/**
 * One-off manual reprice: Too Faced Born This Way Super Coverage
 * Concealer 13.5ml → $56 (was $52), per user request. Sets
 * price_locked = true so the Selfridges scraper doesn't overwrite this
 * price on its next run (see scraper-worker/db.ts upsert logic).
 *
 * Run:  npx ts-node scripts/reprice-toofaced-concealer-56.ts
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

function loadDotenv(file: string): void {
  let text: string;
  try {
    text = readFileSync(resolve(process.cwd(), file), "utf8");
  } catch {
    return;
  }
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    const value = line.slice(eq + 1).trim().replace(/^['"]|['"]$/g, "");
    if (!process.env[key]) process.env[key] = value;
  }
}
loadDotenv(".env.local");
loadDotenv(".env");

import { ensureSchema, getSql } from "../lib/db";

async function main(): Promise<void> {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL is not set. Make sure .env.local exists in the project root.");
    process.exit(1);
  }

  await ensureSchema();
  const sql = getSql();

  const updated = (await sql`
    update products
    set price_usd = 56, price_locked = true, scraped_at = now()
    where id = 'fc479c3e-5d82-49a6-9cbd-11c6617dd12b'
    returning brand, name, price_gbp, price_usd, price_locked
  `) as Array<{ brand: string; name: string; price_gbp: string; price_usd: string; price_locked: boolean }>;

  if (!updated.length) {
    console.error("Product not found");
    process.exit(1);
  }

  const p = updated[0];
  console.log(`${p.brand} — ${p.name}: $${p.price_usd} (locked=${p.price_locked})`);
}

main().catch((err) => {
  console.error("Reprice failed:", err);
  process.exit(1);
});
