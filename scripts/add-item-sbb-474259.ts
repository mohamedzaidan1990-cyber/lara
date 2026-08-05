/**
 * Adds Fenty Beauty Butta Drop Hydrating Body Milk to order SBB-474259.
 * Bought for $35.67 (actual cost, distinct from the $52 catalog/customer
 * price). Marks the new item + all existing items on this order as
 * in_lebanon = true and moves the order to status 'ready_to_deliver',
 * per the user's note that the whole order is already in Lebanon and
 * ready for delivery.
 *
 * Run:  npx ts-node scripts/add-item-sbb-474259.ts
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

async function main(): Promise<void> {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL is not set. Make sure .env.local exists in the project root.");
    process.exit(1);
  }

  await ensureSchema();
  const sql = getSql();

  const orderRows = (await sql`SELECT id FROM orders WHERE order_number = 'SBB-474259' LIMIT 1`) as Array<{ id: string }>;
  if (!orderRows.length) {
    console.error("Order SBB-474259 not found");
    process.exit(1);
  }
  const orderId = orderRows[0].id;

  const item = {
    brand: "Fenty Beauty",
    name: "Butta Drop Hydrating Body Milk",
    product_url: "https://seasonsbyb.co.uk/product/652ebfa3-91f1-444b-b269-20a90e1a0ab5",
    image_url: "https://cdn.shopify.com/s/files/1/0341/3458/9485/files/FSB_SPR26_T2PRODUCT_ECOMM_BODYMILK_LOTION_FENTYFRESH_1200X1500_72DPI_1.jpg?v=1783013212",
    price_gbp: 40,
    price_usd: 52,
    cost_usd: 35.67,
    quantity: 1
  };

  const newRows = (await sql`
    INSERT INTO order_items (order_id, product_brand, product_name, price_gbp, price_usd, quantity, product_url, image_url, cost_usd, sourced, in_lebanon)
    VALUES (${orderId}, ${item.brand}, ${item.name}, ${item.price_gbp}, ${item.price_usd}, ${item.quantity}, ${item.product_url}, ${item.image_url}, ${item.cost_usd}, true, true)
    RETURNING id, product_brand AS brand, product_name AS name, price_usd, cost_usd
  `) as Array<{ id: string; brand: string; name: string; price_usd: string; cost_usd: string }>;

  // The rest of this order's items are already in Lebanon too.
  await sql`UPDATE order_items SET in_lebanon = true WHERE order_id = ${orderId}`;

  const totals = (await sql`
    UPDATE orders
    SET total_usd   = (SELECT COALESCE(SUM(price_usd * quantity), 0) FROM order_items WHERE order_id = ${orderId}),
        total_gbp   = (SELECT COALESCE(SUM(price_gbp * quantity), 0) FROM order_items WHERE order_id = ${orderId}),
        items_count = (SELECT COUNT(*)::int FROM order_items WHERE order_id = ${orderId}),
        status      = 'ready_to_deliver',
        updated_at  = now()
    WHERE id = ${orderId}
    RETURNING order_number, total_usd, total_gbp, items_count, status
  `) as Array<{ order_number: string; total_usd: string; total_gbp: string; items_count: number; status: string }>;

  console.log(`Added "${newRows[0].name}" ($${newRows[0].price_usd}, cost $${newRows[0].cost_usd}) to ${totals[0].order_number}`);
  console.log(`Order now: ${totals[0].items_count} items, $${totals[0].total_usd} / £${totals[0].total_gbp}, status = ${totals[0].status}`);
}

main().catch((err) => {
  console.error("Insert failed:", err);
  process.exit(1);
});
