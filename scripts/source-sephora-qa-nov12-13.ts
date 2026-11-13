/**
 * Sephora Qatar (Villaggio) purchases, 12–13 Nov 2026, plus two items bought
 * separately. cost_usd = QAR / 3.645 (Sephora ME rate), cost_gbp = cost_usd / 1.3.
 *
 * 1) Receipt 12/11/2026 (Txn 660007587000030014611520261112150918, QAR 4,731).
 * 2) Exchange 13/11/2026 (from the user's screenshots; no e-receipt emailed):
 *    RETURNED  Gisou Honey Infused Lip Oil (-125) — so Fatima Noureddine's
 *              free-gift lip oil line (SBB-708598) stays UNSOURCED;
 *              Huda #FAUXFILTER Color Corrector full size (-137);
 *              Tarte Sweet Delights Lip & Lash Set (-240) = receipt "SET SETS 21ML".
 *    BOUGHT    2x Tarte Face Card, Gisou lip mask, 2x Kiehl's avocado eye cream,
 *              Mario Sculpt & Pop, Too Faced Better Than Love mascara, Tarte lip
 *              trio, Huda Faux Filter Color Corrector Mini, Huda Blush Filter
 *              palette, Huda Nude Obsessions palette.
 *    NOT recorded here (user says they're for someone — awaiting who):
 *              the 2nd Kiehl's eye cream (QAR 172) and the Too Faced mascara (QAR 135).
 * 3) Bought separately: 2x CT Magic Cream 15ml $88 ($44 each); Dior Forever
 *    Nude Radiant powder for Lina Habra $75.
 *
 * Receipt free gifts (QAR 0) are not recorded.
 * "REPACK EXPRES MILK 1" (QAR 75) -> stock per user (product name unknown).
 *
 * Every order line is pinned by id and re-checked (order number, name prefix,
 * unsourced, live, payment_confirmed). One transaction.
 *
 * Run:  npx tsx scripts/source-sephora-qa-nov12-13.ts
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

const round2 = (n: number): number => Math.round(n * 100) / 100;
const gbpFromUsd = (usd: number): number => round2(usd / 1.3);
const q = (qar: number): number => round2(qar / 3.645);

type Line = { id: string; order: string; prefix: string; usd: number; src: string };
const LINES: Line[] = [
  // ---- receipt 12 Nov ----
  { id: "1d622704-bd27-4356-a71c-f8ea53647992", order: "SBB-598793", prefix: "Glazed Cherry Honey Infused Hair & Body Mist", usd: q(115), src: "HONEY INFUSED MIST" },
  { id: "e12dae84-2a53-49c4-bdd5-620e79712a3a", order: "SBB-791782", prefix: "Honey Gloss Ceramide Hair Mask", usd: q(175), src: "HONEY INFUSED MASK" },
  { id: "c72797f9-da70-4cdc-8097-6f5d52dc1c0b", order: "SBB-791782", prefix: "Honey Gloss Ceramide Therapy Hydrating Conditioner", usd: q(110), src: "HONEY INFUSED COND" },
  { id: "7e5c9293-b380-4ce0-a159-afde6e483a73", order: "SBB-791782", prefix: "Honey Gloss Ceramide Therapy Hydrating Shampoo", usd: q(110), src: "HONEY INFUSED SHAM" },
  { id: "7135dc2f-b1c5-4075-9079-3c40e02ac07a", order: "SBB-791782", prefix: "Honey Gloss Collagen Drops Hair Oil", usd: q(100), src: "HONEY INFUSED OIL 20" },
  { id: "82327325-04c7-4724-92be-504b5f944871", order: "SBB-962126", prefix: "The Protective Type", usd: q(115), src: "THE PROTECTIV CREA" },
  { id: "29d22e20-b7f1-49c2-a1e4-83e1861b36ab", order: "SBB-962126", prefix: "Vanilla 28 Eau de Parfum 100ml", usd: q(528), src: "KAYALI EDP 100ML" },
  { id: "45c1c257-a0d2-47c5-aac2-3f46c34e680d", order: "SBB-912487", prefix: "Foaming Rice Deep Cleanser 175ml", usd: q(55), src: "BYOMA FACE 175ML" },
  { id: "4924adf2-8616-4da3-8d30-26be363e9f03", order: "SBB-296329", prefix: "All About Lips Set", usd: q(190), src: "SET ALL LIPS" },
  { id: "c2390bb6-7b8c-49bf-8709-7ef0e6400855", order: "SBB-112074", prefix: "Easy Bake loose baking and setting powder 20g — Shade: 3 BANANA BREAD", usd: q(175), src: "SETTINGPOWDER FACE 3" },
  { id: "3ca08a6b-9a82-45f8-82fe-67856d5a14e3", order: "SBB-332744", prefix: "Easy Bake Duo Loose Powder 6.5g — Shade: Cherry Peach", usd: q(185), src: "EASY BAKE POWD" },
  { id: "85e24e32-a8bd-4fb0-92d4-6e54270e08c6", order: "SBB-724187", prefix: "Easy Bake Mini Loose Powder 6g — Shade: Peach Pie", usd: q(95), src: "EASY BAKE FACE" },
  { id: "4169d792-6148-4dc0-a132-05873a222625", order: "SBB-724187", prefix: "Faux Filter Luminous Matte Concealer 2ml — Shade: Nougat", usd: q(63), src: "FAUX FILLER FACE" },
  { id: "9555f235-3f77-4b42-870c-5f4fafa42f7a", order: "SBB-724187", prefix: "Soft Pinch Liquid Blush — Shade: Hope", usd: q(135), src: "SOFT PINCH BLSH HOPE" },
  { id: "11bfd004-dff9-422d-8ef2-7b7ac450f6ef", order: "SBB-753774", prefix: "Forever Skin Glow Foundation", usd: q(270), src: "DIORSKIN FORE FACE" },
  { id: "f309a739-3254-48f0-b9c2-b21309e92b9b", order: "SBB-630335", prefix: "Bronze Filter Palette 7.5g — Light", usd: q(185), src: "BRONZE FILTER SUN" },
  { id: "026cf276-6188-4bda-a251-5ba6bc1b67f5", order: "SBB-378610", prefix: "Blush Filter Palette 7.5g — Colour: Strawberry Latte", usd: q(175), src: "BLUSH FILTER FACE" },
  { id: "f9341103-4ee6-46d5-8c38-af811ea1ee69", order: "SBB-389495", prefix: "Your Skin But Better CC+ Cream", usd: q(390), src: "CC CREAM FACE FAIR x2 (qty-2 line, total)" },
  { id: "dc869bd3-9e2a-4203-8b3d-6cc346cfe049", order: "SBB-933167", prefix: "Powder Melt Glass Setting Spray", usd: q(135), src: "POWDER MELT SPRA" },
  { id: "97c1aba6-f7c0-4c4a-af0e-5b7719463e5b", order: "SBB-112074", prefix: "Make Me Blush Bold Blurring Blush 1.5g — Colour: 44 Nude Lavalliere", usd: q(255), src: "MAKE ME BLUSH" },
  { id: "49a7174a-8a50-4d13-a1fc-b48e399cc95a", order: "SBB-970987", prefix: "XOXO Blush & Glow", usd: q(150), src: "SET XOXO BLUS SET" },
  { id: "c63976f6-089b-475c-a550-ab8cabace93d", order: "SBB-197874", prefix: "Easy Blur natural airbrush foundation 30ml — Shade: 140G Cashew", usd: q(189), src: "EASY BLUR FOUN" },
  { id: "6c56ac43-46da-4dee-ad8f-65be8d25c6cc", order: "SBB-112074", prefix: "Easy Blur natural airbrush foundation 30ml — Shade: 250G Cheesecake", usd: q(189), src: "EASY BLUR FOUN" },
  { id: "4953db2c-a175-4cc8-bdc3-689615224dc6", order: "SBB-624521", prefix: "Travel-Size Shape Tape", usd: q(65), src: "SHAPE TAPE TS CONC" },
  // ---- exchange 13 Nov ----
  { id: "cebcf1b3-1029-48be-b99b-e80cb85ece8a", order: "SBB-970987", prefix: "Face Card Never Declines CC Undereye & Brush", usd: q(115), src: "exchange: Tarte Face Card" },
  { id: "58488ce5-0166-40ef-b695-e16261c75a12", order: "SBB-296329", prefix: "Face Card Never Declines CC Undereye & Brush", usd: q(115), src: "exchange: Tarte Face Card" },
  { id: "5d4f1613-0071-498c-ae68-384c96d84f65", order: "SBB-598793", prefix: "Honey Glaze Collagen Therapy Lip Mask", usd: q(125), src: "exchange: Gisou lip mask" },
  { id: "2fd1b811-8488-4fed-908c-725d3275d427", order: "SBB-318012", prefix: "Creamy Eye Treatment with Avocado 14ml", usd: q(172), src: "exchange: Kiehl's eye cream" },
  { id: "30dccaa2-b2fc-4adc-b838-75d6b3fb5602", order: "SBB-112074", prefix: "Sculpt And Pop On-The-Go", usd: q(125), src: "exchange: Mario Sculpt & Pop" },
  { id: "a542ea0f-4174-4ce5-8ae2-ba6a3da09e8a", order: "SBB-299845", prefix: "Don't Kiss & Tell Maracuja Juicy Lip Trio", usd: q(155), src: "exchange: Tarte lip trio" },
  { id: "ea351cbc-928d-417c-9575-b03f3e647d8d", order: "SBB-724187", prefix: "Faux Filter Mini Colour Corrector 2ml — Shade: Peach", usd: q(63), src: "exchange: Huda CC mini" },
  { id: "1a873feb-c9c6-41d4-8453-99897241f760", order: "SBB-197874", prefix: "Blush Filter Palette 7.5g — Colour: Strawberry Latte", usd: q(175), src: "exchange: Huda blush palette" },
  { id: "ebafc92f-4143-4e1b-8fc4-4a18f78e4cb2", order: "SBB-389495", prefix: "Mini NUDE Obsession eyeshadow palette 10g — Shade: MEDIUM", usd: q(137), src: "exchange: Huda Nude Obsessions" },
  // ---- bought separately ----
  { id: "8fc12ed3-f7b1-49e9-95ec-169a3ba5319e", order: "SBB-318012", prefix: "Charlotte's Magic Cream 15ml", usd: 44, src: "2x Magic Cream $88" },
  { id: "b8068ff1-c2b1-4889-a838-874e16bf28b3", order: "SBB-389495", prefix: "Charlotte's Magic Cream 15ml", usd: 44, src: "2x Magic Cream $88" },
  { id: "75784a44-9129-4869-b191-3ec6e1994043", order: "SBB-881636", prefix: "Forever Nude Radiant Filter Blurring Setting Powder", usd: 75, src: "Dior powder $75" }
];

const STOCK_NOTE = "Sephora Villaggio receipt 12/11/2026 — line \"REPACK EXPRES MILK 1\" (QAR 75), not tied to an order";

async function main(): Promise<void> {
  if (!process.env.DATABASE_URL) { console.error("DATABASE_URL is not set."); process.exit(1); }
  const sql = getSql();
  if (new Set(LINES.map((l) => l.id)).size !== LINES.length) { console.error("Duplicate line id — aborting."); process.exit(1); }

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
  const already = (await sql`select count(*)::int as n from stock_items where notes = ${STOCK_NOTE}`) as Array<{ n: number }>;
  if (already[0].n > 0) { console.error("Stock row already exists — aborting, nothing changed."); process.exit(1); }

  await sql.transaction([
    ...LINES.map((l) => sql`
      update order_items set cost_usd = ${l.usd}, cost_gbp = ${gbpFromUsd(l.usd)}, sourced = true
      where id = ${l.id} and coalesce(sourced, false) = false
    `),
    sql`
      insert into stock_items (product_name, product_brand, cost_usd, cost_gbp, quantity, notes, purchased_at)
      values (${"Repack Express Milk (Sephora receipt line — product TBC)"}, ${"Sephora"}, ${q(75)}, ${gbpFromUsd(q(75))}, ${1}, ${STOCK_NOTE}, ${"2026-11-12"})
    `
  ]);

  const v = (await sql`select count(*)::int as n, sum(cost_usd)::numeric as s from order_items where id = any(${LINES.map((l) => l.id)}) and sourced = true`) as Array<{ n: number; s: string }>;
  const expected = round2(LINES.reduce((s, l) => s + l.usd, 0));
  console.log(`Sourced ${v[0].n}/${LINES.length} lines, $${v[0].s} (expected $${expected})`);
  console.log(`Stock: Repack Express Milk $${q(75)}`);
  for (const l of LINES) console.log(`  ${l.order}  $${l.usd.toFixed(2)}  ${l.prefix}  [${l.src}]`);
}
main().catch((err) => { console.error("Failed:", err); process.exit(1); });
