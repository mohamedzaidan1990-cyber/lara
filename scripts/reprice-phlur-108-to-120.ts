/**
 * Repriced all PHLUR full-size Eau de Parfum products from $108.14 to
 * $120, per user request ("all phlur perfumes that are for 108 put it
 * 120 usd"). 11 products matched.
 *
 * Run:  npx ts-node scripts/reprice-phlur-108-to-120.ts
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
    set price_usd = 120, price_gbp = 94.8, scraped_at = now()
    where brand ilike 'phlur' and round(price_usd::numeric) = 108
    returning name, price_usd
  `) as Array<{ name: string; price_usd: string }>;

  console.log(`Repriced ${updated.length} PHLUR products to $120:`);
  for (const p of updated) {
    console.log(`  ${p.name} — $${p.price_usd}`);
  }
}

main().catch((err) => {
  console.error("Reprice failed:", err);
  process.exit(1);
});
