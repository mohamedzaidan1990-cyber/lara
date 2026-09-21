/**
 * Order SBB-204161 (Tia Abboud, Whish link, $180 received): bring the total
 * from $181 to $180, per the user, by pricing the Charlotte Tilbury Airbrush
 * Flawless Setting Spray 100ml line at $55 instead of the $56 catalogue price.
 * The total then equals the $180 she paid, so the refreshed invoice reads
 * "Paid in Full" instead of showing a $1 balance.
 *
 * Only that order line changes (price_usd 56 -> 55; price_gbp scaled by the
 * same 55/56 so the reference ratio is kept). Order totals are recomputed from
 * order_items like the add-items script, and the stored invoice is regenerated
 * with lib/invoice.ts. Nothing is emailed or WhatsApped; invoice_sent_at (the
 * original 11 Sep send) is left untouched. The catalogue price of the spray is
 * NOT changed.
 *
 * Run:  npx ts-node scripts/fix-sbb-204161-spray-55.ts
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
import { generateInvoice } from "../lib/invoice";

const ORDER_NUMBER = "SBB-204161";
const CUSTOMER_NAME = "Tia Abboud";
const LINE_NAME = "Airbrush Flawless Setting Spray 100ml";
const OLD_PRICE_USD = 56;
const NEW_PRICE_USD = 55;

const round2 = (n: number): number => Math.round(n * 100) / 100;

async function main(): Promise<void> {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL is not set.");
    process.exit(1);
  }
  const sql = getSql();

  const orderRows = (await sql`
    select o.id, o.order_number, o.created_at, o.payment_method, o.amount_paid_usd, o.promo_entry,
           o.customer_email,
           coalesce(c.full_name, '') as full_name, coalesce(c.phone, '') as phone, coalesce(c.address, '') as address
    from orders o left join customers c on c.id = o.customer_id
    where o.order_number = ${ORDER_NUMBER} limit 1
  `) as Array<{
    id: string; order_number: string; created_at: string; payment_method: string | null;
    amount_paid_usd: string | null; promo_entry: boolean | null; customer_email: string | null;
    full_name: string; phone: string; address: string;
  }>;
  if (!orderRows.length || orderRows[0].full_name !== CUSTOMER_NAME) {
    console.error(`${ORDER_NUMBER} not found or not ${CUSTOMER_NAME} — aborting.`);
    process.exit(1);
  }
  const order = orderRows[0];

  // Only touch the spray line, and only if it is still at the old price.
  const lines = (await sql`
    select id, price_gbp from order_items
    where order_id = ${order.id} and product_name = ${LINE_NAME} and price_usd = ${OLD_PRICE_USD}
  `) as Array<{ id: string; price_gbp: string }>;
  if (lines.length !== 1) {
    console.error(`Expected exactly 1 "${LINE_NAME}" line at $${OLD_PRICE_USD}, found ${lines.length} — aborting, nothing changed.`);
    process.exit(1);
  }
  const newGbp = round2(Number(lines[0].price_gbp) * (NEW_PRICE_USD / OLD_PRICE_USD));

  await sql`
    update order_items set price_usd = ${NEW_PRICE_USD}, price_gbp = ${newGbp}
    where id = ${lines[0].id}
  `;

  const upd = (await sql`
    with agg as (
      select coalesce(sum(price_usd * quantity), 0) as total_usd,
             coalesce(sum(price_gbp * quantity), 0) as total_gbp
      from order_items where order_id = ${order.id}
    )
    update orders o
    set total_usd = agg.total_usd, total_gbp = agg.total_gbp,
        price_usd = agg.total_usd, price_gbp = agg.total_gbp, updated_at = now()
    from agg where o.id = ${order.id}
    returning o.total_usd, o.total_gbp
  `) as Array<{ total_usd: string; total_gbp: string }>;
  const totalUsd = Number(upd[0].total_usd);
  const amountPaid = Number(order.amount_paid_usd) || 0;

  const itemRows = (await sql`
    select product_brand as brand, product_name as name, quantity, price_usd
    from order_items where order_id = ${order.id} order by created_at asc
  `) as Array<{ brand: string; name: string; quantity: number; price_usd: string }>;

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

  console.log(`OK  ${ORDER_NUMBER}: spray $${OLD_PRICE_USD} -> $${NEW_PRICE_USD}, total $${totalUsd}, paid $${amountPaid}, balance $${Math.max(0, totalUsd - amountPaid)} — invoice refreshed (not sent)`);
}

main().catch((err) => {
  console.error("Failed:", err);
  process.exit(1);
});
