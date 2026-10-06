/**
 * Add Ariana Grande Mini Cloud & LOVENOTES Plush Vanilla Perfume Set to the
 * catalogue at $55 (user-given; image the user supplied) and add it to
 * Zaynab Al Moussawi's ready-to-deliver order SBB-509729 — bought at $18 and
 * already in Lebanon, so the order stays ready_to_deliver.
 *
 * Run:  npx tsx scripts/add-ariana-grande-set-to-zaynab-509729.ts
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

const ORDER_NUMBER = "SBB-509729";
const COST_USD = 18;
const round2 = (n: number): number => Math.round(n * 100) / 100;

const PRODUCT = {
  brand: "Ariana Grande",
  name: "Mini Cloud & LOVENOTES Plush Vanilla Perfume Set 2 x 7.5ml",
  category: "Fragrance",
  subcategory: "Gift Sets",
  description:
    "Two deluxe mini parfums in one set: Cloud, the uplifting signature scent, and LOVENOTES Plush Vanilla, a sweet and cosy vanilla gourmand. 2 x 7.5ml — perfect for travel or gifting.",
  product_url: "https://www.sephora.com/product/ariana-grande-cloud-lovenotes-plush-vanilla-parfum-duo-set-P518021",
  image_url: "/ariana-grande-mini-cloud-lovenotes-plush-vanilla-set.jpg",
  priceUsd: 55
};

async function main(): Promise<void> {
  const sql = getSql();

  const order = (await sql`select id, status from orders where order_number = ${ORDER_NUMBER}`) as Array<{ id: string; status: string }>;
  if (!order.length || ["delivered", "cancelled", "refunded"].includes(order[0].status)) {
    console.error(`${ORDER_NUMBER} not found or closed — aborting, nothing changed.`);
    process.exit(1);
  }
  const orderId = order[0].id;

  const priceGbp = round2(PRODUCT.priceUsd / 1.35);
  const prod = (await sql`
    insert into products (
      brand, name, category, subcategory, description,
      price_gbp, price_usd, product_url, image_url,
      price_locked, deliverable_lebanon
    )
    values (
      ${PRODUCT.brand}, ${PRODUCT.name}, ${PRODUCT.category}, ${PRODUCT.subcategory}, ${PRODUCT.description},
      ${priceGbp}, ${PRODUCT.priceUsd}, ${PRODUCT.product_url}, ${PRODUCT.image_url},
      true, true
    )
    on conflict (product_url) do update set
      description = excluded.description, price_gbp = excluded.price_gbp, price_usd = excluded.price_usd,
      image_url = excluded.image_url, price_locked = true
    returning id
  `) as Array<{ id: string }>;
  console.log(`OK  product ${PRODUCT.brand} — ${PRODUCT.name} — $${PRODUCT.priceUsd}  (${prod[0].id})`);

  const already = (await sql`select 1 from order_items where order_id = ${orderId} and product_url = ${PRODUCT.product_url}`) as unknown[];
  if (already.length) {
    console.error(`Already on ${ORDER_NUMBER} — not adding again.`);
    process.exit(1);
  }
  await sql`
    insert into order_items (order_id, product_name, product_brand, product_url, image_url, price_usd, price_gbp, quantity, cost_usd, cost_gbp, sourced, in_lebanon)
    values (${orderId}, ${PRODUCT.name}, ${PRODUCT.brand}, ${PRODUCT.product_url}, ${PRODUCT.image_url}, ${PRODUCT.priceUsd}, ${priceGbp}, ${1}, ${COST_USD}, ${round2(COST_USD / 1.3)}, ${true}, ${true})
  `;

  const t = ((await sql`
    select coalesce(sum(price_usd::float8 * quantity), 0) as total_usd, coalesce(sum(price_gbp::float8 * quantity), 0) as total_gbp,
           count(*)::int as items_count, round(sum(cost_usd)::numeric, 2)::float8 as cost
    from order_items where order_id = ${orderId}
  `) as Array<{ total_usd: number; total_gbp: number; items_count: number; cost: number | null }>)[0];
  await sql`
    update orders
    set price_usd = ${t.total_usd}, price_gbp = ${round2(t.total_gbp)}, total_usd = ${t.total_usd}, total_gbp = ${round2(t.total_gbp)},
        items_count = ${t.items_count}, product_name = ${t.items_count + " items"}, product_brand = 'Multiple brands',
        cost_usd = ${t.cost}, profit_usd = ${t.cost == null ? null : round2(t.total_usd - t.cost)},
        updated_at = now()
    where id = ${orderId}
  `;
  console.log(`OK  ${ORDER_NUMBER} — ${t.items_count} items — $${t.total_usd} total — cost $${t.cost}`);
}

main().catch((err) => {
  console.error("Failed:", err);
  process.exit(1);
});
