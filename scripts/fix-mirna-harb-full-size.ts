/**
 * Correction: Mirna Harb's order was created with the wrong size — "Easy
 * Bake Mini Loose Powder" — when unstated size means FULL SIZE (standing
 * preference going forward). Fixes SBB-512016 to the full-size product:
 * "Easy Bake loose baking and setting powder 20g — Shade: Cherry Blossom
 * Cake", $55 (matches every prior order for this exact full-size shade —
 * SBB-649268, SBB-104830). Cost stays $32 as originally reported,
 * sourced/in_lebanon stay true. Also regenerates the invoice PDF already
 * saved to the Ready to Deliver folder.
 *
 * Run:  npx ts-node scripts/fix-mirna-harb-full-size.ts
 */
import { readFileSync, writeFileSync, unlinkSync, existsSync } from "node:fs";
import { resolve, join } from "node:path";
import os from "node:os";

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
import { generateInvoice, type InvoiceItem } from "../lib/invoice";

const ORDER_NUMBER = "SBB-512016";
const FULL_SIZE_PRODUCT_ID = "396addee-ea4d-4998-be3e-717e9ec7b4c7"; // Easy Bake loose baking and setting powder 20g
const SHADE_NAME = "Cherry Blossom Cake";
const PRICE_USD = 55;
const round2 = (n: number): number => Math.round(n * 100) / 100;

async function main(): Promise<void> {
  const sql = getSql();

  const order = (await sql`
    select o.id, o.created_at, o.payment_method, o.amount_paid_usd, o.promo_entry, o.customer_email,
           c.full_name, c.phone, c.address
    from orders o join customers c on c.id = o.customer_id
    where o.order_number = ${ORDER_NUMBER}
  `) as Array<{ id: string; created_at: string; payment_method: string | null; amount_paid_usd: string | null; promo_entry: boolean | null; customer_email: string | null; full_name: string; phone: string; address: string }>;
  if (!order.length) {
    console.error(`${ORDER_NUMBER} not found.`);
    process.exit(1);
  }
  const o = order[0];

  const prod = (await sql`select brand, name, product_url from products where id = ${FULL_SIZE_PRODUCT_ID}`) as Array<{ brand: string; name: string; product_url: string | null }>;
  const variant = (await sql`select shade_image_url from product_variants where product_id = ${FULL_SIZE_PRODUCT_ID} and shade_name = ${SHADE_NAME}`) as Array<{ shade_image_url: string | null }>;
  const fullName = `${prod[0].name} — Shade: ${SHADE_NAME}`;
  const priceGbp = round2(PRICE_USD / 1.35);

  await sql`
    update order_items
    set product_name = ${fullName}, product_url = ${prod[0].product_url}, image_url = ${variant[0]?.shade_image_url ?? null},
        price_usd = ${PRICE_USD}, price_gbp = ${priceGbp}
    where order_id = ${o.id}
  `;
  await sql`
    update orders
    set product_name = ${fullName}, price_usd = ${PRICE_USD}, price_gbp = ${priceGbp},
        total_usd = ${PRICE_USD}, total_gbp = ${priceGbp}, updated_at = now()
    where id = ${o.id}
  `;

  const items: InvoiceItem[] = [{ brand: prod[0].brand, name: fullName, quantity: 1, price_usd: PRICE_USD }];
  const pdf = generateInvoice(
    {
      order_number: ORDER_NUMBER,
      created_at: o.created_at,
      payment_confirmed: true,
      payment_method: o.payment_method,
      total_usd: PRICE_USD,
      amount_paid_usd: Number(o.amount_paid_usd) || undefined,
      promo_entry: !!o.promo_entry
    },
    { full_name: o.full_name, email: o.customer_email ?? "", phone: o.phone, address: o.address },
    items
  );
  const dir = join(os.homedir(), "Desktop", "Ready to Deliver Invoices");
  const path = join(dir, `${ORDER_NUMBER} - ${o.full_name}.pdf`);
  if (existsSync(path)) unlinkSync(path);
  writeFileSync(path, pdf);

  console.log(`OK  ${ORDER_NUMBER} — ${o.full_name} -> ${fullName} — $${PRICE_USD} — invoice regenerated`);
}

main().catch((err) => {
  console.error("Failed:", err);
  process.exit(1);
});
