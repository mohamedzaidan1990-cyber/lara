/**
 * Adds one line item to existing order SBB-812745 (Nour Akkouch, COD,
 * confirmed) and creates/refreshes its stored invoice:
 *   1x Huda Beauty Blush Filter 4.5ml — Colour: STRAWBERRY CREAM
 *      (catalogue product f18171fb-010f-4ab8-90f3-6313d96b29a8, catalogue price;
 *      the shade is appended to the product name, as on other order lines)
 *
 * Mirrors app/api/admin/orders/[id]/items/route.ts + the SBB-587900 script:
 * inserts the item, then recomputes total / items_count / summary from
 * order_items. Then generates the invoice PDF with lib/invoice.ts and stores it
 * in invoice_pdf. It does NOT email or WhatsApp anyone; invoice_sent_at stays
 * as it was (empty — nothing has been sent).
 *
 * Run:  npx ts-node scripts/add-item-to-sbb-812745.ts
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
import { generateInvoice } from "../lib/invoice";

const ORDER_NUMBER = "SBB-812745";
const PRODUCT_ID = "f18171fb-010f-4ab8-90f3-6313d96b29a8";
const SHADE_SUFFIX = " — Colour: STRAWBERRY CREAM";

async function main(): Promise<void> {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL is not set.");
    process.exit(1);
  }
  await ensureSchema();
  const sql = getSql();

  const orderRows = (await sql`
    select o.id, o.order_number, o.created_at, o.payment_method, o.amount_paid_usd,
           o.promo_entry, o.customer_email,
           coalesce(c.full_name, '') as full_name, coalesce(c.phone, '') as phone, coalesce(c.address, '') as address
    from orders o left join customers c on c.id = o.customer_id
    where o.order_number = ${ORDER_NUMBER} limit 1
  `) as Array<{
    id: string; order_number: string; created_at: string; payment_method: string | null;
    amount_paid_usd: string | null; promo_entry: boolean | null; customer_email: string | null;
    full_name: string; phone: string; address: string;
  }>;
  if (!orderRows.length) {
    console.error(`Order ${ORDER_NUMBER} not found`);
    process.exit(1);
  }
  const order = orderRows[0];

  const prod = (await sql`
    select brand, name, price_usd, price_gbp, product_url, image_url
    from products where id = ${PRODUCT_ID} and not archived limit 1
  `) as Array<{ brand: string; name: string; price_usd: string; price_gbp: string; product_url: string | null; image_url: string | null }>;
  if (!prod.length) {
    console.error("Product not found in products — aborting.");
    process.exit(1);
  }
  const p = { ...prod[0], name: prod[0].name + SHADE_SUFFIX };

  // Guard against running twice.
  const dupe = (await sql`
    select 1 from order_items where order_id = ${order.id} and product_name = ${p.name} limit 1
  `) as Array<unknown>;
  if (dupe.length) {
    console.error("This shade is already on the order — aborting to avoid a duplicate line.");
    process.exit(1);
  }

  await sql`
    insert into order_items (
      order_id, product_brand, product_name, product_url, image_url,
      price_gbp, price_usd, quantity
    )
    values (
      ${order.id}, ${p.brand}, ${p.name}, ${p.product_url}, ${p.image_url},
      ${Number(p.price_gbp)}, ${Number(p.price_usd)}, ${1}
    )
  `;
  console.log(`  + ${p.brand} — ${p.name} ($${Number(p.price_usd)})`);

  const upd = (await sql`
    with agg as (
      select
        coalesce(sum(price_usd * quantity), 0) as total_usd,
        coalesce(sum(price_gbp * quantity), 0) as total_gbp,
        count(*)::int as items_count,
        count(distinct product_brand) as brand_count
      from order_items where order_id = ${order.id}
    )
    update orders o
    set total_usd     = agg.total_usd,
        total_gbp     = agg.total_gbp,
        price_usd     = agg.total_usd,
        price_gbp     = agg.total_gbp,
        items_count   = agg.items_count,
        product_name  = agg.items_count || ' items',
        product_brand = case when agg.brand_count = 1
                            then (select product_brand from order_items where order_id = ${order.id} limit 1)
                            else 'Multiple brands' end,
        updated_at    = now()
    from agg
    where o.id = ${order.id}
    returning o.total_usd, o.total_gbp, o.items_count
  `) as Array<{ total_usd: string; total_gbp: string; items_count: number }>;
  const totalUsd = Number(upd[0].total_usd);

  // Refresh the stored invoice (not sent).
  const itemRows = (await sql`
    select product_brand as brand, product_name as name, quantity, price_usd
    from order_items where order_id = ${order.id} order by created_at asc
  `) as Array<{ brand: string; name: string; quantity: number; price_usd: string }>;
  const amountPaid = Number(order.amount_paid_usd) || 0;

  const pdf = generateInvoice(
    {
      order_number: order.order_number,
      created_at: order.created_at,
      payment_confirmed: true,
      payment_method: order.payment_method,
      total_usd: totalUsd,
      amount_paid_usd: amountPaid || undefined,
      promo_entry: !!order.promo_entry
    },
    { full_name: order.full_name, email: order.customer_email ?? "", phone: order.phone, address: order.address },
    itemRows.map((r) => ({ brand: r.brand, name: r.name, quantity: Number(r.quantity) || 1, price_usd: Number(r.price_usd) || 0 }))
  );
  await sql`update orders set invoice_pdf = ${pdf.toString("base64")} where id = ${order.id}`;

  console.log(
    `OK  ${ORDER_NUMBER}: ${upd[0].items_count} items, total $${totalUsd}, paid $${amountPaid}, balance $${Math.max(0, totalUsd - amountPaid)} — invoice refreshed (not sent)`
  );
}

main().catch((err) => {
  console.error("Failed:", err);
  process.exit(1);
});
