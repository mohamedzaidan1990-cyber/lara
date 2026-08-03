/**
 * Adds Huda Beauty Easy Bake loose baking and setting powder 20g
 * (shade: 2 POUND CAKE) to order SBB-601276.
 *
 * Run:  npx ts-node scripts/add-item-sbb-601276.ts
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

  const orderRows = (await sql`SELECT id FROM orders WHERE order_number = 'SBB-601276' LIMIT 1`) as Array<{ id: string }>;
  if (!orderRows.length) {
    console.error("Order SBB-601276 not found");
    process.exit(1);
  }
  const orderId = orderRows[0].id;

  const item = {
    brand: "Huda Beauty",
    name: "Easy Bake loose baking and setting powder 20g — Shade: 2 POUND CAKE",
    product_url: "https://seasonsbyb.co.uk/product/396addee-ea4d-4998-be3e-717e9ec7b4c7",
    image_url: "https://images.selfridges.com/is/image/selfridges/1036-3005459-HBLPOWD006_M?wid=363&hei=485&fmt=webp&qlt=80",
    price_gbp: 34,
    price_usd: 55,
    quantity: 1
  };

  const newRows = (await sql`
    INSERT INTO order_items (order_id, product_brand, product_name, price_gbp, price_usd, quantity, product_url, image_url)
    VALUES (${orderId}, ${item.brand}, ${item.name}, ${item.price_gbp}, ${item.price_usd}, ${item.quantity}, ${item.product_url}, ${item.image_url})
    RETURNING id, product_brand AS brand, product_name AS name, price_gbp, price_usd, quantity
  `) as Array<{ id: string; brand: string; name: string; price_gbp: string; price_usd: string; quantity: number }>;

  const totals = (await sql`
    UPDATE orders
    SET total_usd   = (SELECT COALESCE(SUM(price_usd * quantity), 0) FROM order_items WHERE order_id = ${orderId}),
        total_gbp   = (SELECT COALESCE(SUM(price_gbp * quantity), 0) FROM order_items WHERE order_id = ${orderId}),
        items_count = (SELECT COUNT(*)::int FROM order_items WHERE order_id = ${orderId}),
        updated_at  = now()
    WHERE id = ${orderId}
    RETURNING order_number, total_usd, total_gbp, items_count
  `) as Array<{ order_number: string; total_usd: string; total_gbp: string; items_count: number }>;

  console.log(`Added "${newRows[0].name}" ($${newRows[0].price_usd}) to ${totals[0].order_number}`);
  console.log(`Order now: ${totals[0].items_count} items, $${totals[0].total_usd} / £${totals[0].total_gbp}`);
}

main().catch((err) => {
  console.error("Insert failed:", err);
  process.exit(1);
});
