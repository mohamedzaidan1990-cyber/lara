/**
 * SBB-796186 (Aya Jouni) and SBB-816587 (Hiam Saad) — one Kiehl's Best
 * Sellers Hydrate & Help Protect set each ($80): sourced, paid in full and
 * delivered. Updates the DB directly rather than via PATCH /api/orders/[id]
 * so no WhatsApp/email notifications go out.
 *
 * Run:  npx tsx scripts/mark-delivered-sbb-796186-and-sbb-816587.ts
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
loadDotenv(".env.local");
loadDotenv(".env");

import { getSql } from "../lib/db";

const ORDERS = ["SBB-796186", "SBB-816587"];

async function main(): Promise<void> {
  const sql = getSql();

  // Validate before writing.
  const rows = (await sql`
    select o.id, o.order_number, o.status, o.total_usd, c.full_name
    from orders o left join customers c on c.id = o.customer_id
    where o.order_number = any(${ORDERS}::text[])
  `) as Array<{ id: string; order_number: string; status: string; total_usd: string; full_name: string }>;
  if (rows.length !== ORDERS.length || rows.some((r) => r.status === "cancelled")) {
    console.error("Unexpected order state — aborting, nothing changed.", rows);
    process.exit(1);
  }

  for (const r of rows) {
    await sql`update order_items set sourced = true where order_id = ${r.id}`;
    await sql`
      update orders
      set status = 'delivered', payment_confirmed = true, amount_paid_usd = total_usd,
          delivered_at = coalesce(delivered_at, now()), updated_at = now()
      where id = ${r.id}
    `;
    const o = (await sql`
      select status, amount_paid_usd, total_usd, delivered_at,
             (select bool_and(sourced) from order_items where order_id = ${r.id}) as all_sourced
      from orders where id = ${r.id}
    `) as Array<{ status: string; amount_paid_usd: string; total_usd: string; delivered_at: string; all_sourced: boolean }>;
    console.log(`OK  ${r.order_number} ${r.full_name} — ${o[0].status}, paid $${Number(o[0].amount_paid_usd)} of $${Number(o[0].total_usd)}, sourced=${o[0].all_sourced}`);
  }
}

main().catch((err) => {
  console.error("Failed:", err);
  process.exit(1);
});
