/**
 * Order SBB-655262: customer paid $55 and received her order. Sets
 * payment_confirmed = true, amount_paid_usd = 55, status = 'delivered'.
 *
 * Run:  npx ts-node scripts/deliver-paid-sbb-655262.ts
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
    console.error("DATABASE_URL is not set. Make sure .env.local exists in the project root.");
    process.exit(1);
  }

  await ensureSchema();
  const sql = getSql();

  const updated = (await sql`
    UPDATE orders
    SET status = 'delivered', payment_confirmed = true, amount_paid_usd = 55, updated_at = now()
    WHERE order_number = 'SBB-655262'
    RETURNING order_number, status, payment_confirmed, amount_paid_usd, total_usd
  `) as Array<{ order_number: string; status: string; payment_confirmed: boolean; amount_paid_usd: string; total_usd: string }>;

  if (!updated.length) {
    console.error("Order SBB-655262 not found");
    process.exit(1);
  }

  const o = updated[0];
  console.log(`OK ${o.order_number} — status=${o.status}, paid=${o.payment_confirmed} ($${o.amount_paid_usd} of $${o.total_usd})`);
}

main().catch((err) => {
  console.error("Update failed:", err);
  process.exit(1);
});
