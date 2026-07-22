/**
 * Diagnostic: confirms the product_reviews table exists and reports its row count.
 * Run:  npx ts-node scripts/check-product-reviews-schema.ts   (reads DATABASE_URL from .env.local)
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

import { getSql, ensureSchema } from "../lib/db";

async function main(): Promise<void> {
  await ensureSchema();
  const sql = getSql();

  const cols = (await sql`
    select column_name, data_type
    from information_schema.columns
    where table_name = 'product_reviews'
    order by ordinal_position
  `) as Array<{ column_name: string; data_type: string }>;
  console.log("product_reviews columns:", cols);

  const count = (await sql`select count(*)::int as n from product_reviews`) as Array<{ n: number }>;
  console.log("product_reviews row count:", count[0]?.n ?? 0);
}

main().catch((err) => {
  console.error("check-product-reviews-schema failed:", err);
  process.exit(1);
});
