/**
 * Nada Al Ali (SBB-750832) and Nivine Khazem (SBB-926184) have paid their full
 * balances. Set amount_paid_usd = total for both.
 *
 * Run:  npx ts-node scripts/mark-paid-nada-nivine.ts
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
    set amount_paid_usd = coalesce(total_usd, price_usd, 0), updated_at = now()
    where order_number in ('SBB-750832', 'SBB-926184')
    returning order_number, total_usd, amount_paid_usd
  `) as Array<Record<string, unknown>>;
  console.dir(rows, { depth: null });
}

main().catch((err) => {
  console.error("Failed:", err);
  process.exit(1);
});
