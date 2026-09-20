/**
 * Mark 10 awaiting order lines as sourced — bought together for $350 total, so
 * the cost is split equally: $35.00 each (cost_gbp = cost_usd / 1.3, as in the
 * other mark-sourced scripts). Only sourced + cost are set: in_lebanon and
 * vendor are left untouched (they are bought, not yet arrived).
 *
 * The 10 lines (order / item):
 *   SBB-539783 Zahraa        Sol De Janeiro Cheirosa 68 Hair & Body Perfume Mist 90ml
 *   SBB-974645 Batoul Dbouk  Charlotte Tilbury Airbrush Flawless Finish micro-powder — FAIR
 *   SBB-462964 Lara Awada    Kiehl's Creamy Eye Treatment with Avocado 14ml
 *   SBB-950995 Layla daher   Huda Easy Bake Mini Loose Powder 6g — CHERRY BLOSSOM
 *   SBB-974645 Batoul Dbouk  Huda Easy Bake loose baking & setting powder 20g — 2 POUND CAKE
 *   SBB-473702 Rosa Wehbe    Huda Easy Bake Duo Loose Powder 6.5g — Cherry Lilac
 *   SBB-974645 Batoul Dbouk  Huda Blush Filter Palette 7.5g — ROSE BERRY
 *   SBB-974645 Batoul Dbouk  Huda FAUXFILTER Luminous Matte Liquid Concealer — COTTON CANDY
 *   SBB-974645 Batoul Dbouk  Huda Blush Filter liquid blusher — Ube Cream
 *   SBB-974645 Batoul Dbouk  Huda Faux Filter lip gloss 3.9ml — She Flirty
 *
 * Refuses to run unless every pattern matches exactly one still-unsourced line
 * in a live order (10 distinct lines in total).
 *
 * Run:  npx ts-node scripts/mark-sourced-batch-350.ts
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

const TOTAL_USD = 350;
const LINES: Array<{ order: string; namePrefix: string }> = [
  { order: "SBB-539783", namePrefix: "Cheirosa 68" },
  { order: "SBB-974645", namePrefix: "Airbrush Flawless Finish" },
  { order: "SBB-462964", namePrefix: "Creamy Eye Treatment with Avocado" },
  { order: "SBB-950995", namePrefix: "Easy Bake Mini Loose Powder" },
  { order: "SBB-974645", namePrefix: "Easy Bake loose baking" },
  { order: "SBB-473702", namePrefix: "Easy Bake Duo Loose Powder" },
  { order: "SBB-974645", namePrefix: "Blush Filter Palette" },
  { order: "SBB-974645", namePrefix: "FAUXFILTER Luminous Matte Liquid Concealer" },
  { order: "SBB-974645", namePrefix: "Blush Filter liquid blusher" },
  { order: "SBB-974645", namePrefix: "Faux Filter lip gloss" }
];

const round2 = (n: number): number => Math.round(n * 100) / 100;

async function main(): Promise<void> {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL is not set.");
    process.exit(1);
  }
  const sql = getSql();

  const ids: string[] = [];
  for (const l of LINES) {
    const rows = (await sql`
      select oi.id, oi.product_name
      from order_items oi join orders o on o.id = oi.order_id
      where o.order_number = ${l.order}
        and o.status not in ('cancelled', 'refunded')
        and coalesce(oi.sourced, false) = false
        and oi.product_name like ${l.namePrefix + "%"}
    `) as Array<{ id: string; product_name: string }>;
    if (rows.length !== 1) {
      console.error(`Expected exactly 1 unsourced line for ${l.order} / "${l.namePrefix}", found ${rows.length} — aborting, nothing changed.`);
      process.exit(1);
    }
    ids.push(rows[0].id);
  }
  if (new Set(ids).size !== LINES.length) {
    console.error("Two patterns matched the same line — aborting, nothing changed.");
    process.exit(1);
  }

  const costUsd = round2(TOTAL_USD / ids.length);
  const costGbp = round2(costUsd / 1.3);

  const updated = (await sql`
    update order_items
    set cost_usd = ${costUsd}, cost_gbp = ${costGbp}, sourced = true
    where id = any(${ids}::uuid[])
    returning product_brand, product_name, cost_usd
  `) as Array<{ product_brand: string; product_name: string; cost_usd: string }>;

  for (const u of updated) console.log(`OK  ${u.product_brand} — ${u.product_name} — sourced @ $${Number(u.cost_usd)}`);
  console.log(`Done: ${updated.length} lines marked sourced, $${costUsd} each (£${costGbp}), total $${round2(costUsd * updated.length)}.`);
}

main().catch((err) => {
  console.error("Failed:", err);
  process.exit(1);
});
