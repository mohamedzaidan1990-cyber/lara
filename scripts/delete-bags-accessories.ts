/**
 * Removes the retired Bags & Accessories products from the catalog.
 *
 * Run:  npx ts-node scripts/delete-bags-accessories.ts
 *       (reads DATABASE_URL from .env.local)
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

async function main(): Promise<void> {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL is not set.");
    process.exit(1);
  }
  const sql = getSql();

  const deleted = (await sql`
    delete from products where category in ('Bags', 'Accessories') returning id
  `) as Array<{ id: string }>;
  console.log(`Deleted ${deleted.length} Bags/Accessories products.`);

  const counts = (await sql`
    select category, count(*)::int as n from products group by category order by category
  `) as Array<{ category: string; n: number }>;
  const total = (await sql`select count(*)::int as n from products`) as Array<{ n: number }>;

  console.log(`\nRemaining products: ${total[0]?.n ?? 0}`);
  console.log("By category:");
  for (const c of counts) console.log(`  ${c.category.padEnd(14)} ${c.n}`);
}

main().catch((err) => {
  console.error("delete failed:", err);
  process.exit(1);
});
