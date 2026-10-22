/**
 * The user confirmed (10 Oct 2026) that both of these delivered orders were
 * paid in full; the recorded amounts were wrong:
 *   SBB-525925 Laure Issa  — recorded $25 of $108
 *   SBB-521576 Batoul Issa — recorded $0 of $116
 * Sets amount_paid_usd = total and brings their welcome points in line
 * (orders delivered before the loyalty launch earn 1 point per $2):
 * Laure's existing 12-point grant becomes 54; Batoul's 58-point grant is
 * created by the same rule the app uses (scripts can't import lib/loyalty
 * from main yet, so it's done in SQL here).
 *
 * Run:  npx tsx scripts/mark-paid-sbb-525925-and-sbb-521576.ts
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

const ORDERS = ["SBB-525925", "SBB-521576"];

async function main(): Promise<void> {
  const sql = getSql();

  // Validate before writing.
  const rows = (await sql`
    select o.id, o.order_number, o.status, o.total_usd, o.amount_paid_usd, c.full_name, c.phone_norm,
           (o.delivered_at < s.launched_at) as before_launch
    from orders o join customers c on c.id = o.customer_id cross join loyalty_settings s
    where o.order_number = any(${ORDERS}::text[])
  `) as Array<{ id: string; order_number: string; status: string; total_usd: string; amount_paid_usd: string; full_name: string; phone_norm: string; before_launch: boolean }>;
  if (rows.length !== ORDERS.length || rows.some((r) => r.status !== "delivered" || !r.before_launch || !r.phone_norm)) {
    console.error("Unexpected order state — aborting, nothing changed.", rows);
    process.exit(1);
  }

  for (const r of rows) {
    const total = Number(r.total_usd);
    const points = Math.floor(total * 0.5);
    await sql`update orders set amount_paid_usd = ${total}, payment_confirmed = true, updated_at = now() where id = ${r.id}`;

    const existing = (await sql`
      select id, points, remaining from points_ledger where order_id = ${r.id} and kind = 'backfill'
    `) as Array<{ id: string; points: number; remaining: number }>;
    if (existing.length) {
      // Top up both the grant and its unspent remainder by the difference.
      const diff = points - existing[0].points;
      await sql`update points_ledger set points = ${points}::int, remaining = remaining + ${diff}::int where id = ${existing[0].id}`;
    } else {
      await sql`
        insert into points_ledger (phone, kind, points, remaining, order_id, note, earned_at)
        select ${r.phone_norm}, 'backfill', ${points}::int, ${points}::int, ${r.id}, ${"Order " + r.order_number}, launched_at
        from loyalty_settings where id = 1
        on conflict do nothing
      `;
    }
    const bal = (await sql`select coalesce(sum(remaining), 0)::int as b from points_ledger where phone = ${r.phone_norm}`) as Array<{ b: number }>;
    console.log(`OK  ${r.order_number} ${r.full_name} — paid $${Number(r.amount_paid_usd)} → $${total}; order points ${points}; balance ${bal[0].b}`);
  }
}

main().catch((err) => {
  console.error("Failed:", err);
  process.exit(1);
});
