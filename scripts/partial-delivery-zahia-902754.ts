/**
 * Zahia SBB-902754: the 2 Kayali sets + Drunk Elephant B-Goldi drops were
 * already delivered and paid (the $166 already recorded). Mark the order
 * partially_delivered and note what went out; the 2 Rhode items remain.
 *
 * Run:  npx tsx scripts/partial-delivery-zahia-902754.ts
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

const ORDER = "SBB-902754";
const DELIVERED = ["Yum Pistachio Gelato", "Yum Boujee Marshmallow", "B-Goldi"];

async function main(): Promise<void> {
  const sql = getSql();
  const items = (await sql`
    select oi.product_brand, oi.product_name, oi.price_usd, oi.quantity, o.id as order_id, o.total_usd, coalesce(o.amount_paid_usd, 0) as paid
    from order_items oi join orders o on o.id = oi.order_id where o.order_number = ${ORDER}
  `) as Array<{ product_brand: string; product_name: string; price_usd: string; quantity: number; order_id: string; total_usd: string; paid: string }>;
  const matched = DELIVERED.map((frag) => {
    const hits = items.filter((i) => i.product_name.includes(frag));
    if (hits.length !== 1) {
      console.error(`"${frag}" matched ${hits.length} lines — aborting, nothing changed.`);
      process.exit(1);
    }
    return hits[0];
  });
  const remaining = items.filter((i) => !matched.includes(i));
  const deliveredValue = matched.reduce((s, i) => s + Number(i.price_usd) * (Number(i.quantity) || 1), 0);
  const today = new Date().toISOString().slice(0, 10);
  const note = `[${today}] Partial delivery — delivered: ${matched.map((i) => i.product_name).join("; ")}. Still to deliver: ${remaining.map((i) => i.product_name).join("; ")}.`;

  await sql`
    update orders
    set status = 'partially_delivered', payment_confirmed = true,
        amount_paid_usd = greatest(coalesce(amount_paid_usd, 0), ${deliveredValue}::numeric),
        notes = trim(both from concat_ws(E'\n', notes, ${note}::text)), updated_at = now()
    where id = ${items[0].order_id}
  `;
  const o = (await sql`select total_usd, amount_paid_usd from orders where id = ${items[0].order_id}`) as Array<{ total_usd: string; amount_paid_usd: string }>;
  const bal = Number(o[0].total_usd) - Number(o[0].amount_paid_usd);
  console.log(`OK  ${ORDER} — partially delivered ($${deliveredValue} delivered); paid $${Number(o[0].amount_paid_usd)} of $${Number(o[0].total_usd)} — balance $${bal}`);
  console.log(`    still to deliver: ${remaining.map((i) => `${i.product_brand} ${i.product_name} ($${Number(i.price_usd)})`).join("; ")}`);
}

main().catch((err) => {
  console.error("Failed:", err);
  process.exit(1);
});
