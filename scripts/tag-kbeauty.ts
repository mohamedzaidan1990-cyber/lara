/**
 * Adds the products.k_beauty column and tags every product whose brand is on
 * the Korean-brand list. Safe to re-run.
 * Run:  npx ts-node scripts/tag-kbeauty.ts
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
function loadDotenv(file: string): void {
  let text: string;
  try { text = readFileSync(resolve(process.cwd(), file), "utf8"); } catch { return; }
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("="); if (eq === -1) continue;
    const k = line.slice(0, eq).trim();
    const v = line.slice(eq + 1).trim().replace(/^['"]|['"]$/g, "");
    if (!process.env[k]) process.env[k] = v;
  }
}
loadDotenv(".env.local");
loadDotenv(".env");

import { getSql } from "../lib/db";
import { KBEAUTY_BRAND_MATCHES } from "../lib/kbeauty";

async function main(): Promise<void> {
  const sql = getSql();

  await sql`alter table products add column if not exists k_beauty boolean default false`;

  const updated = (await sql`
    update products set k_beauty = true
    where lower(brand) = any(${KBEAUTY_BRAND_MATCHES}::text[])
      and k_beauty is distinct from true
    returning 1
  `) as unknown[];
  console.log(`Newly tagged: ${updated.length}`);

  const rows = (await sql`
    select brand, count(*)::int as tagged
    from products where k_beauty = true
    group by brand order by tagged desc
  `) as Array<{ brand: string; tagged: number }>;
  let total = 0;
  for (const r of rows) {
    total += r.tagged;
    console.log(`${r.brand}: ${r.tagged}`);
  }
  console.log(`TOTAL K-Beauty products: ${total}`);
}

main().then(() => process.exit(0)).catch((err) => {
  console.error(err);
  process.exit(1);
});
