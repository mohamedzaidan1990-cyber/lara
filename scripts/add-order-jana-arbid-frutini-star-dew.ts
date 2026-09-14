/**
 * Order for existing customer Jana Arbid: Sol De Janeiro Cheeky Frutini
 * Perfume Mist 90ml + Bubble Star Dew Hydrating Eye Cream. Payment: cod,
 * confirmed — per standing instruction ([[lara_order_entry_defaults]]).
 *
 * Run:  npx ts-node scripts/add-order-jana-arbid-frutini-star-dew.ts
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

import { ensureSchema, getSql, generateOrderNumber } from "../lib/db";

const PRODUCT_IDS = [
  "02e1a675-4e81-4d05-9d32-03bbfd9a79db", // Sol De Janeiro Cheeky Frutini Perfume Mist 90ml
  "827b74fa-fe7d-433d-a2a4-9013629abe43" // Bubble Star Dew - Hydrating Eye Cream
];

const CUSTOMER = {
  full_name: "Jana Arbid",
  phone: "03657195",
  address: "Ain el Mraysse. shere3 dar el mraysse wara el jeme3 bi wej mat3am el itale bineyet 5th avenue. tabe2 12 bet hadi arbid"
};
const SOURCE = "instagram";

async function main(): Promise<void> {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL is not set.");
    process.exit(1);
  }
  await ensureSchema();
  const sql = getSql();

  const productRows = (await sql`
    select id, brand, name, price_usd, price_gbp, product_url, image_url
    from products where id in (${PRODUCT_IDS[0]}, ${PRODUCT_IDS[1]})
  `) as Array<{ id: string; brand: string; name: string; price_usd: string; price_gbp: string; product_url: string | null; image_url: string | null }>;
  const byId = new Map(productRows.map((p) => [p.id, p]));
  const items = PRODUCT_IDS.map((id) => byId.get(id));
  if (items.some((it) => !it)) {
    console.error("One or more products not found — aborting.");
    process.exit(1);
  }
  const resolvedItems = items as Array<NonNullable<(typeof items)[number]>>;

  const custRows = (await sql`
    insert into customers (full_name, phone, address)
    values (${CUSTOMER.full_name}, ${CUSTOMER.phone}, ${CUSTOMER.address})
    returning id
  `) as Array<{ id: string }>;
  const customerId = custRows[0].id;

  const totalUsd = resolvedItems.reduce((s, i) => s + Number(i.price_usd), 0);
  const totalGbp = resolvedItems.reduce((s, i) => s + Number(i.price_gbp), 0);
  const orderNumber = generateOrderNumber();

  const orderRows = (await sql`
    insert into orders (
      order_number, customer_id, customer_email,
      product_name, product_brand,
      price_usd, price_gbp, total_usd, total_gbp, items_count,
      status, payment_method, payment_confirmed, source
    )
    values (
      ${orderNumber}, ${customerId}, ${null},
      ${resolvedItems.length + " items"}, ${"Multiple brands"},
      ${totalUsd}, ${totalGbp}, ${totalUsd}, ${totalGbp}, ${resolvedItems.length},
      ${"payment_confirmed"}, ${"cod"}, ${true}, ${SOURCE}
    )
    returning id, order_number
  `) as Array<{ id: string; order_number: string }>;
  const order = orderRows[0];

  for (const it of resolvedItems) {
    await sql`
      insert into order_items (order_id, product_name, product_brand, product_url, image_url, price_usd, price_gbp, quantity)
      values (${order.id}, ${it.name}, ${it.brand}, ${it.product_url}, ${it.image_url}, ${Number(it.price_usd)}, ${Number(it.price_gbp)}, 1)
    `;
    console.log(`  + ${it.brand} — ${it.name} ($${it.price_usd})`);
  }

  console.log(`OK  ${order.order_number} — ${CUSTOMER.full_name} — $${totalUsd} — cod / confirmed`);
}

main().catch((err) => {
  console.error("Failed:", err);
  process.exit(1);
});
