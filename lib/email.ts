import { Resend } from "resend";

const FROM_ADDRESS = "Seasons by B <hello@seasonsbyb.co.uk>";
const ADMIN_NOTIFICATION_TO = "mohamedzaidan1990@gmail.com";

export interface EmailOrder {
  order_number: string;
  product_brand: string;
  product_name: string;
  product_url?: string | null;
  price_usd: number | string;
  price_gbp?: number | string;
  payment_method?: string | null;
  notes?: string | null;
}

export interface EmailCustomer {
  full_name: string;
  phone: string;
  email: string;
  address: string;
}

interface EmailConfig {
  whish: string;
  bankName: string;
  bankIban: string;
  accountHolder: string;
  whatsappNumber: string;
}

function getResend(): Resend | null {
  const key = process.env.RESEND_API_KEY;
  if (!key || key === "re_placeholder_replace_before_deploy") {
    return null;
  }
  return new Resend(key);
}

function getEmailConfig(): EmailConfig {
  return {
    whish: process.env.WHISH_NUMBER ?? "03055491",
    bankName: process.env.BANK_NAME ?? "QNB",
    bankIban: process.env.BANK_IBAN ?? "QA64QNBA000000000224215260001",
    accountHolder: process.env.ACCOUNT_HOLDER ?? "Mohamed Akram Zaidan",
    whatsappNumber: process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? "+96103055491"
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

function whatsappLink(number: string, message?: string): string {
  const digits = number.replace(/\D/g, "");
  const base = `https://wa.me/${digits}`;
  return message ? `${base}?text=${encodeURIComponent(message)}` : base;
}

function baseLayout(title: string, body: string): string {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>${title}</title>
    <meta name="viewport" content="width=device-width, initial-scale=1" />
  </head>
  <body style="margin:0;padding:0;background-color:#FFFDF5;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;color:#23272A;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#FFFDF5;padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" style="max-width:600px;background-color:#FFFFFF;border:1px solid rgba(35,39,42,0.08);">
            <tr>
              <td style="background-color:#23272A;padding:24px 32px;text-align:center;">
                <div style="font-family:Georgia,'Times New Roman',serif;font-size:28px;color:#F4D360;letter-spacing:0.5px;">Seasons by B</div>
                <div style="font-size:11px;text-transform:uppercase;letter-spacing:4px;color:#FFFDF5;opacity:0.7;margin-top:6px;">London&rsquo;s finest, delivered to your door</div>
              </td>
            </tr>
            <tr>
              <td style="padding:32px;">
                ${body}
              </td>
            </tr>
            <tr>
              <td style="background-color:#FFFDF5;padding:20px 32px;text-align:center;font-size:12px;color:#5A6168;border-top:1px solid rgba(35,39,42,0.08);">
                © 2025 Seasons by B. London.
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

function paymentBlock(cfg: EmailConfig): string {
  return `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="border:1px solid rgba(35,39,42,0.08);background-color:#FFFDF5;margin-top:20px;">
  <tr>
    <td style="padding:20px;">
      <div style="font-size:11px;text-transform:uppercase;letter-spacing:3px;color:#5A6168;">Payment instructions</div>
      <div style="margin-top:12px;font-size:15px;line-height:1.6;">
        <strong style="color:#23272A;">Option 1 — Whish:</strong> send to <strong>${cfg.whish}</strong> (${cfg.accountHolder})<br />
        <strong style="color:#23272A;">Option 2 — Bank transfer:</strong> ${cfg.bankName}, IBAN <span style="word-break:break-all;">${cfg.bankIban}</span> (${cfg.accountHolder})
      </div>
    </td>
  </tr>
</table>`;
}

export async function sendOrderConfirmation(order: EmailOrder, customer: EmailCustomer): Promise<void> {
  const resend = getResend();
  if (!resend) {
    console.warn("[email] RESEND_API_KEY not configured — skipping order confirmation");
    return;
  }
  const cfg = getEmailConfig();
  const subject = `Your Seasons by B order — ${order.order_number}`;
  const waMessage = `Hi Seasons by B, my order number is ${order.order_number}. Here is my payment confirmation.`;
  const waUrl = whatsappLink(cfg.whatsappNumber, waMessage);
  const html = baseLayout(
    subject,
    `
    <div style="font-size:11px;text-transform:uppercase;letter-spacing:3px;color:#C0392B;">Order received</div>
    <h1 style="font-family:Georgia,'Times New Roman',serif;font-size:28px;line-height:1.2;margin:8px 0 16px;color:#23272A;">Thank you, ${customer.full_name.split(" ")[0] || "there"}.</h1>
    <p style="font-size:15px;line-height:1.6;color:#23272A;margin:0 0 8px;">We&rsquo;ve received your order and will source it from London&rsquo;s finest retailers.</p>
    <p style="font-size:15px;line-height:1.6;color:#23272A;margin:0;">Estimated delivery: <strong>10–14 working days</strong>.</p>

    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="border:1px solid rgba(35,39,42,0.08);background-color:#FFFDF5;margin-top:24px;">
      <tr><td style="padding:20px;">
        <div style="font-size:11px;text-transform:uppercase;letter-spacing:3px;color:#5A6168;">Order ${order.order_number}</div>
        <div style="font-family:Georgia,'Times New Roman',serif;font-size:20px;color:#23272A;margin-top:8px;">${order.product_brand} — ${order.product_name}</div>
        <div style="font-family:Georgia,'Times New Roman',serif;font-size:24px;color:#23272A;margin-top:8px;">${formatUsd(order.price_usd)}</div>
      </td></tr>
    </table>

    ${paymentBlock(cfg)}

    <p style="font-size:14px;line-height:1.6;color:#23272A;margin:24px 0 0;">
      After paying, send your payment screenshot to us on WhatsApp so we can confirm and place your order.
    </p>
    <p style="margin:20px 0 0;">
      <a href="${waUrl}" style="display:inline-block;background-color:#F4D360;color:#23272A;text-decoration:none;padding:14px 28px;font-size:13px;text-transform:uppercase;letter-spacing:3px;">Contact us on WhatsApp</a>
    </p>

    <p style="font-size:13px;line-height:1.6;color:#5A6168;margin:32px 0 0;">
      Any questions? Reply directly to this email or message us on WhatsApp.
    </p>
    `
  );

  const text = `Seasons by B — Order received

Order: ${order.order_number}
Product: ${order.product_brand} — ${order.product_name}
Price: ${formatUsd(order.price_usd)}

Payment options:
- Whish: ${cfg.whish} (${cfg.accountHolder})
- Bank transfer: ${cfg.bankName}, IBAN ${cfg.bankIban} (${cfg.accountHolder})

Estimated delivery: 10–14 working days.

After paying, send your payment screenshot to us on WhatsApp: ${waUrl}

Seasons by B — London's finest, delivered to your door.`;

  try {
    await resend.emails.send({
      from: FROM_ADDRESS,
      to: customer.email,
      subject,
      html,
      text
    });
  } catch (err) {
    console.error("[email] sendOrderConfirmation failed", err);
  }
}

export async function sendOrderNotification(order: EmailOrder, customer: EmailCustomer): Promise<void> {
  const resend = getResend();
  if (!resend) {
    console.warn("[email] RESEND_API_KEY not configured — skipping admin notification");
    return;
  }
  const priceLabel = formatUsd(order.price_usd);
  const subject = `New order — ${order.order_number} — ${priceLabel}`;
  const adminUrl = "https://seasonsbyb.co.uk/admin";

  const html = baseLayout(
    subject,
    `
    <div style="font-size:11px;text-transform:uppercase;letter-spacing:3px;color:#C0392B;">New order alert</div>
    <h1 style="font-family:Georgia,'Times New Roman',serif;font-size:24px;line-height:1.2;margin:8px 0 16px;color:#23272A;">${order.order_number} — ${priceLabel}</h1>

    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="font-size:14px;line-height:1.7;color:#23272A;border:1px solid rgba(35,39,42,0.08);background-color:#FFFDF5;margin-top:16px;">
      <tr><td style="padding:20px;">
        <strong>Customer:</strong> ${customer.full_name}<br />
        <strong>Phone:</strong> ${customer.phone}<br />
        <strong>Email:</strong> <a href="mailto:${customer.email}" style="color:#C0392B;">${customer.email}</a><br />
        <strong>Address:</strong><br />
        <span style="white-space:pre-line;">${customer.address}</span>
      </td></tr>
    </table>

    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="font-size:14px;line-height:1.7;color:#23272A;border:1px solid rgba(35,39,42,0.08);background-color:#FFFDF5;margin-top:16px;">
      <tr><td style="padding:20px;">
        <strong>Product:</strong> ${order.product_brand} — ${order.product_name}<br />
        <strong>Price:</strong> ${priceLabel}${order.price_gbp ? ` (£${order.price_gbp} GBP)` : ""}<br />
        <strong>Payment method:</strong> ${order.payment_method ?? "—"}<br />
        ${order.product_url ? `<strong>Source:</strong> <a href="${order.product_url}" style="color:#C0392B;word-break:break-all;">${order.product_url}</a><br />` : ""}
        ${order.notes ? `<strong>Notes:</strong> ${order.notes}` : ""}
      </td></tr>
    </table>

    <p style="margin:24px 0 0;">
      <a href="${adminUrl}" style="display:inline-block;background-color:#C0392B;color:#FFFFFF;text-decoration:none;padding:14px 28px;font-size:13px;text-transform:uppercase;letter-spacing:3px;">Open admin dashboard</a>
    </p>
    `
  );

  const text = `New order ${order.order_number} — ${priceLabel}

Customer: ${customer.full_name}
Phone: ${customer.phone}
Email: ${customer.email}
Address: ${customer.address}

Product: ${order.product_brand} — ${order.product_name}
Price: ${priceLabel}${order.price_gbp ? ` (£${order.price_gbp} GBP)` : ""}
Payment method: ${order.payment_method ?? "—"}
${order.product_url ? `Source: ${order.product_url}\n` : ""}${order.notes ? `Notes: ${order.notes}\n` : ""}
Admin: ${adminUrl}`;

  try {
    await resend.emails.send({
      from: FROM_ADDRESS,
      to: ADMIN_NOTIFICATION_TO,
      subject,
      html,
      text
    });
  } catch (err) {
    console.error("[email] sendOrderNotification failed", err);
  }
}

export async function sendPaymentConfirmation(order: EmailOrder, customer: EmailCustomer): Promise<void> {
  const resend = getResend();
  if (!resend) {
    console.warn("[email] RESEND_API_KEY not configured — skipping payment confirmation");
    return;
  }
  const cfg = getEmailConfig();
  const subject = "Payment confirmed — SEASONS BY B";
  const waMessage = `Hi Seasons by B, this is order ${order.order_number}.`;
  const waUrl = whatsappLink(cfg.whatsappNumber, waMessage);

  const html = baseLayout(
    subject,
    `
    <div style="font-size:11px;text-transform:uppercase;letter-spacing:3px;color:#C0392B;">Payment confirmed</div>
    <h1 style="font-family:Georgia,'Times New Roman',serif;font-size:28px;line-height:1.2;margin:8px 0 16px;color:#23272A;">Payment received ✓</h1>
    <p style="font-size:15px;line-height:1.6;color:#23272A;margin:0 0 8px;">
      Hi ${customer.full_name.split(" ")[0] || "there"}, we&rsquo;ve received your payment and your order is now being processed.
    </p>
    <p style="font-size:15px;line-height:1.6;color:#23272A;margin:0;">
      Estimated delivery: <strong>10–14 working days</strong>.
    </p>

    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="border:1px solid rgba(35,39,42,0.08);background-color:#FFFDF5;margin-top:24px;">
      <tr><td style="padding:20px;">
        <div style="font-size:11px;text-transform:uppercase;letter-spacing:3px;color:#5A6168;">Order ${order.order_number}</div>
        <div style="font-family:Georgia,'Times New Roman',serif;font-size:20px;color:#23272A;margin-top:8px;">${order.product_brand} — ${order.product_name}</div>
        <div style="font-family:Georgia,'Times New Roman',serif;font-size:22px;color:#23272A;margin-top:8px;">${formatUsd(order.price_usd)}</div>
      </td></tr>
    </table>

    <p style="margin:24px 0 0;">
      <a href="${waUrl}" style="display:inline-block;background-color:#F4D360;color:#23272A;text-decoration:none;padding:14px 28px;font-size:13px;text-transform:uppercase;letter-spacing:3px;">Contact us on WhatsApp</a>
    </p>

    <p style="font-size:13px;line-height:1.6;color:#5A6168;margin:32px 0 0;">
      We&rsquo;ll send you updates as your order ships and arrives.
    </p>
    `
  );

  const text = `Seasons by B — Payment confirmed

Order ${order.order_number} — ${order.product_brand} — ${order.product_name}
Payment received. Your order is now being processed.
Estimated delivery: 10–14 working days.

Questions? ${waUrl}`;

  try {
    await resend.emails.send({
      from: FROM_ADDRESS,
      to: customer.email,
      subject,
      html,
      text
    });
  } catch (err) {
    console.error("[email] sendPaymentConfirmation failed", err);
  }
}
