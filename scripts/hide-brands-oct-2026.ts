/**
 * Removes 29 brands from the storefront (user request, 2026-10-23).
 * Products are archived, not deleted, so past orders keep their links and the
 * change is reversible. The brands go into hidden_brands, whose insert trigger
 * (lib/db.ts) archives any product scraped/imported under them later.
 *
 * Run:  npx tsx scripts/hide-brands-oct-2026.ts
 * Undo one brand:
 *   delete from hidden_brands where brand = 'Creed';
 *   update products set archived = false where brand = 'Creed';
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
    const m = raw.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}
loadDotenv(".env.local");
loadDotenv(".env");

// Exact brand names as stored in products.brand.
const BRANDS = [
  "Boutique Bonita",
  "Adanola",
  "39bc",
  "Acqua Di Parma",
  "Amouage",
  "Athletia",
  "Atkinsons",
  "Augustinus Bader",
  "Away",
  "Axis-Y",
  "Biossance",
  "Bamford",
  "Balenciaga Beauty",
  "Bdk Parfums",
  "Bottega Veneta Beauty",
  "Byava",
  "Bond No. 9",
  "Balmain Beauty",
  "Birkholz",
  "Creed",
  "Coola Suncare",
  "Clive Christian",
  "Christophe Robin",
  "Christian Louboutin",
  "Chloe",
  "Charlotte Mensah",
  "Casamorati",
  "Cartier",
  "Cair"
];

async function main() {
  const { getSql, ensureSchema } = await import("../lib/db");
  await ensureSchema();
  const sql = getSql();

  for (const b of BRANDS) {
    await sql`insert into hidden_brands (brand) values (${b}) on conflict (brand) do nothing`;
  }
  const archived = (await sql`
    update products set archived = true
    where lower(trim(brand)) in (select lower(trim(brand)) from hidden_brands) and not archived
    returning brand
  `) as Array<{ brand: string }>;
  console.log(`Archived ${archived.length} products.`);

  const left = (await sql`
    select brand, count(*)::int n from products
    where lower(trim(brand)) = any(${BRANDS.map((b) => b.toLowerCase())}) and not archived
    group by brand
  `) as Array<{ brand: string; n: number }>;
  if (left.length) throw new Error(`Still visible: ${JSON.stringify(left)}`);
  console.log("No visible products left for the 29 brands.");
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
