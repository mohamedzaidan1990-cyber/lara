/**
 * Moves all PIXI eye-patch products from Makeup to Skincare, per explicit
 * instruction. Matches by name pattern ("eye patch(es)" or "...EYE ...")
 * rather than a hardcoded id list, so it also catches any future PIXI
 * eye-patch SKU (DetoxifEYE etc.) added the same way.
 *
 * Run:  npx ts-node scripts/move-pixi-eyepatches-to-skincare.ts
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
    update products
    set category = 'Skincare'
    where brand = 'Pixi'
      and (
        name ilike '%eye patch%'
        or name ilike '%fortifeye%'
        or name ilike '%beautifeye%'
        or name ilike '%nutrifeye%'
        or name ilike '%detoxifeye%'
      )
      and category != 'Skincare'
    returning id, name
  `) as Array<{ id: string; name: string }>;

  console.log(`Moved ${updated.length} PIXI eye-patch products to Skincare:`);
  for (const p of updated) console.log(`  - ${p.name}`);
}

main().catch((err) => {
  console.error("Update failed:", err);
  process.exit(1);
});
