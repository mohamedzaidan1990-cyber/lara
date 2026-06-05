import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

export interface InvoiceOrder {
  order_number: string;
  created_at: string | Date;
  payment_confirmed: boolean;
  payment_method?: string | null;
  total_usd: number;
}

export interface InvoiceCustomer {
  full_name: string;
  email: string;
  phone: string;
  address: string;
}

export interface InvoiceItem {
  brand: string;
  name: string;
  quantity: number;
  price_usd: number;
}

// Candy theme: hot pink primary, warm plum ink, soft pink rows.
const GOLD: [number, number, number] = [224, 64, 160];
const INK: [number, number, number] = [46, 26, 40];
const MUTED: [number, number, number] = [96, 72, 104];
const GREEN: [number, number, number] = [39, 124, 67];
const ROW_ALT: [number, number, number] = [255, 237, 247];

function usd(n: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 }).format(n);
}

function fmtDate(d: string | Date): string {
  const date = typeof d === "string" ? new Date(d) : d;
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function paymentLabel(method?: string | null): string {
  if (method === "whish_link") return "Whish payment link";
  return "Whish Transfer";
}

export function generateInvoice(order: InvoiceOrder, customer: InvoiceCustomer, items: InvoiceItem[]): Buffer {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const left = 14;
  const right = pageWidth - 14;

  // ---- Header ----
  doc.setFont("helvetica", "bold");
  doc.setFontSize(26);
  doc.setTextColor(...GOLD);
  doc.text("Seasons by B", left, 22);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...MUTED);
  doc.text("London's Finest, Delivered to Your Door", left, 28);

  // Invoice meta (right aligned)
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(...INK);
  doc.text("INVOICE", right, 20, { align: "right" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(...MUTED);
  doc.text(`Invoice #: ${order.order_number}`, right, 27, { align: "right" });
  doc.text(`Date: ${fmtDate(order.created_at)}`, right, 32, { align: "right" });

  // Status
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  if (order.payment_confirmed) {
    doc.setTextColor(...GREEN);
    doc.text("STATUS: PAID", right, 38, { align: "right" });
  } else {
    doc.setTextColor(...MUTED);
    doc.text("STATUS: UNPAID", right, 38, { align: "right" });
  }

  // Gold divider
  doc.setDrawColor(...GOLD);
  doc.setLineWidth(0.8);
  doc.line(left, 43, right, 43);

  // ---- Billed To ----
  let y = 54;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(...INK);
  doc.text("Billed To:", left, y);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...MUTED);
  y += 6;
  doc.text(customer.full_name || "—", left, y);
  y += 5;
  doc.text(customer.email || "—", left, y);
  y += 5;
  doc.text(customer.phone || "—", left, y);
  y += 5;
  const addressLines = doc.splitTextToSize(customer.address || "—", 90);
  doc.text(addressLines, left, y);
  y += addressLines.length * 5;

  // ---- Items table ----
  const startY = Math.max(y + 6, 90);
  autoTable(doc, {
    startY,
    head: [["Product", "Brand", "Qty", "Unit Price", "Total"]],
    body: items.map((it) => [
      it.name,
      it.brand,
      String(it.quantity),
      usd(it.price_usd),
      usd(it.price_usd * it.quantity)
    ]),
    foot: [["Subtotal", "", "", "", usd(items.reduce((s, it) => s + it.price_usd * it.quantity, 0))]],
    theme: "grid",
    headStyles: { fillColor: GOLD, textColor: INK, fontStyle: "bold" },
    footStyles: { fillColor: ROW_ALT, textColor: INK, fontStyle: "bold" },
    alternateRowStyles: { fillColor: ROW_ALT },
    bodyStyles: { textColor: INK },
    columnStyles: {
      2: { halign: "center" },
      3: { halign: "right" },
      4: { halign: "right" }
    },
    styles: { fontSize: 9, cellPadding: 3 },
    margin: { left, right: 14 }
  });

  // ---- Payment section ----
  // @ts-expect-error lastAutoTable is attached by the plugin at runtime
  const afterTable: number = doc.lastAutoTable?.finalY ?? startY + 40;
  let py = afterTable + 12;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(...INK);
  doc.text("Payment", left, py);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...MUTED);
  py += 6;
  doc.text(`Payment method: ${paymentLabel(order.payment_method)}`, left, py);
  py += 5;
  doc.text(`Payment status: ${order.payment_confirmed ? "Confirmed" : "Pending"}`, left, py);
  py += 5;
  doc.text("Confirmed by: Seasons by B team", left, py);

  // ---- Footer ----
  const footY = pageHeight - 26;
  doc.setDrawColor(...GOLD);
  doc.setLineWidth(0.5);
  doc.line(left, footY - 6, right, footY - 6);
  doc.setFont("helvetica", "italic");
  doc.setFontSize(11);
  doc.setTextColor(...INK);
  // jsPDF core fonts don't render emoji, so we use a tasteful text mark.
  doc.text("Thank you for shopping with Seasons by B", left, footY, { align: "left" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(...MUTED);
  const ig = (process.env.NEXT_PUBLIC_INSTAGRAM_USERNAME ?? "").replace(/^@/, "");
  const contactEmail = process.env.NEXT_PUBLIC_CONTACT_EMAIL ?? "hello@seasonsbyb.co.uk";
  const contact = ig
    ? `Email: ${contactEmail}   |   Instagram: @${ig}   |   seasonsbyb.co.uk`
    : `Email: ${contactEmail}   |   seasonsbyb.co.uk`;
  doc.text(`For any questions — ${contact}`, left, footY + 6);
  doc.text("Estimated delivery: 10-14 working days from order confirmation.", left, footY + 11);

  return Buffer.from(doc.output("arraybuffer"));
}
