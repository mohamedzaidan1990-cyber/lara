/**
 * Mark Mona Ramadan's two already-sourced items on SBB-610389 (Pixi
 * FortifEYE eye patches, Huda Easy Bake powder Pound Cake) as arrived in
 * Lebanon. The Habibti kit is still unsourced and untouched.
 *
 * Run:  npx ts-node scripts/mark-in-lebanon-mona-ramadan-sourced-items.ts
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

const ORDER_NUMBER = "SBB-610389";

async function main(): Promise<void> {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL is not set.");
    process.exit(1);
  }
  const sql = getSql();

  const rows = (await sql`
    update order_items set in_lebanon = true
    where order_id = (select id from orders where order_number = ${ORDER_NUMBER}) and sourced = true
    returning product_name
  `) as Array<{ product_name: string }>;

  console.log(`OK  ${ORDER_NUMBER} — marked in Lebanon: ${rows.map((r) => r.product_name).join(", ")}`);
}

main().catch((err) => {
  console.error("Failed:", err);
  process.exit(1);
});
