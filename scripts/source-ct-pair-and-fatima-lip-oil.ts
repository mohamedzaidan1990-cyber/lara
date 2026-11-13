/**
 * Per the user (2026-11-13):
 *   SBB-112074 Dana Assy      CT Airbrush Flawless Blur Concealer 5 MEDIUM — bought, $45
 *   SBB-297960 Mona Alkazwini CT Hollywood Flawless Filter 2.5 Fair       — bought, $45
 *   SBB-708598 Fatima Noureddine Gisou Honey Infused Lip Oil (free gift) — taken from
 *     physical stock. There is no matching stock_items row (it was never recorded),
 *     so the line is marked sourced with cost left NULL (unknown) rather than guessed.
 * cost_gbp = cost_usd / 1.3. Refuses unless every line is still unsourced.
 *
 * Run:  npx tsx scripts/source-ct-pair-and-fatima-lip-oil.ts
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
for (const f of [".env.local", ".env"]) { try { for (const raw of readFileSync(resolve(process.cwd(), f), "utf8").split(/\r?\n/)) { const l = raw.trim(); if (!l || l.startsWith("#")) continue; const e = l.indexOf("="); if (e < 0) continue; const k = l.slice(0, e).trim(); if (!process.env[k]) process.env[k] = l.slice(e + 1).trim().replace(/^['"]|['"]$/g, ""); } } catch {} }
import { getSql } from "../lib/db";

const LINES: Array<{ id: string; order: string; prefix: string; usd: number | null }> = [
  { id: "0542b43f-ee0c-40eb-aa1e-3f8931bd3de8", order: "SBB-112074", prefix: "Airbrush Flawless Blur Concealer", usd: 45 },
  { id: "42fcd816-145e-4c7d-916d-42d8a4040d98", order: "SBB-297960", prefix: "Hollywood Flawless Filter", usd: 45 },
  { id: "c5a32e96-b82a-4e15-92b4-6464b7ae0c46", order: "SBB-708598", prefix: "Honey Infused Lip Oil", usd: null }
];

async function main(): Promise<void> {
  const sql = getSql();
  for (const l of LINES) {
    const r = (await sql`select oi.product_name, oi.sourced, o.order_number from order_items oi join orders o on o.id = oi.order_id where oi.id = ${l.id}`) as Array<{ product_name: string; sourced: boolean | null; order_number: string }>;
    if (!r[0] || r[0].order_number !== l.order || !r[0].product_name.startsWith(l.prefix) || r[0].sourced) {
      console.error(`Pre-flight failed for ${l.order} / ${l.prefix} — aborting, nothing changed.`); process.exit(1);
    }
  }
  await sql.transaction(LINES.map((l) => sql`
    update order_items set sourced = true,
      cost_usd = ${l.usd}, cost_gbp = ${l.usd == null ? null : Math.round((l.usd / 1.3) * 100) / 100}
    where id = ${l.id} and coalesce(sourced, false) = false`));
  const v = (await sql`select o.order_number, oi.product_name, oi.sourced, oi.cost_usd from order_items oi join orders o on o.id = oi.order_id where oi.id = any(${LINES.map((l) => l.id)})`) as any[];
  for (const r of v) console.log(r.order_number, "|", r.product_name, "| sourced:", r.sourced, "| cost:", r.cost_usd);
}
main().catch((e) => { console.error("Failed:", e); process.exit(1); });
