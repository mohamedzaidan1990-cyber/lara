/**
 * Mark SBB-509729 (Zaynab Al Moussawi) Hourglass Vanish Airbrush Concealer,
 * shade Pearl, as sourced — bought at $32.
 *
 * Run:  npx tsx scripts/source-sbb-509729-hourglass-pearl.ts
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
function loadDotenv(file: string): void {
  let text: string;
  try { text = readFileSync(resolve(process.cwd(), file), "utf8"); } catch { return; }
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
const gbpFromUsd = (usd: number): number => round2(usd / 1.3);

const LINES: Array<{ order: string; productName: string; costUsd: number }> = [
  { order: "SBB-509729", productName: "Vanish Airbrush Concealer 5.9ml — Shade: Pearl", costUsd: 32 }
];

async function main() {
  const sql = getSql();
  for (const l of LINES) {
    const rows = (await sql`
      select oi.id, oi.product_name, o.payment_confirmed
      from order_items oi join orders o on o.id = oi.order_id
      where o.order_number = ${l.order}
        and o.status not in ('cancelled', 'refunded')
        and coalesce(oi.sourced, false) = false
        and oi.product_name = ${l.productName}
    `) as Array<{ id: string; product_name: string; payment_confirmed: boolean }>;
    if (rows.length !== 1) {
      console.error(`Expected exactly 1 unsourced line for ${l.order} / "${l.productName}", found ${rows.length} — aborting, nothing changed.`);
      process.exit(1);
    }
    if (!rows[0].payment_confirmed) {
      console.error(`${l.order} is not payment_confirmed — refusing to source it. Aborting, nothing changed.`);
      process.exit(1);
    }
    const costGbp = gbpFromUsd(l.costUsd);
    await sql`
      update order_items
      set cost_usd = ${l.costUsd}, cost_gbp = ${costGbp}, sourced = true
      where id = ${rows[0].id}
    `;
    console.log(`OK  ${l.order} — ${rows[0].product_name} — sourced @ $${l.costUsd} (£${costGbp})`);
  }
}
main().catch((err) => { console.error("Failed:", err); process.exit(1); });
