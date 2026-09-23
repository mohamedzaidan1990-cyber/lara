/**
 * 1) Move the fully-ready orders (every item in_lebanon) to
 *    status = 'ready_to_deliver', and save each one's invoice PDF into
 *    ~/Desktop/Ready to Deliver Invoices/.
 * 2) For the partially-ready orders (some items in_lebanon, not all),
 *    generate a partial-delivery invoice — each line marked "Ready now" or
 *    "Pending", with the pending items' dollar total shown as the
 *    remaining balance — and save into
 *    ~/Desktop/Partial Delivery Invoices/. Order status is NOT changed.
 * 3) Orders already in 'partially_delivered' status are left completely
 *    alone (excluded from both folders), per instruction.
 *
 * This calls lib/invoice.ts's generateInvoice() directly and writes files
 * locally — it does not touch orders.invoice_pdf, does not send emails or
 * WhatsApp messages, and does not reset payment_confirmed (unlike the
 * admin "generate invoice" API route, which is for a different purpose).
 *
 * Run:  npx ts-node scripts/generate-lebanon-invoices.ts
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
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

const DESKTOP = join(os.homedir(), "Desktop");
const FULL_DIR = join(DESKTOP, "Ready to Deliver Invoices");
const PARTIAL_DIR = join(DESKTOP, "Partial Delivery Invoices");

interface OrderMeta {
  id: string;
  order_number: string;
  status: string;
  created_at: string;
  payment_method: string | null;
  total_usd: string | number;
  amount_paid_usd: string | number | null;
  promo_entry: boolean | null;
  customer_email: string | null;
  full_name: string;
  phone: string;
  address: string;
}

function safeFilename(orderNumber: string, name: string): string {
  return `${orderNumber} - ${name.replace(/[\\/:*?"<>|]/g, "").trim()}.pdf`;
}

async function main(): Promise<void> {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL is not set.");
    process.exit(1);
  }
  const sql = getSql();
  mkdirSync(FULL_DIR, { recursive: true });
  mkdirSync(PARTIAL_DIR, { recursive: true });

  // Orders with >= 1 in_lebanon item, live + confirmed, EXCLUDING ones
  // already partially_delivered (leave those alone entirely).
  const orderRows = (await sql`
    select o.id, o.order_number, o.status, o.created_at, o.payment_method, o.total_usd,
           o.amount_paid_usd, o.promo_entry, o.customer_email,
           coalesce(c.full_name, '') as full_name, coalesce(c.phone, '') as phone, coalesce(c.address, '') as address,
           count(*)::int as total_items,
           count(*) filter (where oi.in_lebanon = true)::int as in_lebanon_items
    from orders o
    join order_items oi on oi.order_id = o.id
    left join customers c on c.id = o.customer_id
    where o.status not in ('cancelled', 'refunded', 'delivered', 'partially_delivered')
      and o.payment_confirmed = true
    group by o.id, o.order_number, o.status, o.created_at, o.payment_method, o.total_usd,
             o.amount_paid_usd, o.promo_entry, o.customer_email, c.full_name, c.phone, c.address
    having count(*) filter (where oi.in_lebanon = true) > 0
  `) as Array<OrderMeta & { total_items: number; in_lebanon_items: number }>;

  const fullReady = orderRows.filter((o) => o.in_lebanon_items === o.total_items);
  const partialReady = orderRows.filter((o) => o.in_lebanon_items < o.total_items);

  console.log(`Full-ready: ${fullReady.length}  |  Partial-ready: ${partialReady.length}\n`);

  // ---- 1) Full-ready: bump status, save plain invoice ----
  for (const o of fullReady) {
    if (o.status !== "ready_to_deliver") {
      await sql`update orders set status = 'ready_to_deliver', updated_at = now() where id = ${o.id}`;
    }
    const itemRows = (await sql`
      select product_brand as brand, product_name as name, quantity, price_usd
      from order_items where order_id = ${o.id} order by created_at asc
    `) as Array<{ brand: string; name: string; quantity: number; price_usd: string | number }>;
    const items: InvoiceItem[] = itemRows.map((r) => ({
      brand: r.brand,
      name: r.name,
      quantity: Number(r.quantity) || 1,
      price_usd: Number(r.price_usd) || 0
    }));
    const pdf = generateInvoice(
      {
        order_number: o.order_number,
        created_at: o.created_at,
        payment_confirmed: true,
        payment_method: o.payment_method,
        total_usd: Number(o.total_usd) || 0,
        amount_paid_usd: Number(o.amount_paid_usd) || undefined,
        promo_entry: !!o.promo_entry
      },
      { full_name: o.full_name, email: o.customer_email ?? "", phone: o.phone, address: o.address },
      items
    );
    const path = join(FULL_DIR, safeFilename(o.order_number, o.full_name));
    writeFileSync(path, pdf);
    console.log(`FULL     ${o.order_number} — ${o.full_name} -> ready_to_deliver, invoice saved`);
  }

  // ---- 2) Partial-ready: mark items ready/pending, save partial invoice, no status change ----
  for (const o of partialReady) {
    const itemRows = (await sql`
      select product_brand as brand, product_name as name, quantity, price_usd, in_lebanon
      from order_items where order_id = ${o.id} order by created_at asc
    `) as Array<{ brand: string; name: string; quantity: number; price_usd: string | number; in_lebanon: boolean | null }>;
    const items: InvoiceItem[] = itemRows.map((r) => ({
      brand: r.brand,
      name: r.name,
      quantity: Number(r.quantity) || 1,
      price_usd: Number(r.price_usd) || 0,
      ready: !!r.in_lebanon
    }));
    const pdf = generateInvoice(
      {
        order_number: o.order_number,
        created_at: o.created_at,
        payment_confirmed: true,
        payment_method: o.payment_method,
        total_usd: Number(o.total_usd) || 0,
        amount_paid_usd: Number(o.amount_paid_usd) || undefined,
        promo_entry: !!o.promo_entry
      },
      { full_name: o.full_name, email: o.customer_email ?? "", phone: o.phone, address: o.address },
      items
    );
    const path = join(PARTIAL_DIR, safeFilename(o.order_number, o.full_name));
    writeFileSync(path, pdf);
    console.log(`PARTIAL  ${o.order_number} — ${o.full_name} — ${o.in_lebanon_items}/${o.total_items} ready, invoice saved (status unchanged: ${o.status})`);
  }

  console.log(`\nSaved ${fullReady.length} invoice(s) to ${FULL_DIR}`);
  console.log(`Saved ${partialReady.length} invoice(s) to ${PARTIAL_DIR}`);
}

main().catch((err) => {
  console.error("Failed:", err);
  process.exit(1);
});
