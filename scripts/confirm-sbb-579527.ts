/**
 * Confirms COD order SBB-579527 (Fatima Ftouni): payment_confirmed = true,
 * status -> payment_confirmed. Matches how every other COD order is recorded.
 *
 * Run:  npx ts-node scripts/confirm-sbb-579527.ts
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

async function main(): Promise<void> {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL is not set.");
    process.exit(1);
  }
  await ensureSchema();
  const sql = getSql();

  const rows = (await sql`
    update orders
    set payment_confirmed = true,
        status = 'payment_confirmed',
        updated_at = now()
    where order_number = 'SBB-579527'
    returning order_number, status, payment_method, payment_confirmed, total_usd, amount_paid_usd
  `) as Array<Record<string, unknown>>;

  if (!rows.length) {
    console.error("Order SBB-579527 not found");
    process.exit(1);
  }
  console.log("Updated:", rows[0]);
}

main().catch((err) => {
  console.error("Failed:", err);
  process.exit(1);
});
