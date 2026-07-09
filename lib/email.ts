import { Resend } from "resend";

const FROM_ADDRESS = "Seasons by B <hello@seasonsbyb.co.uk>";
const ADMIN_NOTIFICATION_TO = "mohamedzaidan1990@gmail.com";

// Candy theme.
const COLOR_CREAM = "#fef7ff";
const COLOR_INK = "#2e1a28";
const COLOR_INK_MUTED = "#604868";
const COLOR_GOLD = "#e040a0";
const COLOR_ACCENT = "#e040a0";

export interface EmailOrderItem {
  brand: string;
  name: string;
  price_usd: number | string;
  quantity: number;
  url?: string | null;
}

export interface EmailOrder {
  order_number: string;
  product_brand: string;
  product_name: string;
  product_url?: string | null;
  price_usd: number | string;
  price_gbp?: number | string;
  payment_method?: string | null;
  notes?: string | null;
  // When present, the order is a multi-item cart order.
  items?: EmailOrderItem[];
}

export interface EmailCustomer {
  full_name: string;
  phone: string;
  email: string;
  address: string;
}

interface EmailConfig {
  whish: string;
  siteUrl: string;
  adminUrl: string;
  contactEmail: string;
  instagram: string;
  // Direct contact link (Instagram DM if a handle is configured, else email).
  contactUrl: string;
  contactLabel: string;
}

function getResend(): Resend | null {
  const key = process.env.RESEND_API_KEY;
  if (!key || key === "re_placeholder_replace_before_deploy") {
    return null;
  }
  return new Resend(key);
}

