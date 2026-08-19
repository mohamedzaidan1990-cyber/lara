/**
 * Adds all 20 shade variants for the Tarte Maracuja Creaseless Full
 * Coverage Radiant Concealer, pulled live from Sephora QA's shade picker
 * (product P3643104). Populates product_variants so the existing
 * ShadePicker component (app/product/[id]/ProductDetailClient.tsx) can
 * swap the product image per shade — it reads from product_variants via
 * /api/product-variants before falling back to anything else.
 *
 * Hero image: SKU/SKU_6760/{variantId}_swatch.jpg
 * Swatch thumb: Shades/Shades_3766/{variantId}_th.jpg
 * Both confirmed to load with a single shared cache hash across all
 * shades in this product's SKU/Shades folders.
 *
 * Run:  npx ts-node scripts/add-tarte-maracuja-concealer-shades.ts
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

const PRODUCT_ID = "225fd32e-8eaa-4464-8891-96917fa6a3b3";

const HERO_BASE =
  "https://img-product.sephora.me/dw/image/v2/BKWK_PRD/on/demandware.static/-/Sites-masterCatalog_Sephora/default/dwd9f5488c/images/hi-res/SKU/SKU_6760";
const SWATCH_BASE =
  "https://img-product.sephora.me/dw/image/v2/BKWK_PRD/on/demandware.static/-/Sites-masterCatalog_Sephora/default/dw56bfc3ae/images/hi-res/Shades/Shades_3766";

const SHADES: Array<{ id: string; name: string }> = [
  { id: "439519", name: "10N Fair" },
  { id: "439526", name: "13N Fair-Light Neutral" },
  { id: "439520", name: "20N Light" },
  { id: "439527", name: "20S Light Sand" },
  { id: "439531", name: "25N Light-Medium Neutral" },
  { id: "439528", name: "25S Light-Medium Sand" },
  { id: "439522", name: "33N Medium" },
  { id: "439514", name: "34H Medium Honey" },
  { id: "763601", name: "36S Medium-Tan Sand" },
  { id: "763606", name: "38N Medium-Tan Neutral" },
  { id: "763613", name: "42S Tan Sand" },
  { id: "763618", name: "44H Tan Honey" },
  { id: "763599", name: "47S Tan-Deep Sand" },
  { id: "763604", name: "49W Tan-Deep Warm" },
  { id: "439525", name: "50H Deep" },
  { id: "763615", name: "51H Deep Honey" },
  { id: "763602", name: "53N Deep Neutral" },
  { id: "763608", name: "53S Deep Sand" },
  { id: "763614", name: "54H Deep Honey" },
  { id: "763603", name: "55W Rich Warm" }
];

async function main(): Promise<void> {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL is not set.");
    process.exit(1);
  }
  const sql = getSql();

  let i = 0;
  for (const s of SHADES) {
    const heroUrl = `${HERO_BASE}/${s.id}_swatch.jpg`;
    const swatchUrl = `${SWATCH_BASE}/${s.id}_th.jpg`;
    await sql`
      insert into product_variants (product_id, shade_name, shade_image_url, swatch_url, sort_order)
      values (${PRODUCT_ID}, ${s.name}, ${heroUrl}, ${swatchUrl}, ${i})
      on conflict (product_id, shade_name) do update set
        shade_image_url = excluded.shade_image_url,
        swatch_url = excluded.swatch_url,
        sort_order = excluded.sort_order
    `;
    console.log(`OK  ${s.name} (${s.id})`);
    i += 1;
  }

  console.log(`\nInserted/updated ${SHADES.length} shade variants.`);
}

main().catch((err) => {
  console.error("Import failed:", err);
  process.exit(1);
});
