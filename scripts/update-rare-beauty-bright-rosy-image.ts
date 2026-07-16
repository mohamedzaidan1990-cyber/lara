/**
 * Replaces the mismatched CDN image on "Bright & Rosy Mini Lip And Cheek
 * Set" (Rare Beauty) with a user-supplied product photo showing the actual
 * box + all 3 minis.
 *
 * Run:  npx ts-node scripts/update-rare-beauty-bright-rosy-image.ts
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

import { ensureSchema, getSql } from "../lib/db";

async function main(): Promise<void> {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL is not set. Make sure .env.local exists in the project root.");
    process.exit(1);
  }

  await ensureSchema();
  const sql = getSql();

  const updated = (await sql`
    update products
    set image_url = '/rare-beauty-bright-rosy-mini-lip-cheek-set.png', scraped_at = now()
    where brand = 'Rare Beauty' and name = 'Bright & Rosy Mini Lip And Cheek Set'
    returning name, price_usd, image_url
  `) as Array<{ name: string; price_usd: string; image_url: string }>;

  if (updated.length === 0) {
    console.error("No existing row found — expected one.");
    process.exit(1);
  }

  console.log(`Updated image: ${updated[0].name} — $${updated[0].price_usd} — ${updated[0].image_url}`);
}

main().catch((err) => {
  console.error("Update failed:", err);
  process.exit(1);
});
