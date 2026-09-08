/**
 * SBB-540971 (Mariam Hamad) — Kayali Marshmallow Candy Mini Duo 2x5ml was
 * bought in Sephora.ca order #834320002460 ($38 CAD -> $31.92 USD @ 0.84)
 * but never marked sourced.
 *
 * Run:  npx ts-node scripts/source-sbb-540971-kayali-marshmallow.ts
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
    update order_items oi
    set sourced = true, vendor = 'sephora canada', cost_usd = 31.92
    from orders o
    where o.id = oi.order_id
      and o.order_number = 'SBB-540971'
      and oi.product_name ilike '%marshmallow candy mini duo%'
      and oi.sourced = false
    returning o.order_number, oi.product_name, oi.sourced, oi.vendor, oi.cost_usd
  `) as Array<Record<string, unknown>>;

  console.dir(rows, { depth: null });
}

main().catch((err) => {
  console.error("Failed:", err);
  process.exit(1);
});
