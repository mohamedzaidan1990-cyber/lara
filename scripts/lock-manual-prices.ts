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

(async () => {
  const sql = getSql();

  // Ensure the column exists
  await sql`ALTER TABLE products ADD COLUMN IF NOT EXISTS price_locked boolean DEFAULT false`;

  // Lock all Byoma products
  const byomaResult = await sql`
    UPDATE products SET price_locked = true
    WHERE brand ILIKE 'byoma'
  ` as unknown as { count: number };

  const byomaCount = await sql`
    SELECT count(*) as n FROM products WHERE brand ILIKE 'byoma'
  ` as Array<{ n: string }>;

  console.log(`Locked ${byomaCount[0].n} Byoma products`);

  // Lock Huda Beauty Easy Bake Pressed Powder 2.0 8.5g
  const hudaResult = await sql`
    UPDATE products SET price_locked = true
    WHERE brand ILIKE 'huda beauty' AND name ILIKE '%easy bake%pressed powder%8.5%'
  ` as unknown as { count: number };

  const hudaCount = await sql`
    SELECT count(*) as n FROM products
    WHERE brand ILIKE 'huda beauty' AND name ILIKE '%easy bake%pressed powder%8.5%'
  ` as Array<{ n: string }>;

  console.log(`Locked ${hudaCount[0].n} Huda Beauty Easy Bake Pressed Powder 8.5g product(s)`);

  // Summary
  const total = await sql`
    SELECT count(*) as n FROM products WHERE price_locked = true
  ` as Array<{ n: string }>;

  console.log(`\nTotal price-locked products: ${total[0].n}`);
})().catch(console.error);
