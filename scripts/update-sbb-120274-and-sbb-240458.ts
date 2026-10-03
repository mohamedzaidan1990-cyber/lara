/**
 * - SBB-120274 (Abir Awada): Fenty Pro Filt'r Fluid Flex Foundation shade
 *   TBC → 146N Light. Came from in-hand stock that isn't in stock_items, so
 *   the line is marked sourced + in Lebanon with cost left unknown.
 * - SBB-240458 (Sally Salami): Rare Beauty Warm Wishes bronzer shade
 *   TBC → Bright Side; she has paid the full $49 (recorded as whish_link,
 *   amount_paid_usd = 49).
 *
 * Run:  npx tsx scripts/update-sbb-120274-and-sbb-240458.ts
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

async function oneTbcLine(sql: ReturnType<typeof getSql>, orderNumber: string, namePrefix: string) {
  const rows = (await sql`
    select oi.id, oi.product_name, o.id as order_id, o.total_usd
    from order_items oi join orders o on o.id = oi.order_id
    where o.order_number = ${orderNumber} and oi.product_name = ${namePrefix + " — Shade: TBC"}
  `) as Array<{ id: string; product_name: string; order_id: string; total_usd: string }>;
  if (rows.length !== 1) {
    console.error(`Expected exactly 1 TBC line on ${orderNumber}, found ${rows.length} — aborting, nothing changed.`);
    process.exit(1);
  }
  return rows[0];
}

async function main(): Promise<void> {
  const sql = getSql();

  const abir = await oneTbcLine(sql, "SBB-120274", "Pro Filt'r Fluid Flex Natural Matte Longwear Foundation");
  const sally = await oneTbcLine(sql, "SBB-240458", "Warm Wishes Effortless Bronzer Stick");

  const abirName = "Pro Filt'r Fluid Flex Natural Matte Longwear Foundation — Shade: 146N Light";
  await sql`update order_items set product_name = ${abirName}, sourced = true, in_lebanon = true where id = ${abir.id}`;
  console.log(`OK  SBB-120274 — ${abirName} — sourced from stock, in Lebanon (cost unknown)`);

  const sallyName = "Warm Wishes Effortless Bronzer Stick — Shade: Bright Side";
  await sql`update order_items set product_name = ${sallyName} where id = ${sally.id}`;
  await sql`
    update orders
    set product_name = ${sallyName}, payment_method = 'whish_link', payment_confirmed = true,
        amount_paid_usd = total_usd, updated_at = now()
    where id = ${sally.order_id}
  `;
  console.log(`OK  SBB-240458 — ${sallyName} — paid in full ($${Number(sally.total_usd)}, whish_link)`);
}

main().catch((err) => {
  console.error("Failed:", err);
  process.exit(1);
});
