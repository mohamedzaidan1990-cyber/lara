/**
 * Run the schema migration (adds new columns like products.images and backfills
 * them). Equivalent to hitting /api/init-db, but runnable locally.
 * Run:  npx ts-node scripts/migrate.ts
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

import { ensureSchema, getSql } from "../lib/db";

async function main(): Promise<void> {
  await ensureSchema();
  const sql = getSql();
  const withImages = (await sql`select count(*)::int as n from products where images is not null`) as Array<{ n: number }>;
  const total = (await sql`select count(*)::int as n from products`) as Array<{ n: number }>;
  console.log("Migration complete.");
  console.log(`products.images populated: ${withImages[0]?.n ?? 0} / ${total[0]?.n ?? 0}`);
}

main().catch((err) => { console.error("migrate failed:", err); process.exit(1); });
