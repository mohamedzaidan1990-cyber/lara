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

  // Target: Byoma products between $19.00 and $19.99
  const preview = await sql`
    SELECT name, price_usd FROM products
    WHERE brand ILIKE 'byoma' AND price_usd >= 19 AND price_usd < 20
    ORDER BY name
  ` as Array<{ name: string; price_usd: string }>;

  console.log(`Found ${preview.length} Byoma product(s) between $19 and $19.99:`);
  preview.forEach((r) => console.log(`  $${r.price_usd}  ${r.name}`));

  if (preview.length === 0) {
    console.log("Nothing to update.");
    return;
  }

  await sql`
    UPDATE products SET price_usd = 22
    WHERE brand ILIKE 'byoma' AND price_usd >= 19 AND price_usd < 20
  `;

  console.log(`\nDone — ${preview.length} product(s) set to $22.`);
})().catch(console.error);
