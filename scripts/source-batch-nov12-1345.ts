/**
 * Purchase of 29 units bought together for $1,345 total (2026-11-12).
 * Per the user: cost split EQUALLY across the 29 units. 134500c / 29 is not
 * whole, so 27 units get $46.38 and 2 units get $46.37 (the last two stock
 * rows) — 27 x 46.38 + 2 x 46.37 = 1345.00 exactly. cost_gbp = cost_usd / 1.3,
 * as in the other mark-sourced scripts. Only sourced + cost are set on order
 * lines (in_lebanon / vendor untouched — bought, not yet arrived).
 *
 * 24 order lines sourced (pinned by order_item id, re-checked by order number,
 * name prefix, still unsourced, live + payment_confirmed). Where one unit was
 * bought and two orders want it, the OLDER order gets it:
 *   - Mini NUDE Obsession MEDIUM -> SBB-378610 Afaf (Oct 20), not SBB-389495 Marwa
 *   - Easy Blur 140G Cashew      -> SBB-378610 Afaf (Oct 20), not SBB-197874 JineeN
 *   - Hollywood Flawless Filter 2.5 -> SBB-296329 Zahraa Khalifeh, not SBB-297960 Mona
 *
 * 5 units to stock (no matching order):
 *   CT Pillow Talk Everyday Icons; 2x Huda Bronze Filter Palette MEDIUM (Aya
 *   Nassar SBB-630335 ordered LIGHT — left unsourced); Kiehl's Creamy Eye
 *   Treatment with Avocado 28ml (Aya Ismail SBB-318012 ordered 14ml — left
 *   unsourced); Dior J'adore EDP 100ml.
 *
 * SBB-364974 (Zeinab Ismail, created today) duplicates SBB-298904 (same Huda
 * Blush Filter Strawberry Latte) — user confirmed duplicate: cancelled
 * (status cancelled + payment_confirmed false, like the other duplicate
 * cancels). No sourced items on it, so nothing moves to stock. Loyalty points
 * are resynced for her afterwards.
 *
 * All writes run in one transaction; pre-flight checks abort before anything changes.
 *
 * Run:  npx tsx scripts/source-batch-nov12-1345.ts
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
import { syncOrderPoints } from "../lib/loyalty";

const round2 = (n: number): number => Math.round(n * 100) / 100;
const gbpFromUsd = (usd: number): number => round2(usd / 1.3);
const HI = 46.38;
const LO = 46.37;

const LINES: Array<{ id: string; order: string; prefix: string }> = [
  { id: "636cd35b-7f49-44d8-9df6-9a27d683b743", order: "SBB-162342", prefix: "Miniatures fragrance gift set" },
  { id: "61700891-d691-45be-a9de-85096d645474", order: "SBB-855239", prefix: "Shuhrah Pour Homme" },
  { id: "af34b4ff-e30d-4426-bf7a-46c6a8b29974", order: "SBB-296329", prefix: "Bronze Nudes Lip & Cheek Best-Seller" },
  { id: "ddfe7375-7850-4535-90b1-d0abf9378c3e", order: "SBB-708598", prefix: "Unreal Blush + Glow Mini Trio" },
  { id: "f2357fa4-8e72-4aa5-a733-f3e33051ad22", order: "SBB-881636", prefix: "Forever Glow Luminizer" },
  { id: "3ad53334-5471-4b73-aa69-b27c0f933923", order: "SBB-881636", prefix: "FAUXFILTER Luminous Matte Liquid Concealer 9ml — Shade: HONEY" },
  { id: "d9dda454-d578-4c94-8b8a-8ed2eaaa242e", order: "SBB-465254", prefix: "FAUXFILTER Luminous Matte Liquid Concealer 9ml — Shade: Honey" },
  { id: "cae11b34-e781-4612-983e-0f3597202b37", order: "SBB-223047", prefix: "FAUXFILTER Luminous Matte Liquid Concealer 9ml — Shade: Meringue" },
  { id: "2383f710-0392-4ba7-9032-93d91c269c9b", order: "SBB-298904", prefix: "Blush Filter Liquid Blush — Shade: Strawberry Latte" },
  { id: "ac4712b7-52ce-47de-860d-e14d0c09af27", order: "SBB-378610", prefix: "Mini NUDE Obsession eyeshadow palette 10g — Colour: MEDIUM" },
  { id: "436b6a0a-73e6-4068-8fec-bee51d421639", order: "SBB-214086", prefix: "Angels' Share" },
  { id: "e2e30686-715e-41b0-b304-f2cffc443646", order: "SBB-297960", prefix: "Benetint" },
  { id: "14c488d7-03c2-4802-afcf-2bb39c250a29", order: "SBB-933167", prefix: "Bright Fix Blurring Powder" },
  { id: "2a36deb9-d0a2-4fc3-a81d-4dcb5caf37f1", order: "SBB-378610", prefix: "Easy Blur natural airbrush foundation 30ml — Shade: 140G Cashew" },
  { id: "d34492ec-6147-4936-a39a-64a88b5a775e", order: "SBB-223047", prefix: "Easy Blur natural airbrush foundation 30ml — Shade: 150G Creme Brulee" },
  { id: "19371ede-93b2-4c66-a2e5-c37b83f5b410", order: "SBB-624521", prefix: "Pillow Talk Eye Liner" },
  { id: "28884b6f-f9a5-48eb-abd8-f244f1213b6f", order: "SBB-492020", prefix: "Lip Contour Stain 0.5g — Shade: ROSEWOOD" },
  { id: "f827facc-3420-4160-be90-ebd0b6413254", order: "SBB-389495", prefix: "Blush Filter 4.5ml — Shade: COTTON CANDY" },
  { id: "a7eeea56-a30d-4ef2-bf1f-763421bf478a", order: "SBB-624521", prefix: "Unreal Blush Healthy Glow Stick 10g — Shade: Rosy Glow" },
  { id: "5a70dd13-4b79-4e9b-8869-3687eaa4b186", order: "SBB-296329", prefix: "Hollywood Flawless Filter complexion booster 30ml — Shade: 2.5" },
  { id: "85992c9c-1604-4f63-b804-45b7a5450ef6", order: "SBB-829715", prefix: "Dior Forever Skin Perfect Multi-Use Foundation Stick" },
  { id: "94abf451-5adb-48fe-9ab3-669afbed6f84", order: "SBB-937955", prefix: "Gloss Bomb Shimmer Stix Lip Gloss 3.6g — Shade: Hot Chocolit" },
  { id: "ab686c85-3754-443b-8f8f-87fddb15c351", order: "SBB-551357", prefix: "L'Imperatrice" },
  { id: "6de09fad-05f9-4606-a727-b388a1994587", order: "SBB-254119", prefix: "Aqua Allegoria Florabloom Hand Cream" }
];

const STOCK_NOTE = "Bought in $1,345 batch 2026-11-12 — not tied to a customer order";
const STOCK: Array<{ product_id: string | null; brand: string; name: string; cost: number; note?: string }> = [
  { product_id: null, brand: "Charlotte Tilbury", name: "Pillow Talk Everyday Icons", cost: HI },
  { product_id: null, brand: "Huda Beauty", name: "Bronze Filter Palette 7.5g — Medium", cost: HI,
    note: STOCK_NOTE + " (Aya Nassar SBB-630335 ordered Light)" },
  { product_id: null, brand: "Huda Beauty", name: "Bronze Filter Palette 7.5g — Medium", cost: HI,
    note: STOCK_NOTE + " (Aya Nassar SBB-630335 ordered Light)" },
  { product_id: null, brand: "Kiehl's", name: "Creamy Eye Treatment with Avocado 28ml", cost: LO,
    note: STOCK_NOTE + " (Aya Ismail SBB-318012 ordered 14ml)" },
  { product_id: "d394b288-6125-46d8-a215-966df7c42b7e", brand: "Dior", name: "J'adore Eau de Parfum 100ml", cost: LO }
];

const DUP_ORDER = "SBB-364974";
const DUP_NOTE = "Cancelled — duplicate of SBB-298904 (same Blush Filter Strawberry Latte), confirmed by owner 2026-11-12.";

async function main(): Promise<void> {
  if (!process.env.DATABASE_URL) { console.error("DATABASE_URL is not set."); process.exit(1); }
  const sql = getSql();

  // ---- sanity on the split ----
  const total = round2(LINES.length * HI + STOCK.reduce((s, x) => s + x.cost, 0));
  if (LINES.length + STOCK.length !== 29 || total !== 1345) {
    console.error(`Split check failed: ${LINES.length + STOCK.length} units, $${total} — aborting.`); process.exit(1);
  }
  if (new Set(LINES.map((l) => l.id)).size !== LINES.length) { console.error("Duplicate line id — aborting."); process.exit(1); }

  // ---- pre-flight: every line ----
  for (const l of LINES) {
    const r = (await sql`
      select oi.product_name, oi.sourced, o.order_number, o.status, o.payment_confirmed
      from order_items oi join orders o on o.id = oi.order_id where oi.id = ${l.id}
    `) as Array<{ product_name: string; sourced: boolean | null; order_number: string; status: string; payment_confirmed: boolean }>;
    const x = r[0];
    const bad = !x ? "not found"
      : x.order_number !== l.order ? `belongs to ${x.order_number}`
      : !x.product_name.startsWith(l.prefix) ? `name is "${x.product_name}"`
      : x.sourced ? "already sourced"
      : ["delivered", "cancelled", "refunded", "pending"].includes(x.status) ? `status ${x.status}`
      : !x.payment_confirmed ? "not payment_confirmed" : null;
    if (bad) { console.error(`Pre-flight ${l.order} / ${l.prefix}: ${bad} — aborting, nothing changed.`); process.exit(1); }
  }

  // ---- pre-flight: duplicate order ----
  const dup = (await sql`
    select o.id, o.status, c.full_name, coalesce(o.amount_paid_usd, 0)::numeric as paid,
           (select count(*) from order_items where order_id = o.id)::int as n_items,
           (select count(*) from order_items where order_id = o.id and sourced = true)::int as n_sourced
    from orders o left join customers c on c.id = o.customer_id where o.order_number = ${DUP_ORDER}
  `) as Array<{ id: string; status: string; full_name: string; paid: string; n_items: number; n_sourced: number }>;
  const d = dup[0];
  const dupBad = !d ? "not found"
    : d.full_name !== "Zeinab Ismail" ? `customer is ${d.full_name}`
    : d.status !== "payment_confirmed" ? `status ${d.status}`
    : Number(d.paid) !== 0 ? `has $${d.paid} paid`
    : d.n_items !== 1 || d.n_sourced !== 0 ? `${d.n_items} items / ${d.n_sourced} sourced` : null;
  if (dupBad) { console.error(`Pre-flight ${DUP_ORDER}: ${dupBad} — aborting, nothing changed.`); process.exit(1); }

  const already = (await sql`select count(*)::int as n from stock_items where notes like ${STOCK_NOTE + "%"}`) as Array<{ n: number }>;
  if (already[0].n > 0) { console.error("Stock rows for this batch already exist — aborting, nothing changed."); process.exit(1); }

  // ---- writes, one transaction ----
  const queries = [
    ...LINES.map((l) => sql`
      update order_items set cost_usd = ${HI}, cost_gbp = ${gbpFromUsd(HI)}, sourced = true
      where id = ${l.id} and coalesce(sourced, false) = false
    `),
    ...STOCK.map((s) => sql`
      insert into stock_items (product_id, product_name, product_brand, cost_usd, cost_gbp, quantity, notes, purchased_at)
      values (${s.product_id}, ${s.name}, ${s.brand}, ${s.cost}, ${gbpFromUsd(s.cost)}, ${1}, ${s.note ?? STOCK_NOTE}, current_date)
    `),
    sql`
      update orders set status = 'cancelled', payment_confirmed = false,
        notes = case when coalesce(notes, '') = '' then ${DUP_NOTE} else notes || ' | ' || ${DUP_NOTE} end,
        updated_at = now()
      where id = ${d.id} and status = 'payment_confirmed'
    `
  ];
  await sql.transaction(queries);

  // ---- verify ----
  const v = (await sql`select count(*)::int as n, sum(cost_usd)::numeric as s from order_items where id = any(${LINES.map((l) => l.id)}) and sourced = true`) as Array<{ n: number; s: string }>;
  const vs = (await sql`select count(*)::int as n, sum(cost_usd)::numeric as s from stock_items where notes like ${STOCK_NOTE + "%"}`) as Array<{ n: number; s: string }>;
  const vd = (await sql`select status, payment_confirmed from orders where id = ${d.id}`) as Array<{ status: string; payment_confirmed: boolean }>;
  console.log(`Sourced lines: ${v[0].n}/24, $${v[0].s}`);
  console.log(`Stock rows:    ${vs[0].n}/5,  $${vs[0].s}`);
  console.log(`Total:         $${round2(Number(v[0].s) + Number(vs[0].s))}`);
  console.log(`${DUP_ORDER}:    ${vd[0].status}, payment_confirmed=${vd[0].payment_confirmed}`);

  await syncOrderPoints(d.id);
  console.log("Loyalty points resynced for Zeinab Ismail.");
}
main().catch((err) => { console.error("Failed:", err); process.exit(1); });
