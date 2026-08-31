/**
 * Marks order SBB-372092 (Ghadir Jaber) as $177 paid so that delivery is not
 * charged again when the order ships. Order total is $172 — the $177 covers the
 * order plus delivery. Sets amount_paid_usd = 177 and appends a note.
 *
 * Run:  npx ts-node scripts/mark-paid-sbb-372092.ts
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

const ORDER_NUMBER = "SBB-372092";
const AMOUNT_PAID_USD = 177;
const NOTE_APPEND = "Paid $177 (covers order + delivery) — do not charge delivery on shipment.";

async function main(): Promise<void> {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL is not set.");
    process.exit(1);
  }
  await ensureSchema();
  const sql = getSql();

  const rows = (await sql`
    update orders
    set amount_paid_usd = ${AMOUNT_PAID_USD},
        notes = case
          when notes is null or notes = '' then ${NOTE_APPEND}
          when position(${NOTE_APPEND} in notes) > 0 then notes
          else notes || ' | ' || ${NOTE_APPEND}
        end,
        updated_at = now()
    where order_number = ${ORDER_NUMBER}
    returning order_number, total_usd, amount_paid_usd, notes
  `) as Array<Record<string, unknown>>;

  if (!rows.length) {
    console.error(`Order ${ORDER_NUMBER} not found`);
    process.exit(1);
  }
  console.log("Updated:", rows[0]);
}

main().catch((err) => {
  console.error("Failed:", err);
  process.exit(1);
});
