/**
 * Remove the Fenty Beauty "Lil' Mists Mini Body Mist Duo" ($46, Selfridges)
 * from the catalogue — product 8cbfd14f-c34f-4a19-81e8-3c97bd74b859, per user.
 *
 * Hard delete (like the other clean-up scripts). Refuses to run if the row is
 * not the expected product, or if any order line still points at its
 * product_url. product_variants cascade; stock_items.product_id is SET NULL by
 * the foreign key (checked: no rows linked to this product).
 *
 * Run:  npx ts-node scripts/remove-fenty-beauty-lils-mists-mini-body-mist-duo.ts
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

const PRODUCT_ID = "8cbfd14f-c34f-4a19-81e8-3c97bd74b859";

async function main(): Promise<void> {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL is not set.");
    process.exit(1);
  }
  const sql = getSql();

  const rows = (await sql`
    select id, brand, name, product_url from products where id = ${PRODUCT_ID} limit 1
  `) as Array<{ id: string; brand: string; name: string; product_url: string | null }>;
  if (!rows.length) {
    console.error("Product not found (already removed?) — nothing to do.");
    process.exit(1);
  }
  const p = rows[0];
  if (p.brand !== "Fenty Beauty" || p.name !== "Lil' Mists Mini Body Mist Duo") {
    console.error(`Unexpected product at that id: ${p.brand} — ${p.name} — aborting.`);
    process.exit(1);
  }

  const used = (await sql`
    select o.order_number from order_items oi join orders o on o.id = oi.order_id
    where oi.product_url = ${p.product_url}
  `) as Array<{ order_number: string }>;
  if (used.length) {
    console.error(`Still on order(s) ${used.map((u) => u.order_number).join(", ")} — aborting, nothing removed.`);
    process.exit(1);
  }

  const deleted = (await sql`
    delete from products where id = ${PRODUCT_ID} returning brand, name
  `) as Array<{ brand: string; name: string }>;
  console.log(`OK  removed ${deleted[0].brand} — ${deleted[0].name}`);
}

main().catch((err) => {
  console.error("Failed:", err);
  process.exit(1);
});
