/**
 * Fulfil awaiting order lines with items just bought, and put the leftover
 * in stock. Per instruction: never mark a pending/unconfirmed order as
 * sourced — SBB-192673 (Sh) is pending, so its Cherry Peach duo powder line
 * is left untouched and the unit meant for it goes to stock instead.
 *
 * Purchased:
 *   1x Easy Bake Mini Loose Powder — Cherry Blossom          $21.00
 *   1x Kayali Yum Boujee Marshmallow body cream               $41.15
 *   2x Easy Bake Duo Loose Powder — Cherry Peach               $72.82 total ($36.41 each)
 *   1x ONE/SIZE On 'Til Dawn Setting Spray                    $37.00
 *   1x Easy Bake loose baking and setting powder 20g —
 *      Cherry Blossom Cake (full size)                        $31.55
 *
 * Matched to awaiting order lines (exactly one unsourced, live line each):
 *   SBB-100185  Mahassen Karout   Easy Bake Mini Loose Powder — CHERRY BLOSSOM
 *   SBB-887832  Zahia Krecht Khatoun  Kayali Yum Boujee Marshmallow
 *   SBB-882692  Zainab Moussawi   ONE/SIZE On 'Til Dawn Setting Spray
 *   SBB-772161  Zeinab Ismail     Easy Bake Duo Loose Powder — Cherry Peach
 *
 * Left in stock (no confirmed awaiting order for it):
 *   1x Easy Bake Duo Loose Powder — Cherry Peach (would have gone to
 *      SBB-192673 / Sh, but that order is still pending payment)
 *   1x Easy Bake loose baking and setting powder 20g — Cherry Blossom Cake
 *      (no live order wants this size/shade at all — the only two past
 *      orders for it are already delivered)
 *
 * cost_gbp = cost_usd / 1.3, as in the other mark-sourced scripts.
 *
 * Run:  npx ts-node scripts/source-purchased-batch-sept23.ts
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
const gbpFromUsd = (usd: number): number => round2(usd / 1.3);

const CHERRY_PEACH_UNIT_USD = round2(72.82 / 2); // 36.41

const SOURCE_LINES: Array<{ order: string; namePrefix: string; costUsd: number }> = [
  { order: "SBB-100185", namePrefix: "Easy Bake Mini Loose Powder", costUsd: 21 },
  { order: "SBB-887832", namePrefix: "Yum Boujee Marshmallow", costUsd: 41.15 },
  { order: "SBB-882692", namePrefix: "On 'Til Dawn Mattifying Waterproof Setting Spray", costUsd: 37 },
  { order: "SBB-772161", namePrefix: "Easy Bake Duo Loose Powder", costUsd: CHERRY_PEACH_UNIT_USD }
];

const STOCK_ITEMS: Array<{
  product_id: string | null;
  product_name: string;
  product_brand: string;
  product_url: string | null;
  image_url: string | null;
  cost_usd: number;
  notes: string;
}> = [
  {
    product_id: "a37a42c8-4115-4604-bec7-5971068c72de",
    product_name: "Easy Bake Duo Loose Powder 6.5g — Cherry Peach",
    product_brand: "Huda Beauty",
    product_url: "https://www.selfridges.com/GB/en/product/huda-beauty-easy-bake-duo-loose-powder-65g_R04537837/",
    image_url: "https://images.selfridges.com/is/image/selfridges/R04537837_M?wid=363&hei=485&fmt=webp&qlt=80",
    cost_usd: CHERRY_PEACH_UNIT_USD,
    notes: "Bought for SBB-192673 (Sh), but that order is still pending payment — held in stock instead."
  },
  {
    product_id: "396addee-ea4d-4998-be3e-717e9ec7b4c7",
    product_name: "Easy Bake loose baking and setting powder 20g — Cherry Blossom Cake",
    product_brand: "Huda Beauty",
    product_url: "https://www.selfridges.com/GB/en/product/huda-beauty-easy-bake-loose-baking-and-setting-powder-20g_1036-3005459-HBLPOWD006/",
    image_url: "https://images.selfridges.com/is/image/selfridges/1036-3005459-HBLPOWD006_M?wid=363&hei=485&fmt=webp&qlt=80",
    cost_usd: 31.55,
    notes: "No live order for this size/shade — bought speculatively."
  }
];

async function main(): Promise<void> {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL is not set.");
    process.exit(1);
  }
  const sql = getSql();

  // ---- 1) source the 4 matched order lines ----
  for (const l of SOURCE_LINES) {
    const rows = (await sql`
      select oi.id, oi.product_name, o.status, o.payment_confirmed
      from order_items oi join orders o on o.id = oi.order_id
      where o.order_number = ${l.order}
        and o.status not in ('cancelled', 'refunded')
        and coalesce(oi.sourced, false) = false
        and oi.product_name like ${l.namePrefix + "%"}
    `) as Array<{ id: string; product_name: string; status: string; payment_confirmed: boolean }>;
    if (rows.length !== 1) {
      console.error(`Expected exactly 1 unsourced line for ${l.order} / "${l.namePrefix}", found ${rows.length} — aborting, nothing changed.`);
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

  // ---- 2) leftover units into stock ----
  for (const s of STOCK_ITEMS) {
    const costGbp = gbpFromUsd(s.cost_usd);
    const inserted = (await sql`
      insert into stock_items (product_id, product_name, product_brand, product_url, image_url, cost_usd, cost_gbp, quantity, notes, purchased_at)
      values (${s.product_id}, ${s.product_name}, ${s.product_brand}, ${s.product_url}, ${s.image_url}, ${s.cost_usd}, ${costGbp}, ${1}, ${s.notes}, current_date)
      returning id
    `) as Array<{ id: string }>;
    console.log(`STOCK  ${s.product_brand} — ${s.product_name} — $${s.cost_usd} (£${costGbp}) — ${inserted[0].id}`);
  }
}

main().catch((err) => {
  console.error("Failed:", err);
  process.exit(1);
});
