/**
 * Fixes a brand-casing split that broke the Dior brand page's category
 * links. The 129+6 Dior products imported in scripts/add-dior-products*.ts
 * used brand="DIOR" (all-caps), while the site's pre-existing 135 Dior
 * products use brand="Dior" (title case). getBrandBySlug() in lib/brands.ts
 * picks a single canonical brand string (whichever casing has the single
 * highest-count category), then every category-filter link on the brand
 * page does an exact `brand = $1` match — so half the catalog silently
 * vanished behind links built with the other casing.
 *
 * This normalizes brand to "Dior" (the pre-existing majority casing) so
 * the whole catalog is addressable under one consistent brand string.
 *
 * Run:  npx ts-node scripts/fix-dior-brand-casing.ts
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
  for (const raw of text.split("\n")) {
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

  const updated = (await sql`
    update products set brand = 'Dior' where brand = 'DIOR' returning id
  `) as Array<{ id: string }>;
  console.log(`Normalized ${updated.length} products from brand="DIOR" to brand="Dior".`);

  const check = await sql`select brand, count(*)::int as n from products where lower(brand) = 'dior' group by brand`;
  console.log("Post-fix brand casing check:", check);
}

main().catch((err) => {
  console.error("Fix failed:", err);
  process.exit(1);
});