function getEmailConfig(): EmailConfig {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.seasonsbyb.co.uk";
  const instagram = (process.env.NEXT_PUBLIC_INSTAGRAM_USERNAME ?? "seasons.by.b").replace(/^@/, "");
  const contactEmail = process.env.NEXT_PUBLIC_CONTACT_EMAIL ?? "hello@seasonsbyb.co.uk";
  return {
    whish: process.env.WHISH_NUMBER ?? "03055491",
    siteUrl,
    adminUrl: `${siteUrl.replace(/\/$/, "")}/admin`,
    contactEmail,
    instagram,
    // ig.me/m/<handle> opens a direct-message thread (the Instagram equivalent
    // of wa.me). Falls back to email until a handle is configured.
    contactUrl: instagram ? `https://ig.me/m/${instagram}` : `mailto:${contactEmail}`,
    contactLabel: instagram ? "Message us on Instagram" : "Email us"
  };
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

function paymentMethodLabel(method?: string | null): string {
  if (method === "whish_link") return "Whish payment link";
  if (method === "whish_direct" || method === "whish") return "Direct Whish transfer";
  return method ?? "—";
}

// Add N working days (Mon–Fri) to today.
function addWorkingDays(days: number, from: Date = new Date()): Date {
  const d = new Date(from);
  let added = 0;
  while (added < days) {
    d.setDate(d.getDate() + 1);
    const day = d.getDay();
    if (day !== 0 && day !== 6) added += 1;
  }
  return d;
}

function formatDate(d: Date): string {
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function deliveryDateRange(): { range: string; min: Date; max: Date } {
  const min = addWorkingDays(10);
  const max = addWorkingDays(14);
  return { range: `${formatDate(min)} – ${formatDate(max)}`, min, max };
}

// Embedded mobile-friendly CSS — gracefully degrades in clients that ignore
// <style> blocks (Outlook etc.), where the inline desktop layout still holds.
const MOBILE_STYLES = `
  @media only screen and (max-width: 620px) {
    .container { width: 100% !important; }
    .pad { padding: 22px !important; }
    .h-pad { padding: 22px 22px !important; }
    h1 { font-size: 24px !important; line-height: 1.25 !important; }
    .stack-block { padding: 16px !important; }
    .order-number { font-size: 16px !important; }
    .price-big { font-size: 22px !important; }
    .cta { display: block !important; text-align: center !important; padding: 14px 22px !important; }
  }
`;

function baseLayout(title: string, body: string, preheader?: string): string {
  const hiddenPreheader = preheader
    ? `<div style="display:none;max-height:0;overflow:hidden;font-size:1px;line-height:1px;color:${COLOR_CREAM};opacity:0;">${preheader}</div>`
    : "";
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>${title}</title>
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="color-scheme" content="light" />
    <meta name="supported-color-schemes" content="light" />
    <style type="text/css">${MOBILE_STYLES}</style>
  </head>
  <body style="margin:0;padding:0;background-color:${COLOR_CREAM};font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;color:${COLOR_INK};">
    ${hiddenPreheader}
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:${COLOR_CREAM};padding:32px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" class="container" width="600" cellspacing="0" cellpadding="0" border="0" style="max-width:600px;width:100%;background-color:#FFFFFF;border:1px solid rgba(35,39,42,0.08);">
            <tr>
              <td class="h-pad" style="background-color:${COLOR_INK};padding:28px 32px;text-align:center;">
                <div style="font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;font-size:30px;color:${COLOR_GOLD};letter-spacing:0.5px;font-weight:700;">Seasons&nbsp;by&nbsp;B</div>
                <div style="font-size:11px;text-transform:uppercase;letter-spacing:4px;color:${COLOR_CREAM};opacity:0.7;margin-top:8px;">London&rsquo;s finest, delivered to your door</div>
              </td>
            </tr>
            <tr>
              <td class="pad" style="padding:36px 32px;">
                ${body}
              </td>
            </tr>
            <tr>
              <td style="background-color:${COLOR_CREAM};padding:22px 32px;text-align:center;font-size:12px;color:${COLOR_INK_MUTED};border-top:1px solid rgba(35,39,42,0.08);">
                <div>Seasons by B · London</div>
                <div style="margin-top:6px;">© ${new Date().getFullYear()} Seasons by B. All rights reserved.</div>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

function ctaButton(href: string, label: string, _variant: "gold" | "accent" = "gold"): string {
  // Candy pill: solid hot-pink with white text.
  return `<a class="cta" href="${href}" style="display:inline-block;background-color:${COLOR_ACCENT};color:#FFFFFF;text-decoration:none;padding:14px 30px;font-size:13px;text-transform:uppercase;letter-spacing:2px;font-weight:700;border-radius:9999px;">${label}</a>`;
}

function itemsList(items: EmailOrderItem[]): string {
  return items
    .map(
      (it) =>
        `<div style="display:flex;justify-content:space-between;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;font-size:15px;color:${COLOR_INK};margin-top:8px;">
          <span>${it.brand} — ${it.name}${it.quantity > 1 ? ` ×${it.quantity}` : ""}</span>
          <span style="white-space:nowrap;padding-left:12px;">${formatUsd(Number(it.price_usd) * it.quantity)}</span>
        </div>`
    )
    .join("");
}

function orderCard(order: EmailOrder): string {
  const body =
    order.items && order.items.length > 0
      ? `${itemsList(order.items)}
    <div style="border-top:1px solid rgba(35,39,42,0.12);margin-top:14px;padding-top:12px;" class="price-big">
      <span style="font-size:13px;text-transform:uppercase;letter-spacing:2px;color:${COLOR_INK_MUTED};">Total</span>
      <span style="font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;font-size:24px;color:${COLOR_INK};font-weight:700;float:right;">${formatUsd(order.price_usd)}</span>
    </div>`
      : `<div style="font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;font-size:20px;color:${COLOR_INK};margin-top:10px;">${order.product_brand} — ${order.product_name}</div>
    <div class="price-big" style="font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;font-size:26px;color:${COLOR_INK};margin-top:10px;font-weight:700;">${formatUsd(order.price_usd)}</div>`;
  return `<table role="presentation" class="stack-block" width="100%" cellspacing="0" cellpadding="0" border="0" style="border:1px solid rgba(35,39,42,0.08);background-color:${COLOR_CREAM};margin-top:24px;">
  <tr><td style="padding:22px;">
    <div class="order-number" style="font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;font-size:18px;color:${COLOR_INK};letter-spacing:1px;font-weight:700;">Order ${order.order_number}</div>
    ${body}
    <div style="font-size:13px;color:${COLOR_INK_MUTED};margin-top:12px;">Payment method: ${paymentMethodLabel(order.payment_method)}</div>
  </td></tr>
</table>`;
}

function whishDirectInstructions(cfg: EmailConfig): string {
  return `<table role="presentation" class="stack-block" width="100%" cellspacing="0" cellpadding="0" border="0" style="border:1px solid rgba(35,39,42,0.08);background-color:${COLOR_CREAM};margin-top:20px;">
  <tr>
    <td style="padding:22px;">
      <div style="font-size:11px;text-transform:uppercase;letter-spacing:3px;color:${COLOR_INK_MUTED};">Payment instructions — Whish</div>
      <p style="margin:12px 0 0;font-size:14px;line-height:1.7;color:${COLOR_INK};">
        Send your payment to Whish number <strong>${cfg.whish}</strong>, then send us the screenshot on Instagram or by email.
      </p>
      <ol style="margin:14px 0 0;padding-left:20px;font-size:14px;line-height:1.8;color:${COLOR_INK};">
        <li>Open Whish</li>
        <li>Tap <strong>Send Money</strong></li>
        <li>Enter number <strong>${cfg.whish}</strong></li>
        <li>Enter the order amount in USD</li>
        <li>Screenshot the confirmation</li>
        <li>Send the screenshot to us on Instagram or by email</li>
      </ol>
    </td>
  </tr>
</table>`;
}

function whishLinkInstructions(cfg: EmailConfig): string {
  const waUrl = cfg.contactUrl;
  return `<table role="presentation" class="stack-block" width="100%" cellspacing="0" cellpadding="0" border="0" style="border:1px solid rgba(35,39,42,0.08);background-color:${COLOR_CREAM};margin-top:20px;">
  <tr>
    <td style="padding:22px;">
      <div style="font-size:11px;text-transform:uppercase;letter-spacing:3px;color:${COLOR_INK_MUTED};">Payment instructions — Whish payment link</div>
      <p style="margin:12px 0 0;font-size:14px;line-height:1.7;color:${COLOR_INK};">
        Send your invoice to us via <a href="${waUrl}" style="color:${COLOR_ACCENT};">${cfg.contactLabel}</a> and we&rsquo;ll generate a secure Whish payment link for you.
        You&rsquo;ll receive automatic payment confirmation and receipt via email once paid.
      </p>
    </td>
  </tr>
</table>`;
}

function paymentInstructionsBlock(method: string | null | undefined, cfg: EmailConfig): string {
  if (method === "whish_link") return whishLinkInstructions(cfg);
  return whishDirectInstructions(cfg);
}

export async function sendOrderConfirmation(order: EmailOrder, customer: EmailCustomer): Promise<void> {
  const resend = getResend();
  if (!resend) {
    console.warn("[email] RESEND_API_KEY not configured — skipping order confirmation");
    return;
  }
  const cfg = getEmailConfig();
  const subject = `Your Seasons by B order — ${order.order_number}`;
  const preheader = `Order ${order.order_number} received. Estimated delivery 10–14 working days.`;
  const isWhishLink = order.payment_method === "whish_link";
  const waUrl = cfg.contactUrl;

  const firstName = customer.full_name.split(" ")[0] || "there";

  const html = baseLayout(
    subject,
    `
    <div style="font-size:11px;text-transform:uppercase;letter-spacing:3px;color:${COLOR_ACCENT};font-weight:600;">Order received</div>
    <h1 style="font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;font-size:30px;line-height:1.2;margin:8px 0 16px;color:${COLOR_INK};font-weight:700;">Thank you, ${firstName}.</h1>
    <p style="font-size:15px;line-height:1.65;color:${COLOR_INK};margin:0 0 8px;">We&rsquo;ve received your order and will source it from London&rsquo;s finest retailers.</p>
    <p style="font-size:15px;line-height:1.65;color:${COLOR_INK};margin:0;">Estimated delivery: <strong>10–14 working days</strong>.</p>

    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin-top:18px;">
      <tr><td style="background-color:${COLOR_CREAM};border:1px solid rgba(35,39,42,0.08);border-radius:8px;padding:12px 14px;font-size:13px;line-height:1.6;color:${COLOR_INK};">
        🛵 <strong>Delivery within Lebanon is $3–5</strong> depending on your location, paid in cash directly to the delivery driver on arrival — <strong>not included in this invoice</strong>.
      </td></tr>
    </table>

    ${orderCard(order)}
    ${paymentInstructionsBlock(order.payment_method, cfg)}

    <p style="font-size:14px;line-height:1.65;color:${COLOR_INK};margin:24px 0 0;">
      ${
        isWhishLink
          ? "Send your invoice to us on Instagram or by email and we'll send you a secure payment link."
          : "After paying, send your payment screenshot to us on Instagram or by email so we can confirm and place your order."
      }
    </p>
    <p style="margin:20px 0 0;">${ctaButton(waUrl, cfg.contactLabel)}</p>

    <p style="font-size:13px;line-height:1.65;color:${COLOR_INK_MUTED};margin:32px 0 0;">
      Any questions? Reply directly to this email or message us on Instagram or by email.
    </p>
    `,
    preheader
  );

  const textBody = isWhishLink
    ? `Payment: Whish payment link
Send your invoice to us on Instagram or by email: ${waUrl}
We'll generate a secure Whish payment link and send confirmation + receipt by email once paid.`
    : `Payment: Whish to ${cfg.whish}
1. Open Whish
2. Tap Send Money
3. Enter number ${cfg.whish}
4. Enter the order amount in USD
5. Screenshot the confirmation
6. Send the screenshot to us on Instagram or by email: ${waUrl}`;

  const text = `Seasons by B — Order received

Order: ${order.order_number}
Product: ${order.product_brand} — ${order.product_name}
Price: ${formatUsd(order.price_usd)}
Payment method: ${paymentMethodLabel(order.payment_method)}

${textBody}

Estimated delivery: 10–14 working days.
Delivery within Lebanon is $3-5 depending on your location, paid in cash directly to the delivery driver on arrival — not included in this invoice.

Seasons by B — London's finest, delivered to your door.`;

  try {
    const { data, error } = await resend.emails.send({
      from: FROM_ADDRESS,
      to: customer.email,
      subject,
      html,
      text
    });
    if (error) console.error("[email] sendOrderConfirmation resend error:", JSON.stringify(error));
    else console.log("[email] sendOrderConfirmation sent id=" + ((data as { id?: string } | null)?.id ?? "?"));
  } catch (err) {
    console.error("[email] sendOrderConfirmation threw", err);
  }
}

export async function sendOrderNotification(order: EmailOrder, customer: EmailCustomer): Promise<void> {
  const resend = getResend();
  if (!resend) {
    console.warn("[email] RESEND_API_KEY not configured — skipping admin notification");
    return;
  }
  const cfg = getEmailConfig();
  const priceLabel = formatUsd(order.price_usd);
  const subject = `🛍️ New Order ${order.order_number} — ${priceLabel} — ACTION REQUIRED`;
  const preheader = `${customer.full_name} just placed an order for ${priceLabel}. Confirm payment & generate the invoice.`;

  const html = baseLayout(
    subject,
    `
    <div style="font-size:11px;text-transform:uppercase;letter-spacing:3px;color:${COLOR_ACCENT};font-weight:600;">New order</div>
    <h1 style="font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;font-size:26px;line-height:1.2;margin:8px 0 18px;color:${COLOR_INK};font-weight:700;">${order.order_number} — ${priceLabel}</h1>

    <table role="presentation" class="stack-block" width="100%" cellspacing="0" cellpadding="0" border="0" style="font-size:14px;line-height:1.8;color:${COLOR_INK};border:1px solid rgba(35,39,42,0.08);background-color:${COLOR_CREAM};margin-top:8px;">
      <tr><td style="padding:22px;">
        <div style="font-size:11px;text-transform:uppercase;letter-spacing:3px;color:${COLOR_INK_MUTED};margin-bottom:8px;">Customer</div>
        <strong>${customer.full_name}</strong><br />
        ${customer.phone}<br />
        <a href="mailto:${customer.email}" style="color:${COLOR_ACCENT};">${customer.email}</a><br />
        <span style="white-space:pre-line;display:block;margin-top:8px;">${customer.address}</span>
      </td></tr>
    </table>

    <table role="presentation" class="stack-block" width="100%" cellspacing="0" cellpadding="0" border="0" style="font-size:14px;line-height:1.8;color:${COLOR_INK};border:1px solid rgba(35,39,42,0.08);background-color:${COLOR_CREAM};margin-top:16px;">
      <tr><td style="padding:22px;">
        <div style="font-size:11px;text-transform:uppercase;letter-spacing:3px;color:${COLOR_INK_MUTED};margin-bottom:8px;">${order.items && order.items.length > 0 ? "Items — open each to add to basket" : "Product"}</div>
        ${
          order.items && order.items.length > 0
            ? order.items
                .map((it) => {
                  const link = it.url
                    ? it.url
                    : `https://www.selfridges.com/GB/en/cat/?term=${encodeURIComponent(`${it.brand} ${it.name}`)}`;
                  const label = it.url ? "Open product 🛒" : "Find on Selfridges 🔍";
                  return `<div style="margin-bottom:8px;">${it.brand} — ${it.name}${it.quantity > 1 ? ` ×${it.quantity}` : ""} · ${formatUsd(Number(it.price_usd) * it.quantity)}<br /><a href="${link}" style="color:${COLOR_ACCENT};word-break:break-all;">${label}</a></div>`;
                })
                .join("")
            : `<strong>${order.product_brand} — ${order.product_name}</strong>`
        }<br />
        Total: ${priceLabel}${order.price_gbp ? ` (£${order.price_gbp} GBP)` : ""}<br />
        Payment method: ${paymentMethodLabel(order.payment_method)}<br />
        ${order.product_url ? `<div style="margin-top:8px;">Source: <a href="${order.product_url}" style="color:${COLOR_ACCENT};word-break:break-all;">${order.product_url}</a></div>` : ""}
        ${order.notes ? `<div style="margin-top:8px;">Notes: ${order.notes}</div>` : ""}
      </td></tr>
    </table>

    <p style="margin:28px 0 0;">${ctaButton(cfg.adminUrl, "VIEW IN ADMIN", "accent")}</p>
    <p style="font-size:13px;color:${COLOR_INK_MUTED};margin:14px 0 0;">⚡ Action required: check Whish to confirm payment, then generate the invoice in admin.</p>
    `,
    preheader
  );

  const text = `New order ${order.order_number} — ${priceLabel}

Customer: ${customer.full_name}
Phone: ${customer.phone}
Email: ${customer.email}
Address: ${customer.address}

${
    order.items && order.items.length > 0
      ? "Items:\n" +
        order.items
          .map(
            (it) =>
              `- ${it.brand} — ${it.name}${it.quantity > 1 ? ` x${it.quantity}` : ""}${it.url ? `\n  ${it.url}` : ""}`
          )
          .join("\n")
      : `Product: ${order.product_brand} — ${order.product_name}${order.product_url ? `\n${order.product_url}` : ""}`
  }
Price: ${priceLabel}${order.price_gbp ? ` (£${order.price_gbp} GBP)` : ""}
Payment method: ${paymentMethodLabel(order.payment_method)}
${order.notes ? `Notes: ${order.notes}\n` : ""}Admin: ${cfg.adminUrl}`;

  try {
    const { data, error } = await resend.emails.send({
      from: FROM_ADDRESS,
      to: ADMIN_NOTIFICATION_TO,
      subject,
      html,
      text
    });
    if (error) console.error("[email] sendOrderNotification resend error:", JSON.stringify(error));
    else console.log("[email] sendOrderNotification sent id=" + ((data as { id?: string } | null)?.id ?? "?"));
  } catch (err) {
    console.error("[email] sendOrderNotification threw", err);
  }
}

export async function sendInvoiceEmail(args: {
  orderNumber: string;
  customerEmail: string;
  customerName: string;
  pdfBase64: string;
}): Promise<void> {
  const resend = getResend();
  if (!resend) {
    console.warn("[email] RESEND_API_KEY not configured — skipping invoice email");
    return;
  }
  const cfg = getEmailConfig();
  const subject = `Your Seasons by B Invoice — ${args.orderNumber}`;
  const firstName = args.customerName.split(" ")[0] || "there";
  const waUrl = cfg.contactUrl;
  const preheader = `Payment confirmed for ${args.orderNumber}. Your invoice is attached.`;

  const html = baseLayout(
    subject,
    `
    <div style="font-size:11px;text-transform:uppercase;letter-spacing:3px;color:${COLOR_ACCENT};font-weight:600;">Payment confirmed</div>
    <h1 style="font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;font-size:30px;line-height:1.2;margin:8px 0 16px;color:${COLOR_INK};font-weight:700;">Your invoice, ${firstName} ✓</h1>
    <p style="font-size:15px;line-height:1.65;color:${COLOR_INK};margin:0 0 8px;">
      We&rsquo;ve confirmed your payment for order <strong>${args.orderNumber}</strong>. Your invoice is attached as a PDF.
    </p>
    <p style="font-size:15px;line-height:1.65;color:${COLOR_INK};margin:0;">
      We&rsquo;re now sourcing your items from London — estimated delivery <strong>10–14 working days</strong>.
    </p>
    <p style="margin:24px 0 0;">${ctaButton(waUrl, cfg.contactLabel)}</p>
    `,
    preheader
  );

  const text = `Seasons by B — Invoice ${args.orderNumber}

Your payment has been confirmed. Your invoice is attached as a PDF.
We're now sourcing your items from London — estimated delivery 10-14 working days.

Questions? ${waUrl}`;

  try {
    const { data, error } = await resend.emails.send({
      from: FROM_ADDRESS,
      to: args.customerEmail,
      subject,
      html,
      text,
      attachments: [{ filename: `seasons-by-b-${args.orderNumber}.pdf`, content: args.pdfBase64 }]
    });
    if (error) console.error("[email] sendInvoiceEmail resend error:", JSON.stringify(error));
    else console.log("[email] sendInvoiceEmail sent id=" + ((data as { id?: string } | null)?.id ?? "?"));
  } catch (err) {
    console.error("[email] sendInvoiceEmail failed", err);
  }
}

export async function sendPromoEmail(args: {
  orderNumber: string;
  customerEmail: string;
  customerName: string;
  entryNumber: number;
}): Promise<void> {
  const resend = getResend();
  if (!resend) {
    console.warn("[email] RESEND_API_KEY not configured — skipping promo email");
    return;
  }
  const cfg = getEmailConfig();
  const subject = `You've got the chance to win! 🎁 Huda Beauty × Seasons by B`;
  const firstName = args.customerName.split(" ")[0] || "there";
  const preheader = `You're one of the first 10! Prizes include $100 cash, $55 cash & Huda Beauty minis.`;
  const hudaUrl = `${cfg.siteUrl}/brand/huda-beauty`;

  const html = baseLayout(
    subject,
    `
    <div style="font-size:11px;text-transform:uppercase;letter-spacing:3px;color:${COLOR_ACCENT};font-weight:600;">Huda Beauty × Seasons by B</div>
    <h1 style="font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;font-size:28px;line-height:1.2;margin:8px 0 16px;color:${COLOR_INK};font-weight:700;">You&rsquo;ve got the chance to win, ${firstName}! 🎁</h1>
    <p style="font-size:15px;line-height:1.65;color:${COLOR_INK};margin:0 0 12px;">
      Your order <strong>${args.orderNumber}</strong> includes the Habibti Lip &amp; Cheek Best Sellers Kit &mdash; you&rsquo;re <strong>#${args.entryNumber}</strong> out of the first 10 qualifying buyers!
    </p>
    <p style="font-size:15px;line-height:1.65;color:${COLOR_INK};margin:0 0 24px;">
      Your prize will be placed randomly inside your package. Keep an eye out when it arrives!
    </p>
    <table role="presentation" class="stack-block" width="100%" cellspacing="0" cellpadding="0" border="0" style="border:1px solid rgba(224,64,160,0.35);background-color:rgba(224,64,160,0.08);margin-bottom:24px;">
      <tr><td style="padding:22px;">
        <div style="font-size:11px;text-transform:uppercase;letter-spacing:3px;color:${COLOR_INK_MUTED};margin-bottom:12px;">Prize tiers</div>
        <div style="font-size:15px;color:${COLOR_INK};line-height:2;">
          <div>&#129351; <strong>$100 USD cash</strong></div>
          <div>&#129352; <strong>$55 USD cash</strong></div>
          <div>&#127800; <strong>8&times; Huda Beauty mini products</strong></div>
        </div>
      </td></tr>
    </table>
    <p style="font-size:13px;line-height:1.65;color:${COLOR_INK_MUTED};margin:0 0 24px;">
      First 10 buyers only. Prizes placed randomly in qualifying packages.
    </p>
    <p style="margin:0;">${ctaButton(hudaUrl, "Browse Huda Beauty")}</p>
    `,
    preheader
  );

  const text = `Huda Beauty x Seasons by B — You've got the chance to win!

Hi ${firstName}, you're #${args.entryNumber} out of the first 10 qualifying buyers!

Your order ${args.orderNumber} includes the Habibti Lip & Cheek Best Sellers Kit.

Prizes:
$100 USD cash
$55 USD cash
8x Huda Beauty mini products

Your prize will be placed randomly inside your package. Keep an eye out when it arrives!

First 10 buyers only. Prizes placed randomly in qualifying packages.

Browse Huda Beauty: ${hudaUrl}`;

  try {
    const { data, error } = await resend.emails.send({
      from: FROM_ADDRESS,
      to: args.customerEmail,
      subject,
      html,
      text
    });
    if (error) console.error("[email] sendPromoEmail resend error:", JSON.stringify(error));
    else console.log("[email] sendPromoEmail sent id=" + ((data as { id?: string } | null)?.id ?? "?"));
  } catch (err) {
    console.error("[email] sendPromoEmail threw", err);
  }
}

export async function sendPaymentConfirmation(order: EmailOrder, customer: EmailCustomer): Promise<void> {
  const resend = getResend();
  if (!resend) {
    console.warn("[email] RESEND_API_KEY not configured — skipping payment confirmation");
    return;
  }
  const cfg = getEmailConfig();
  const subject = "Payment confirmed — Seasons by B";
  const { range: deliveryRange } = deliveryDateRange();
  const waUrl = cfg.contactUrl;
  const firstName = customer.full_name.split(" ")[0] || "there";
  const preheader = `Payment received. Expected delivery ${deliveryRange}.`;

  const html = baseLayout(
    subject,
    `
    <div style="font-size:11px;text-transform:uppercase;letter-spacing:3px;color:${COLOR_ACCENT};font-weight:600;">Payment confirmed</div>
    <h1 style="font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;font-size:30px;line-height:1.2;margin:8px 0 16px;color:${COLOR_INK};font-weight:700;">Payment received ✓</h1>
    <p style="font-size:15px;line-height:1.65;color:${COLOR_INK};margin:0 0 8px;">
      Hi ${firstName}, we&rsquo;ve received your payment and your order is now being processed.
    </p>

    ${orderCard(order)}

    <table role="presentation" class="stack-block" width="100%" cellspacing="0" cellpadding="0" border="0" style="border:1px solid rgba(224,64,160,0.35);background-color:rgba(224,64,160,0.08);margin-top:20px;">
      <tr><td style="padding:22px;">
        <div style="font-size:11px;text-transform:uppercase;letter-spacing:3px;color:${COLOR_INK_MUTED};">Expected delivery</div>
        <div style="font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;font-size:22px;color:${COLOR_INK};margin-top:8px;font-weight:700;">${deliveryRange}</div>
        <div style="font-size:13px;color:${COLOR_INK_MUTED};margin-top:6px;">10–14 working days from today, door to door.</div>
      </td></tr>
    </table>

    <p style="margin:24px 0 0;">${ctaButton(waUrl, cfg.contactLabel)}</p>

    <p style="font-size:13px;line-height:1.65;color:${COLOR_INK_MUTED};margin:32px 0 0;">
      We&rsquo;ll send you updates as your order ships and arrives.
    </p>
    `,
    preheader
  );

  const text = `Seasons by B — Payment confirmed

Order ${order.order_number} — ${order.product_brand} — ${order.product_name}
Payment received. Your order is now being processed.
Expected delivery: ${deliveryRange} (10–14 working days from today).

Questions? ${waUrl}`;

  try {
    const { data, error } = await resend.emails.send({
      from: FROM_ADDRESS,
      to: customer.email,
      subject,
      html,
      text
    });
    if (error) console.error("[email] sendPaymentConfirmation resend error:", JSON.stringify(error));
    else console.log("[email] sendPaymentConfirmation sent id=" + ((data as { id?: string } | null)?.id ?? "?"));
  } catch (err) {
    console.error("[email] sendPaymentConfirmation threw", err);
  }
}
