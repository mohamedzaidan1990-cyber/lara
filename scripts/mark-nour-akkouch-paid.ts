/**
 * Mark Nour Akkouch's order (SBB-812745, $104 COD) as fully paid, plus the
 * $5 delivery charge she also already paid — recorded as amount_paid_usd =
 * total_usd + 5 ($109) so the invoice shows PAID with no balance due, and a
 * note documents the delivery fee was collected separately.
 *
 * Run:  npx ts-node scripts/mark-nour-akkouch-paid.ts
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
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

const ORDER_NUMBER = "SBB-812745";
const DELIVERY_FEE_USD = 5;
const NOTE = "Customer paid in full, plus the $5 delivery fee separately.";

async function main() {
  const sql = getSql();
  const rows = (await sql`
    select id, total_usd::float8 as total_usd, notes from orders where order_number = ${ORDER_NUMBER}
  `) as Array<{ id: string; total_usd: number; notes: string | null }>;
  if (!rows.length) {
    console.error(`${ORDER_NUMBER} not found.`);
    process.exit(1);
  }
  const o = rows[0];
  const amountPaid = o.total_usd + DELIVERY_FEE_USD;
  const newNotes = o.notes && o.notes.trim() ? `${o.notes} | ${NOTE}` : NOTE;

  const updated = (await sql`
    update orders
    set payment_confirmed = true,
        amount_paid_usd = ${amountPaid},
        notes = ${newNotes},
        updated_at = now()
    where id = ${o.id}
    returning order_number, total_usd, amount_paid_usd, notes
  `) as Array<{ order_number: string; total_usd: string; amount_paid_usd: string; notes: string }>;

  console.log(`OK  ${updated[0].order_number} — total $${updated[0].total_usd}, paid $${updated[0].amount_paid_usd} (incl. $5 delivery)`);
  console.log(`    notes: ${updated[0].notes}`);
}
main().catch((err) => { console.error("Failed:", err); process.exit(1); });
