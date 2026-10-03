/**
 * PDF of every item still to be bought: lines on open orders (not pending,
 * delivered, cancelled or refunded) that aren't sourced yet. Brand, product,
 * shade and quantity only — no prices. Identical lines are combined.
 *
 * Run:  npx tsx scripts/awaiting-order-pdf.ts   (writes to ~/Downloads)
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
import { writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { getSql } from "../lib/db";

async function main(): Promise<void> {
  const sql = getSql();
  const rows = (await sql`
    select oi.product_brand brand, oi.product_name name, oi.quantity qty
    from order_items oi join orders o on o.id = oi.order_id
    where o.status not in ('pending', 'delivered', 'cancelled', 'refunded')
      and coalesce(oi.sourced, false) = false
  `) as Array<{ brand: string; name: string; qty: number }>;

  const agg = new Map<string, { brand: string; product: string; shade: string; qty: number }>();
  for (const r of rows) {
    let name = r.name.replace(/\s*—\s*Discounted price.*$/i, "").replace(/\s{2,}/g, " ").trim();
    let shade = "";
    const m = name.match(/^(.*?)\s+—\s+(?:Shade:\s*)?(.+)$/);
    if (m) {
      name = m[1];
      shade = m[2];
    }
    const key = `${r.brand}|${name}|${shade}`.toLowerCase();
    const cur = agg.get(key);
    if (cur) cur.qty += Number(r.qty) || 1;
    else agg.set(key, { brand: r.brand, product: name, shade, qty: Number(r.qty) || 1 });
  }
  const list = [...agg.values()].sort((a, b) => a.brand.localeCompare(b.brand) || a.product.localeCompare(b.product));
  const total = list.reduce((s, x) => s + x.qty, 0);

  const now = new Date();
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(46, 26, 40);
  doc.text("Seasons by B — Items Awaiting Order", 14, 18);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  doc.setTextColor(96, 72, 104);
  doc.text(`${now.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}  ·  ${list.length} products  ·  ${total} units`, 14, 25);
  autoTable(doc, {
    startY: 31,
    head: [["#", "Brand", "Product", "Shade", "Qty"]],
    body: list.map((x, i) => [String(i + 1), x.brand, x.product, x.shade || "—", String(x.qty)]),
    theme: "grid",
    headStyles: { fillColor: [224, 64, 160], textColor: [255, 255, 255], fontStyle: "bold" },
    alternateRowStyles: { fillColor: [255, 237, 247] },
    bodyStyles: { textColor: [46, 26, 40] },
    styles: { fontSize: 9.5, cellPadding: 2.4, valign: "middle" },
    columnStyles: { 0: { cellWidth: 11, halign: "center" }, 1: { cellWidth: 38, fontStyle: "bold" }, 3: { cellWidth: 34 }, 4: { cellWidth: 12, halign: "center" } },
    margin: { left: 14, right: 14 }
  });

  const out = join(homedir(), "Downloads", `Seasons-by-B-awaiting-order-${now.toISOString().slice(0, 10)}.pdf`);
  writeFileSync(out, Buffer.from(doc.output("arraybuffer")));
  console.log(`OK  ${out} — ${list.length} products, ${total} units, ${doc.getNumberOfPages()} page(s)`);
  for (const x of list) console.log(`  ${x.qty} × ${x.brand} — ${x.product}${x.shade ? ` (${x.shade})` : ""}`);
}

main().catch((err) => {
  console.error("Failed:", err);
  process.exit(1);
});
