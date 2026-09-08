/**
 * 2026-09-08 Charlotte Tilbury sourcing (vendor: charlotte tilbury qatar):
 *   SBB-753774  Airbrush Flawless Blur Loose Powder — Brightening Peach  $46.10
 *   SBB-483610  Airbrush Flawless Blur Loose Powder — Brightening Pink   $46.10
 *   SBB-483610  Golden Glow Quick And Easy Makeup                        $67.22
 *   SBB-483610  Airbrush Flawless Blush Blur — Pillow Talk Medium        $36.49
 *   SBB-521576  Matte Revolution Lipstick — Shade: Pillow Talk           $32.65
 *   SBB-578351  Airbrush Flawless Finish micro-powder 8g — Shade: Fair   $46.10
 *
 * NOT handled: "mini airbrush flawless finish @ $24" — no unsourced order
 * line matches (the only one, SBB-100767, is already delivered/sourced).
 *
 * Run:  npx ts-node scripts/source-ct-batch-sept08.ts
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

const VENDOR = "charlotte tilbury qatar";

const TARGETS: Array<{ id: string; cost_usd: number }> = [
  { id: "02178d13-5d3c-4fb1-b690-eb3724638c60", cost_usd: 46.1 },  // SBB-753774 Blur Loose Powder Brightening Peach
  { id: "e0e67b2f-354d-455d-b96b-89930739400e", cost_usd: 46.1 },  // SBB-483610 Blur Loose Powder Brightening Pink
  { id: "ee97a4ee-7ef2-4867-93ae-2d817dabae6c", cost_usd: 67.22 }, // SBB-483610 Golden Glow kit
  { id: "9ee708b7-ed33-4b95-8e93-2e4711d92c48", cost_usd: 36.49 }, // SBB-483610 Blush Blur Pillow Talk Medium
  { id: "cee1cf85-c679-4ef5-a5bd-787d317016a4", cost_usd: 32.65 }, // SBB-521576 Matte Revolution Pillow Talk
  { id: "45888b23-bc5f-4899-bcab-695fbcb289cb", cost_usd: 46.1 }   // SBB-578351 Flawless Finish 8g Fair
];

async function main(): Promise<void> {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL is not set.");
    process.exit(1);
  }
  await ensureSchema();
  const sql = getSql();

  for (const t of TARGETS) {
    const rows = (await sql`
      update order_items oi
      set sourced = true, cost_usd = ${t.cost_usd}, vendor = ${VENDOR}
      from orders o
      where o.id = oi.order_id and oi.id = ${t.id} and oi.sourced = false
      returning o.order_number, oi.product_name, oi.quantity, oi.cost_usd, oi.vendor
    `) as Array<Record<string, unknown>>;
    if (!rows.length) {
      console.log(`  !! NO CHANGE (already sourced or not found): ${t.id}`);
    } else {
      const r = rows[0];
      console.log(`  OK ${r.order_number} — ${r.product_name} x${r.quantity} → $${r.cost_usd} (${r.vendor})`);
    }
  }
}

main().catch((err) => {
  console.error("Failed:", err);
  process.exit(1);
});
