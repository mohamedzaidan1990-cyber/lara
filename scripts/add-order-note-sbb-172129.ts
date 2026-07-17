/**
 * Adds an admin note to order SBB-172129: "To add a mini mascara as gift".
 *
 * Run:  npx ts-node scripts/add-order-note-sbb-172129.ts
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
    update orders
    set notes = 'To add a mini mascara as gift', updated_at = now()
    where order_number = 'SBB-172129'
    returning order_number, notes
  `) as Array<{ order_number: string; notes: string }>;

  if (updated.length === 0) {
    console.error("No order found with order_number = SBB-172129");
    process.exit(1);
  }

  console.log(`Updated ${updated[0].order_number} — notes: "${updated[0].notes}"`);
}

main().catch((err) => {
  console.error("Update failed:", err);
  process.exit(1);
});
