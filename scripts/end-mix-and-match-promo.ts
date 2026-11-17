/**
 * Ends the "Mix & Match — Any 4" promotion (2026-11-18, per owner).
 * products.price_usd/price_gbp for the 12 Mix & Match rows held the PROMO
 * price; this puts them back to the RETAIL price (what a basket of fewer than
 * 4 was charged). Prices are copied from lib/mix-and-match.ts as it stood
 * before the entries were removed. All rows stay price_locked.
 *
 * Run:  npx tsx scripts/end-mix-and-match-promo.ts
 */
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

const ROWS: Array<{ id: string; promoUsd: number; retailUsd: number; retailGbp: number }> = [
  { id: "8bd9871e-a3bf-405e-b168-704ffd197698", promoUsd: 25, retailUsd: 40, retailGbp: 30.77 }, // gisou raspberry swirl
  { id: "4e3afa47-bd5f-40eb-9ee1-e2844241d337", promoUsd: 25, retailUsd: 40, retailGbp: 30.77 }, // gisou bee-llini peach
  { id: "6bfe5abb-43d7-4693-bfe7-3c8ff692b741", promoUsd: 25, retailUsd: 40, retailGbp: 30.77 }, // gisou glazed plum
  { id: "3fcf4a82-d12c-47af-922d-1072a455d87b", promoUsd: 30, retailUsd: 60, retailGbp: 46.15 }, // milk jelly lip kit
  { id: "2deb4629-4155-4f59-9dd6-c4fe032a3277", promoUsd: 25, retailUsd: 50, retailGbp: 38.46 }, // rare beauty find comfort mist
  { id: "9341a859-26f7-4bd1-8a68-18859ef56e41", promoUsd: 25, retailUsd: 50, retailGbp: 38.46 }, // sol danca mistica
  { id: "a169ca6b-5e9c-4272-bae4-8af38c361a81", promoUsd: 25, retailUsd: 50, retailGbp: 38.46 }, // sephora blush trio candy lover
  { id: "df4c9110-3baf-48e1-b527-09e4b1c682d7", promoUsd: 30, retailUsd: 60, retailGbp: 46.15 }, // sephora x waad shaat
  { id: "7002c330-0bca-40b1-899f-01f44ef9ef2e", promoUsd: 30, retailUsd: 60, retailGbp: 46.15 }, // sephora x talia fawaz
  { id: "6bd05d04-0d90-4b51-8e06-8a90317c6998", promoUsd: 25, retailUsd: 50, retailGbp: 38.46 }, // fenty mini killawatt wattabrat
  { id: "7273f117-dfcc-49a8-97f3-85f7fa420012", promoUsd: 25, retailUsd: 50, retailGbp: 38.46 }, // tarte maracuja pink
  { id: "ee7b9949-30fb-4e53-b5de-7537ec062def", promoUsd: 25, retailUsd: 50, retailGbp: 38.46 }  // huda faux filler she fire
];

async function main(): Promise<void> {
  if (!process.env.DATABASE_URL) { console.error("DATABASE_URL is not set."); process.exit(1); }
  const sql = getSql();
  const cur = (await sql`select id, name, price_usd::float u from products where id = any(${ROWS.map((r) => r.id)})`) as Array<{ id: string; name: string; u: number }>;
  if (cur.length !== ROWS.length) { console.error(`Found ${cur.length}/${ROWS.length} products — aborting.`); process.exit(1); }
  const pending = ROWS.filter((r) => cur.find((c) => c.id === r.id)!.u !== r.retailUsd);
  for (const r of pending) {
    const u = cur.find((c) => c.id === r.id)!.u;
    if (u !== r.promoUsd) { console.error(`${r.id} is $${u}, expected promo $${r.promoUsd} — aborting, nothing changed.`); process.exit(1); }
  }
  await sql.transaction(pending.map((r) => sql`
    update products set price_usd = ${r.retailUsd}, price_gbp = ${r.retailGbp}, price_locked = true
    where id = ${r.id} and price_usd = ${r.promoUsd}
  `));
  const after = (await sql`select name, price_usd::float u, price_gbp::float g from products where id = any(${ROWS.map((r) => r.id)}) order by name`) as Array<{ name: string; u: number; g: number }>;
  for (const a of after) console.log(`$${a.u}  £${a.g}  ${a.name}`);
  console.log(`Updated ${pending.length} row(s).`);
}
main().catch((err) => { console.error("Failed:", err); process.exit(1); });
