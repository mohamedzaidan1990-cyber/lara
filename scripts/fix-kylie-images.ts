/**
 * Null out Kylie Cosmetics lifestyle/model photos so the branded placeholder
 * shows instead of a Kylie Jenner shot. Run:  npx ts-node scripts/fix-kylie-images.ts
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
function loadDotenv(file: string): void {
  let text: string;
  try { text = readFileSync(resolve(process.cwd(), file), "utf8"); } catch { return; }
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("="); if (eq === -1) continue;
    const k = line.slice(0, eq).trim();
    const v = line.slice(eq + 1).trim().replace(/^['"]|['"]$/g, "");
    if (!process.env[k]) process.env[k] = v;
  }
}
loadDotenv(".env.local");
loadDotenv(".env");

import { getSql } from "../lib/db";

async function main(): Promise<void> {
  const sql = getSql();

  // Image URLs that look like lifestyle / model / campaign shots, not packshots.
  const cleaned = (await sql`
    update products
    set image_url = null, images = null
    where lower(brand) like '%kylie%'
      and image_url ~* 'lifestyle|[_-]model|on-?model|campaign|banner|hero|ugc|editorial|wearing|jenner|founder|portrait|headshot'
    returning name
  `) as Array<{ name: string }>;

  const remaining = (await sql`
    select count(*)::int as n from products
    where lower(brand) like '%kylie%' and image_url is not null
  `) as Array<{ n: number }>;
  const total = (await sql`select count(*)::int as n from products where lower(brand) like '%kylie%'`) as Array<{ n: number }>;

  console.log(`Cleaned ${cleaned.length} Kylie lifestyle/model images (set to placeholder).`);
  console.log(`Kylie products: ${total[0]?.n ?? 0} total, ${remaining[0]?.n ?? 0} still have an image.`);
  for (const r of cleaned.slice(0, 15)) console.log(`  · ${r.name}`);
}

main().catch((err) => { console.error("fix-kylie-images failed:", err); process.exit(1); });
