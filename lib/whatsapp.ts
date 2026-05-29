import twilio from "twilio";

export interface WhatsAppOrder {
  order_number: string;
  product_brand: string;
  product_name: string;
  price_usd: number | string;
  items?: Array<{ brand: string; name: string; quantity: number }>;
}

export interface WhatsAppCustomer {
  full_name: string;
  phone: string;
  address: string;
}

function isConfigured(): boolean {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_WHATSAPP_FROM;
  return Boolean(
    sid &&
      token &&
      from &&
      sid !== "placeholder" &&
      token !== "placeholder"
  );
}

function getClient() {
  if (!isConfigured()) return null;
  return twilio(process.env.TWILIO_ACCOUNT_SID!, process.env.TWILIO_AUTH_TOKEN!);
}

function formatUsd(value: number | string): string {
  const num = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(num)) return "$0";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0
  }).format(num);
}

function toWhatsAppAddress(phone: string): string {
  const trimmed = phone.trim();
  if (trimmed.startsWith("whatsapp:")) return trimmed;
  const digits = trimmed.replace(/[^\d+]/g, "");
  const e164 = digits.startsWith("+") ? digits : `+${digits.replace(/^00/, "")}`;
  return `whatsapp:${e164}`;
}

export async function sendWhatsAppAlert(order: WhatsAppOrder, customer: WhatsAppCustomer): Promise<void> {
  const client = getClient();
  if (!client) {
    console.warn("[whatsapp] Twilio not configured — skipping admin alert");
    return;
  }
  const to = process.env.LARA_WHATSAPP_NUMBER;
  if (!to) {
    console.warn("[whatsapp] LARA_WHATSAPP_NUMBER not set — skipping admin alert");
    return;
  }
  const from = process.env.TWILIO_WHATSAPP_FROM!;
  const lines =
    order.items && order.items.length > 0
      ? order.items.map((it) => `• ${it.brand} — ${it.name}${it.quantity > 1 ? ` ×${it.quantity}` : ""}`).join("\n")
      : `${order.product_brand} — ${order.product_name}`;
  const body = `🛍 New order ${order.order_number}
${lines}
Total: ${formatUsd(order.price_usd)}
Customer: ${customer.full_name}
Phone: ${customer.phone}
Address: ${customer.address}`;

  try {
    await client.messages.create({
      from,
      to: toWhatsAppAddress(to),
      body
    });
  } catch (err) {
    console.error("[whatsapp] sendWhatsAppAlert failed", err);
  }
}

// Notify the team of a new AI bespoke consultation request.
export async function sendBespokeAlert(customerWhatsApp: string | null, summary: string): Promise<void> {
  const client = getClient();
  if (!client) {
    console.warn("[whatsapp] Twilio not configured — skipping bespoke alert");
    return;
  }
  const to = process.env.LARA_WHATSAPP_NUMBER;
  if (!to) {
    console.warn("[whatsapp] LARA_WHATSAPP_NUMBER not set — skipping bespoke alert");
    return;
  }
  const from = process.env.TWILIO_WHATSAPP_FROM!;
  const body = `🐝 New Bespoke Request — Seasons by B

Customer WhatsApp: ${customerWhatsApp || "(not provided)"}
Time: ${new Date().toISOString()}

What they want:
${summary}

Full conversation available in admin dashboard.
Reply to the customer on WhatsApp to follow up.`;

  try {
    await client.messages.create({ from, to: toWhatsAppAddress(to), body });
  } catch (err) {
    console.error("[whatsapp] sendBespokeAlert failed", err);
  }
}

export async function sendWhatsAppConfirmation(
  customerPhone: string,
  orderNumber: string,
  productName: string
): Promise<void> {
  const client = getClient();
  if (!client) {
    console.warn("[whatsapp] Twilio not configured — skipping customer confirmation");
    return;
  }
  const from = process.env.TWILIO_WHATSAPP_FROM!;
  const body = `Hi! Your Seasons by B order ${orderNumber} for ${productName} has been confirmed. Payment received ✓ We'll keep you updated. Questions? Reply here.`;

  try {
    await client.messages.create({
      from,
      to: toWhatsAppAddress(customerPhone),
      body
    });
  } catch (err) {
    console.error("[whatsapp] sendWhatsAppConfirmation failed", err);
  }
}
