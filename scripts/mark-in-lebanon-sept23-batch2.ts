/**
 * Second batch of "reached Lebanon" items the user forgot to mention the
 * first time round — same exact-match, payment_confirmed-only approach as
 * mark-in-lebanon-sept23-batch.ts.
 *
 * Run:  npx ts-node scripts/mark-in-lebanon-sept23-batch2.ts
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

const LINES: Array<{ order: string; productName: string }> = [
  { order: "SBB-974645", productName: "Soft Pop Blush Stick" },
  { order: "SBB-812745", productName: "Major Headlines Double-Take Crème & Powder Blush Duo — Not Too Much — soft rosey taupe" },
  { order: "SBB-974645", productName: "Positive Light Silky Touch Highlighter" },
  { order: "SBB-403276", productName: "T.L.C. Framboos™ Glycolic Night Serum 30ml" },
  { order: "SBB-812745", productName: "Camo Liquid Blush Brush" },
  { order: "SBB-950995", productName: "Balancing face mist 100ml" },
  { order: "SBB-974645", productName: "Major Sculpt Crème Contour & Powder Bronzer" }
];

async function main(): Promise<void> {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL is not set.");
    process.exit(1);
  }
  const sql = getSql();

  const ids: string[] = [];
  for (const l of LINES) {
    const rows = (await sql`
      select oi.id, oi.product_name, o.payment_confirmed
      from order_items oi join orders o on o.id = oi.order_id
      where o.order_number = ${l.order}
        and o.status not in ('cancelled', 'refunded', 'delivered')
        and oi.sourced = true
        and coalesce(oi.in_lebanon, false) = false
        and oi.product_name = ${l.productName}
    `) as Array<{ id: string; product_name: string; payment_confirmed: boolean }>;
    if (rows.length !== 1) {
      console.error(`Expected exactly 1 matching line for ${l.order} / "${l.productName}", found ${rows.length} — aborting, nothing changed.`);
      process.exit(1);
    }
    if (!rows[0].payment_confirmed) {
      console.error(`${l.order} is not payment_confirmed — refusing. Aborting, nothing changed.`);
      process.exit(1);
    }
    ids.push(rows[0].id);
  }
  if (new Set(ids).size !== LINES.length) {
    console.error("Two patterns matched the same line — aborting, nothing changed.");
    process.exit(1);
  }

  const updated = (await sql`
    update order_items
    set in_lebanon = true
    where id = any(${ids}::uuid[])
    returning id, product_brand, product_name
  `) as Array<{ id: string; product_brand: string; product_name: string }>;

  for (let i = 0; i < LINES.length; i++) {
    const u = updated.find((r) => r.id === ids[i]);
    console.log(`OK  ${LINES[i].order} — ${u?.product_brand} — ${u?.product_name}`);
  }
  console.log(`\nMarked ${updated.length} line(s) as in_lebanon = true.`);
}

main().catch((err) => {
  console.error("Failed:", err);
  process.exit(1);
});
