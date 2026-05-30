/**
 * Recalculate price_usd for every product using the tiered markup.
 *
 * Run:  DATABASE_URL="postgresql://..." npx ts-node scripts/reprice-products.ts
 *       (or just `npx ts-node scripts/reprice-products.ts` with .env.local)
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

import { getSql } from "../lib/db";
import { convertGbpToUsd, getGBPtoUSD, getMarkupMultiplier } from "../lib/currency";

interface Row {
  id: string;
  price_gbp: string | number;
  price_usd: string | number;
}

async function main(): Promise<void> {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL is not set.");
    process.exit(1);
  }
  const sql = getSql();
  const rate = await getGBPtoUSD();
  console.log(`GBP→USD rate: ${rate}`);

  const rows = (await sql`select id, price_gbp, price_usd from products`) as Row[];
  console.log(`Repricing ${rows.length} products…`);

  let updated = 0;
  const tiers = { "20% (<$30)": 0, "15% ($30–$50)": 0, "10% ($50+)": 0 };
  for (const r of rows) {
    const gbp = Number(r.price_gbp);
    if (!Number.isFinite(gbp) || gbp <= 0) continue;
    const newUsd = await convertGbpToUsd(gbp);
    const mult = getMarkupMultiplier(gbp, rate);
    if (mult >= 1.2) tiers["20% (<$30)"] += 1;
    else if (mult >= 1.15) tiers["15% ($30–$50)"] += 1;
    else tiers["10% ($50+)"] += 1;

    if (Number(r.price_usd) !== newUsd) {
      await sql`update products set price_usd = ${newUsd} where id = ${r.id}`;
      updated += 1;
    }
  }

  const dist = (await sql`
    select
      case
        when price_usd < 30 then 'under_30'
        when price_usd < 50 then '30_to_50'
        when price_usd < 100 then '50_to_100'
        when price_usd < 200 then '100_to_200'
        else 'over_200'
      end as bucket,
      count(*)::int as n,
      round(min(price_usd)::numeric, 2) as min_usd,
      round(max(price_usd)::numeric, 2) as max_usd
    from products group by bucket
    order by min(price_usd)
  `) as Array<{ bucket: string; n: number; min_usd: string; max_usd: string }>;

  console.log(`\nUpdated ${updated} / ${rows.length} products.`);
  console.log("\nMarkup tier applied:");
  for (const [k, v] of Object.entries(tiers)) console.log(`  ${k.padEnd(16)} ${v}`);
  console.log("\nNew price_usd distribution:");
  for (const d of dist) console.log(`  ${d.bucket.padEnd(12)} ${String(d.n).padStart(4)}   ($${d.min_usd} – $${d.max_usd})`);
}

main().catch((err) => {
  console.error("reprice failed:", err);
  process.exit(1);
});
