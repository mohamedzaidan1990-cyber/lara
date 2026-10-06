/**
 * Batch arrival in Lebanon (user message, 6 Oct 2026). Every line below is
 * marked in_lebanon (and sourced). Lines with a cost were not sourced yet and
 * get the user-given cost. The CT 2 concealers + CT setting spray + Chanel
 * 4 Ombres Boutons were bought together for $250 — split by sale price.
 * Lines are addressed by order_items.id prefix (from the open-lines listing);
 * each prefix must match exactly one line or the whole batch aborts.
 *
 * Run:  npx tsx scripts/arrivals-batch-oct06.ts
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

const round2 = (n: number): number => Math.round(n * 100) / 100;

// [order_items.id prefix, label, cost if not yet sourced]
const LINES: Array<[string, string, number | null]> = [
  ["570522eb", "SBB-509729 Hourglass Vanish concealer (Pearl)", null],
  ["6919d9b1", "SBB-585352 Laneige Lip Glowy Balm (Gummy Bear)", null],
  ["3dbbca29", "SBB-585352 Summer Fridays Flushed Lip Stain (Plum)", null],
  ["803ba19d", "SBB-240458 Rare Beauty Warm Wishes bronzer stick (Bright Side)", 42],
  ["df0cb42f", "SBB-539783 Makeup By Mario Master Pigment Pro Pencil", 32],
  ["c9c36779", "SBB-536097 Byoma Foaming Rice Deep Cleanser", null],
  ["aa054f0c", "SBB-134195 Bubble Solar Mate SPF 30", null],
  ["9dc581e2", "SBB-585352 Tower 28 Swipe Serum Concealer (4.0 DTLA)", null],
  ["46a87893", "SBB-585352 Sephora Favorites All About Lips", null],
  ["cf47a26a", "SBB-585352 Bubble Cosmic Silk Milky Toner", null],
  ["2b6a0a55", "SBB-456087 Sephora All That Matte(r)s palette", null],
  ["764714b6", "SBB-890277 e.l.f. Brow Lift x2", null],
  ["5b8391a8", "SBB-887832 Sol de Janeiro Leite Néctar mist", null],
  ["35e08bd3", "SBB-887832 Tarte Don't Kiss & Tell Lip Trio", null],
  ["0a2f3ba0", "SBB-974645 Huda 1 Coat WOW! mascara", null],
  // Bought together for $250:
  ["ae3ef7c9", "SBB-210069 CT Airbrush Flawless Blur Concealer (4 Fair-medium)", 47.27],
  ["02582129", "SBB-282674 CT Airbrush Flawless Blur Concealer (6 Medium)", 47.27],
  ["d47dbbfa", "SBB-718732 CT Airbrush Flawless Setting Spray 100ml", 50.91],
  ["3585a91f", "SBB-465275 Chanel LES 4 OMBRES BOUTONS (Mademoiselle)", 104.55]
];

async function main(): Promise<void> {
  const sql = getSql();

  // Resolve every prefix first; abort before writing if any is not unique.
  const resolved: Array<{ id: string; label: string; cost: number | null }> = [];
  for (const [prefix, label, cost] of LINES) {
    const rows = (await sql`select id from order_items where id::text like ${prefix + "%"}`) as Array<{ id: string }>;
    if (rows.length !== 1) {
      console.error(`${prefix} (${label}) matched ${rows.length} lines — aborting, nothing changed.`);
      process.exit(1);
    }
    resolved.push({ id: rows[0].id, label, cost });
  }

  for (const r of resolved) {
    if (r.cost != null) {
      await sql`update order_items set sourced = true, in_lebanon = true, cost_usd = ${r.cost}, cost_gbp = ${round2(r.cost / 1.3)} where id = ${r.id}`;
      console.log(`OK  ${r.label} — sourced @ $${r.cost}, in Lebanon`);
    } else {
      await sql`update order_items set sourced = true, in_lebanon = true where id = ${r.id}`;
      console.log(`OK  ${r.label} — in Lebanon`);
    }
  }

  // Keep order-level cost/profit in step with item costs for the orders touched.
  await sql`
    update orders o
    set cost_usd = sub.c, profit_usd = round((coalesce(o.total_usd, o.price_usd, 0) - sub.c - coalesce(o.platform_fee_usd, 0))::numeric, 2)
    from (
      select order_id, round(sum(cost_usd)::numeric, 2) as c from order_items
      where order_id in (select order_id from order_items where id = any(${resolved.map((r) => r.id)}))
      group by order_id
    ) sub
    where o.id = sub.order_id and sub.c is not null
  `;

  // Report which touched orders are now fully in Lebanon.
  const full = (await sql`
    select o.order_number, bool_and(coalesce(oi.in_lebanon, false)) as all_in
    from orders o join order_items oi on oi.order_id = o.id
    where o.id in (select order_id from order_items where id = any(${resolved.map((r) => r.id)}))
    group by o.order_number order by o.order_number
  `) as Array<{ order_number: string; all_in: boolean }>;
  console.log("\nOrders now fully in Lebanon: " + (full.filter((x) => x.all_in).map((x) => x.order_number).join(", ") || "none"));
  console.log("Orders still waiting on other items: " + (full.filter((x) => !x.all_in).map((x) => x.order_number).join(", ") || "none"));
}

main().catch((err) => {
  console.error("Failed:", err);
  process.exit(1);
});
