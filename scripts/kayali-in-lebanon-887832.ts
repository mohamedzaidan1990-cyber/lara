/**
 * Zahia SBB-887832: Kayali Yum Boujee Marshmallow set is in Lebanon.
 *
 * Run:  npx tsx scripts/kayali-in-lebanon-887832.ts
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
  const sql = getSql();
  const r = (await sql`
    update order_items set sourced = true, in_lebanon = true
    where id = '5f4c2f06-6522-4023-b9f8-a19e22faad70'
      and order_id = (select id from orders where order_number = 'SBB-887832')
    returning product_name
  `) as Array<{ product_name: string }>;
  if (r.length !== 1) {
    console.error("Kayali line on SBB-887832 not found — nothing changed.");
    process.exit(1);
  }
  console.log(`OK  SBB-887832 — Kayali ${r[0].product_name} — in Lebanon`);
  const pending = (await sql`
    select product_brand, product_name from order_items
    where order_id = (select id from orders where order_number = 'SBB-887832') and not coalesce(in_lebanon, false)
  `) as Array<{ product_brand: string; product_name: string }>;
  console.log(`SBB-887832 still waiting on: ${pending.map((p) => `${p.product_brand} ${p.product_name}`).join("; ") || "nothing"}`);
}

main().catch((err) => {
  console.error("Failed:", err);
  process.exit(1);
});
