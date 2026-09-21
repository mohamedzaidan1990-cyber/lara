/**
 * Mark 5 awaiting order lines as sourced — bought together for $124 total, so
 * the cost is split equally: $24.80 each (cost_gbp = cost_usd / 1.3, as in the
 * other mark-sourced scripts). Only sourced + cost are set: in_lebanon and
 * vendor are left untouched (bought, not yet arrived).
 *
 * The 5 lines (order / item):
 *   SBB-335181 Lea Sbeity     Fenty Skin Lil' Mists – Mini Body Mist Duo
 *   SBB-812745 Nour Akkouch   Huda Blush Filter 4.5ml — STRAWBERRY CREAM
 *   SBB-772161 Zeinab Ismail  Huda Blush Filter 4.5ml — COTTON CANDY
 *   SBB-204161 Tia Abboud     Charlotte Tilbury Airbrush Flawless Setting Spray 100ml
 *                             (the paid order; Douja Balhass's SBB-348106 also wants one
 *                              but is still pending payment, so it is left alone)
 *   SBB-772161 Zeinab Ismail  Charlotte Tilbury Pillow Talk Blush Balm Lip Tint — Pillow Talk Medium
 *
 * Refuses to run unless every pattern matches exactly one still-unsourced line
 * in a live order (5 distinct lines in total). Prints the count of unsourced
 * live lines before and after.
 *
 * Run:  npx ts-node scripts/mark-sourced-batch-124.ts
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

const TOTAL_USD = 124;
const LINES: Array<{ order: string; namePrefix: string }> = [
  { order: "SBB-335181", namePrefix: "Lil' Mists" },
  { order: "SBB-812745", namePrefix: "Blush Filter 4.5ml" },
  { order: "SBB-772161", namePrefix: "Blush Filter 4.5ml" },
  { order: "SBB-204161", namePrefix: "Airbrush Flawless Setting Spray" },
  { order: "SBB-772161", namePrefix: "Pillow Talk Blush Balm Lip Tint" }
];

const round2 = (n: number): number => Math.round(n * 100) / 100;

async function unsourcedLiveCount(sql: ReturnType<typeof getSql>): Promise<number> {
  const r = (await sql`
    select count(*)::int as n from order_items oi join orders o on o.id = oi.order_id
    where coalesce(oi.sourced, false) = false and o.status not in ('cancelled', 'refunded', 'delivered')
  `) as Array<{ n: number }>;
  return r[0].n;
}

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
  const before = await unsourcedLiveCount(sql);

  const updated = (await sql`
    update order_items
    set cost_usd = ${costUsd}, cost_gbp = ${costGbp}, sourced = true
    where id = any(${ids}::uuid[])
    returning product_brand, product_name, cost_usd
  `) as Array<{ product_brand: string; product_name: string; cost_usd: string }>;

  for (const u of updated) console.log(`OK  ${u.product_brand} — ${u.product_name} — sourced @ $${Number(u.cost_usd)}`);
  const after = await unsourcedLiveCount(sql);
  console.log(`Done: ${updated.length} lines marked sourced, $${costUsd} each (£${costGbp}), total $${round2(costUsd * updated.length)}. Unsourced live lines: ${before} -> ${after}.`);
}

main().catch((err) => {
  console.error("Failed:", err);
  process.exit(1);
});
