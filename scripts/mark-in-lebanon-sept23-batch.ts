/**
 * Marks specific sourced order_items as in_lebanon = true — only the exact
 * items the user named as having reached Lebanon, not every sourced item on
 * their orders (several of these orders have other sourced items still in
 * transit, so this intentionally leaves those alone — e.g. SBB-974645 Batoul
 * Dbouk gets 5 of its ~13 sourced lines marked).
 *
 * Explicitly excluded per instruction ("don't touch the awaiting orders"):
 * any order_item on a pending/unconfirmed order. All 15 lines below are on
 * payment_confirmed orders already, so nothing extra to filter there.
 *
 * "All the cherry blossom cake loose powders except one of the minis (not
 * yet sourced)" resolves to the 2 sourced CHERRY BLOSSOM minis (Layla daher,
 * Mahassen Karout) — there's no sourced full-size "Cherry Blossom Cake" on
 * any live order right now (the only 2 that existed are already delivered,
 * and a 3rd unit is sitting in stock, not on an order).
 *
 * Each line is matched by order_number + exact product_name, and the script
 * refuses to run if any pattern doesn't match exactly one still-pending
 * (sourced=true, in_lebanon=false) line.
 *
 * Run:  npx ts-node scripts/mark-in-lebanon-sept23-batch.ts
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
  { order: "SBB-204161", productName: "Airbrush Flawless Setting Spray 100ml" },
  { order: "SBB-950995", productName: "Easy Bake Mini Loose Powder 6g — Shade: CHERRY BLOSSOM" },
  { order: "SBB-100185", productName: "Easy Bake Mini Loose Powder 6g — Shade: CHERRY BLOSSOM" },
  { order: "SBB-812745", productName: "Blush Filter 4.5ml — Colour: STRAWBERRY CREAM" },
  { order: "SBB-772161", productName: "Blush Filter 4.5ml — Colour: COTTON CANDY" },
  { order: "SBB-974645", productName: "Blush Filter liquid blusher — Colour: Ube Cream" },
  { order: "SBB-974645", productName: "Blush Filter Palette 7.5g — Colour: ROSE BERRY" },
  { order: "SBB-117959", productName: "Baby Blush Duo Mild Mocktail" },
  { order: "SBB-772161", productName: "Pillow Talk Blush Balm Lip Tint 2g — Shade: Pillow Talk Medium" },
  { order: "SBB-335181", productName: "Lil' Mists – Mini Body Mist Duo (Vanilla Flowers & Hey, Bouquet)" },
  { order: "SBB-462964", productName: "Creamy Eye Treatment with Avocado 14ml" },
  { order: "SBB-473702", productName: "Easy Bake Duo Loose Powder 6.5g — Cherry Lilac" },
  { order: "SBB-974645", productName: "Easy Bake loose baking and setting powder 20g — Shade: 2 POUND CAKE" },
  { order: "SBB-974645", productName: "FAUXFILTER Luminous Matte Liquid Concealer 9ml — Shade: COTTON CANDY" },
  { order: "SBB-974645", productName: "Faux Filter lip gloss 3.9ml — Colour: She Flirty" }
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

  const byOrder = new Map<string, string>();
  for (const l of LINES) byOrder.set(l.productName, l.order);
  for (const u of updated) {
    console.log(`OK  ${byOrder.get(u.product_name)} — ${u.product_brand} — ${u.product_name}`);
  }
  console.log(`\nMarked ${updated.length} line(s) as in_lebanon = true.`);
}

main().catch((err) => {
  console.error("Failed:", err);
  process.exit(1);
});
