/**
 * SBB-947035 (Israa Kadouh, $97) was showing amount_paid_usd = total from the
 * old migration backfill, but the customer has NOT paid. Reset to 0 so it shows
 * the real balance due on delivery.
 *
 * (The other 10 "backfilled" orders were confirmed genuinely paid — left as-is.)
 *
 * Run:  npx ts-node scripts/zero-paid-sbb-947035.ts
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
    update orders set amount_paid_usd = 0, updated_at = now()
    where order_number = 'SBB-947035'
    returning order_number, total_usd, amount_paid_usd
  `) as Array<Record<string, unknown>>;
  console.dir(rows, { depth: null });
}

main().catch((err) => {
  console.error("Failed:", err);
  process.exit(1);
});
