/**
 * Sourcing update for items bought on 2026-09-08.
 *
 *  - Set vendor = "huda beauty qatar" on the 3 already-sourced Habibti kits
 *    (SBB-827356, SBB-114169, SBB-526507).
 *  - Mark sourced + cost:
 *      SBB-598958  Benefit BADgal BANG! Mascara            $41.30
 *      SBB-132710  Dior Forever Glow Luminizer             $39.40
 *      SBB-132710  Kayali Yum Boujee Silk Soufflé Body Cream $52.00
 *      SBB-764733  Pixi BeautifEYE                          $31.55
 *      SBB-172890  Pixi BeautifEYE                          $31.55
 *      SBB-455190  Pixi BeautifEYE                          $31.55
 *      SBB-744487  Drunk Elephant Protini Refill 50ml       $74.00
 *      SBB-496077  Tarte Maracuja Juicy Lip Balm Gloss      $30.20
 *
 * NOT handled here (ambiguous — asked separately):
 *   - Kiehl's Creamy Eye Treatment (SBB-769585, qty 2) @ $24.45
 *   - Benefit Precisely My Brow Detailer (SBB-329074, line qty 4, only 2 sourced)
 *
 * Run:  npx ts-node scripts/source-batch-sept08.ts
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

interface Target {
  order_number: string;
  name_like: string;
  cost_usd: number;
}

const SOURCE_TARGETS: Target[] = [
  { order_number: "SBB-598958", name_like: "%BADgal BANG%", cost_usd: 41.3 },
  { order_number: "SBB-132710", name_like: "Forever Glow Luminizer", cost_usd: 39.4 },
  { order_number: "SBB-132710", name_like: "%Silk Souffl%Body Cream%", cost_usd: 52 },
  { order_number: "SBB-764733", name_like: "%BeautifEYE%", cost_usd: 31.55 },
  { order_number: "SBB-172890", name_like: "%BeautifEYE%", cost_usd: 31.55 },
  { order_number: "SBB-455190", name_like: "%BeautifEYE%", cost_usd: 31.55 },
  { order_number: "SBB-744487", name_like: "%Protini%", cost_usd: 74 },
  { order_number: "SBB-496077", name_like: "%Maracuja Juicy Lip%", cost_usd: 30.2 }
];

async function main(): Promise<void> {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL is not set.");
    process.exit(1);
  }
  await ensureSchema();
  const sql = getSql();

  // 1. Habibti kits vendor
  const hab = (await sql`
    update order_items oi
    set vendor = 'huda beauty qatar'
    from orders o
    where o.id = oi.order_id
      and o.order_number = any(${["SBB-827356", "SBB-114169", "SBB-526507"]})
      and oi.product_name ilike '%habibti%'
    returning o.order_number, oi.vendor, oi.cost_usd
  `) as Array<Record<string, unknown>>;
  console.log("Habibti kits vendor set:");
  console.dir(hab, { depth: null });

  // 2. Sourcing updates
  console.log("\nSourcing updates:");
  for (const t of SOURCE_TARGETS) {
    const rows = (await sql`
      update order_items oi
      set sourced = true, cost_usd = ${t.cost_usd}
      from orders o
      where o.id = oi.order_id
        and o.order_number = ${t.order_number}
        and oi.product_name ilike ${t.name_like}
        and oi.sourced = false
      returning o.order_number, oi.product_brand, oi.product_name, oi.quantity, oi.sourced, oi.cost_usd
    `) as Array<Record<string, unknown>>;
    if (!rows.length) {
      console.log(`  !! NO MATCH: ${t.order_number} / ${t.name_like}`);
    } else {
      for (const r of rows) {
        console.log(`  OK ${r.order_number} — ${r.product_brand} — ${r.product_name} x${r.quantity} → cost $${r.cost_usd}`);
      }
    }
  }
}

main().catch((err) => {
  console.error("Failed:", err);
  process.exit(1);
});
