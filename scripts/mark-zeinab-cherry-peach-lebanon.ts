/**
 * Zeinab Ismail's Easy Bake Duo Loose Powder — Cherry Peach (SBB-772161)
 * reached Lebanon. Her order's other 2 items were already marked earlier;
 * this completes it (3/3), so also moves the order to ready_to_deliver
 * and saves its invoice.
 *
 * Run:  npx ts-node scripts/mark-zeinab-cherry-peach-lebanon.ts
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { resolve, join } from "node:path";
import os from "node:os";
function loadDotenv(file: string): void {
  let text: string;
  try { text = readFileSync(resolve(process.cwd(), file), "utf8"); } catch { return; }
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

const ORDER_NUMBER = "SBB-772161";
const PRODUCT_NAME = "Easy Bake Duo Loose Powder 6.5g — Shade: Cherry Peach";

async function main() {
  const sql = getSql();
  const updated = (await sql`
    update order_items set in_lebanon = true
    where order_id = (select id from orders where order_number = ${ORDER_NUMBER})
      and product_name = ${PRODUCT_NAME}
      and sourced = true
    returning id
  `) as Array<{ id: string }>;
  if (updated.length !== 1) {
    console.error(`Expected exactly 1 row, got ${updated.length} — aborting.`);
    process.exit(1);
  }

  const counts = (await sql`
    select count(*)::int as total, count(*) filter (where in_lebanon = true)::int as in_lebanon
    from order_items where order_id = (select id from orders where order_number = ${ORDER_NUMBER})
  `) as Array<{ total: number; in_lebanon: number }>;
  console.log(`SBB-772161 — Cherry Peach marked in_lebanon (${counts[0].in_lebanon}/${counts[0].total} items now in Lebanon)`);

  if (counts[0].in_lebanon !== counts[0].total) {
    console.log("Not fully ready yet — no status change.");
    return;
  }

  const orderRows = (await sql`
    select o.id, o.created_at, o.payment_method, o.total_usd::float8 as total_usd,
           o.amount_paid_usd, o.promo_entry, o.customer_email,
           c.full_name, c.phone, c.address
    from orders o join customers c on c.id = o.customer_id
    where o.order_number = ${ORDER_NUMBER}
  `) as any[];
  const o = orderRows[0];
  await sql`update orders set status = 'ready_to_deliver', updated_at = now() where id = ${o.id}`;

  const itemRows = (await sql`select product_brand as brand, product_name as name, quantity, price_usd from order_items where order_id = ${o.id}`) as any[];
  const items: InvoiceItem[] = itemRows.map((r) => ({ brand: r.brand, name: r.name, quantity: Number(r.quantity) || 1, price_usd: Number(r.price_usd) || 0 }));
  const pdf = generateInvoice(
    { order_number: ORDER_NUMBER, created_at: o.created_at, payment_confirmed: true, payment_method: o.payment_method, total_usd: o.total_usd, amount_paid_usd: Number(o.amount_paid_usd) || undefined, promo_entry: !!o.promo_entry },
    { full_name: o.full_name, email: o.customer_email ?? "", phone: o.phone, address: o.address },
    items
  );
  const dir = join(os.homedir(), "Desktop", "Ready to Deliver Invoices");
  mkdirSync(dir, { recursive: true });
  const path = join(dir, `${ORDER_NUMBER} - ${o.full_name}.pdf`);
  writeFileSync(path, pdf);
  console.log(`OK  ${ORDER_NUMBER} — ${o.full_name} -> ready_to_deliver, invoice saved`);
}
main().catch((err) => { console.error("Failed:", err); process.exit(1); });
