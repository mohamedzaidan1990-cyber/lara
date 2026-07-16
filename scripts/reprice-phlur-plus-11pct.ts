/**
 * Applies an 11.1% price increase to every PHLUR product EXCEPT the 11
 * full-size Eau de Parfums that were just repriced to a flat $120
 * (per user request: "add 11.1% on all phlur prices except the ones
 * we just changed now"). 47 of the 58 PHLUR products are affected.
 *
 * Run:  npx ts-node scripts/reprice-phlur-plus-11pct.ts
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

const JUST_REPRICED_URLS = [
  "https://www.sephora.qa/brand/phlur/#golden-rule-edp-full",
  "https://www.sephora.qa/brand/phlur/#vanilla-skin-edp-full",
  "https://www.sephora.qa/brand/phlur/#missing-person-edp-full",
  "https://www.sephora.qa/brand/phlur/#strawberry-letter-edp-full",
  "https://www.sephora.qa/brand/phlur/#afterglow-edp-full",
  "https://www.sephora.qa/brand/phlur/#honey-moon-edp-full",
  "https://www.sephora.qa/brand/phlur/#rose-whip-edp-full",
  "https://www.sephora.qa/brand/phlur/#cherry-stem-edp-full",
  "https://www.sephora.qa/brand/phlur/#mood-ring-edp-full",
  "https://www.sephora.qa/brand/phlur/#soft-spot-edp-full",
  "https://www.sephora.qa/brand/phlur/#father-figure-edp-full"
];

async function main(): Promise<void> {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL is not set. Make sure .env.local exists in the project root.");
    process.exit(1);
  }

  await ensureSchema();
  const sql = getSql();

  const updated = (await sql`
    update products
    set price_usd = round((price_usd::numeric * 1.111), 2),
        price_gbp = round((price_gbp::numeric * 1.111), 2),
        scraped_at = now()
    where brand ilike 'phlur' and product_url != all(${JUST_REPRICED_URLS})
    returning name, price_usd
  `) as Array<{ name: string; price_usd: string }>;

  console.log(`Repriced ${updated.length} PHLUR products by +11.1%:`);
  for (const p of updated) {
    console.log(`  ${p.name} — $${p.price_usd}`);
  }
}

main().catch((err) => {
  console.error("Reprice failed:", err);
  process.exit(1);
});
