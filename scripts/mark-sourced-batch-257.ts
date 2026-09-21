/**
 * Mark 9 awaiting order lines as sourced — bought together for $257 total, so
 * the cost is split equally. 257 / 9 is not a whole number of cents, so the
 * cents are distributed to keep the total EXACTLY $257.00: the first 5 lines
 * (in the order below) get $28.56, the other 4 get $28.55
 * (5 x 28.56 + 4 x 28.55 = 257.00). cost_gbp = cost_usd / 1.3 per line, as in
 * the other mark-sourced scripts. Only sourced + cost are set: in_lebanon and
 * vendor are left untouched (bought, not yet arrived).
 *
 * The 9 lines (order / item):
 *   SBB-974645 Batoul Dbouk      Makeup By Mario Soft Pop Blush Stick
 *   SBB-812745 Nour Akkouch      Patrick Ta Major Headlines Double-Take Crème & Powder Blush Duo
 *   SBB-819404 Zahia Khatoun     Kayali Yum Boujee Marshmallow Silk Soufflé Body Cream
 *   SBB-974645 Batoul Dbouk      Rare Beauty Positive Light Silky Touch Highlighter
 *   SBB-974645 Batoul Dbouk      Saie Dew Bronze Liquid Bronzer
 *   SBB-403276 Zahraa Sal        Drunk Elephant T.L.C. Framboos Glycolic Night Serum 30ml
 *   SBB-812745 Nour Akkouch      e.l.f. Camo Liquid Blush Brush
 *   SBB-950995 Layla daher       Byoma Balancing Face Mist 100ml
 *   SBB-974645 Batoul Dbouk      Patrick Ta Major Sculpt Crème Contour & Powder Bronzer
 * (Zahraa's Makeup By Mario Master Pigment Pro Pencil, SBB-539783, is NOT part of
 *  this purchase and is left alone.)
 *
 * Refuses to run unless every pattern matches exactly one still-unsourced line
 * in a live order (9 distinct lines). Prints the count of unsourced live lines
 * before and after.
 *
 * Run:  npx ts-node scripts/mark-sourced-batch-257.ts
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

const TOTAL_CENTS = 25700;
const LINES: Array<{ order: string; namePrefix: string }> = [
  { order: "SBB-974645", namePrefix: "Soft Pop Blush Stick" },
  { order: "SBB-812745", namePrefix: "Major Headlines Double-Take" },
  { order: "SBB-819404", namePrefix: "Yum Boujee Marshmallow" },
  { order: "SBB-974645", namePrefix: "Positive Light Silky Touch Highlighter" },
  { order: "SBB-974645", namePrefix: "Dew Bronze" },
  { order: "SBB-403276", namePrefix: "T.L.C. Framboos" },
  { order: "SBB-812745", namePrefix: "Camo Liquid Blush Brush" },
  { order: "SBB-950995", namePrefix: "Balancing face mist" },
  { order: "SBB-974645", namePrefix: "Major Sculpt" }
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

  // Equal split in whole cents; the leftover cents go one each to the first lines.
  const n = ids.length;
  const baseCents = Math.floor(TOTAL_CENTS / n);
  const extra = TOTAL_CENTS - baseCents * n;
  const costsUsd = ids.map((_, i) => (baseCents + (i < extra ? 1 : 0)) / 100);
  const costsGbp = costsUsd.map((c) => round2(c / 1.3));
  if (Math.round(costsUsd.reduce((s, c) => s + c, 0) * 100) !== TOTAL_CENTS) {
    console.error("Cost split does not add up to the total — aborting.");
    process.exit(1);
  }

  const before = await unsourcedLiveCount(sql);
  const updated = (await sql`
    update order_items oi
    set cost_usd = v.usd, cost_gbp = v.gbp, sourced = true
    from (
      select unnest(${ids}::uuid[]) as id, unnest(${costsUsd}::numeric[]) as usd, unnest(${costsGbp}::numeric[]) as gbp
    ) v
    where oi.id = v.id
    returning oi.product_brand, oi.product_name, oi.cost_usd
  `) as Array<{ product_brand: string; product_name: string; cost_usd: string }>;

  for (const u of updated) console.log(`OK  ${u.product_brand} — ${u.product_name} — sourced @ $${Number(u.cost_usd)}`);
  const after = await unsourcedLiveCount(sql);
  const total = round2(updated.reduce((s, u) => s + Number(u.cost_usd), 0));
  console.log(`Done: ${updated.length} lines marked sourced, total $${total} ($${costsUsd[0]} x ${extra}, $${costsUsd[n - 1]} x ${n - extra}). Unsourced live lines: ${before} -> ${after}.`);
}

main().catch((err) => {
  console.error("Failed:", err);
  process.exit(1);
});
