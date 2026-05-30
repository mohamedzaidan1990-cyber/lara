import { NextResponse } from "next/server";
import { ensureSchema, generateOrderNumber, getSql, type OrderWithCustomer } from "@/lib/db";
import { isAdmin } from "@/lib/auth";
import { sendOrderConfirmation, sendOrderNotification, type EmailOrder, type EmailOrderItem } from "@/lib/email";
import { sendWhatsAppAlert } from "@/lib/whatsapp";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface IncomingItem {
  brand?: string;
  name?: string;
  product_url?: string | null;
  image_url?: string | null;
  price_gbp?: number;
  price_usd?: number;
  quantity?: number;
}

interface CreateBody {
  // Legacy single-product fields
  full_name?: string;
  phone?: string;
  email?: string;
  address?: string;
  notes?: string;
  product_brand?: string;
  product_name?: string;
  product_url?: string | null;
  price_gbp?: number;
  price_usd?: number;
  // New cart fields
  customer?: { full_name?: string; phone?: string; email?: string; address?: string; notes?: string };
  items?: IncomingItem[];
  payment_method?: string | null;
  payment_screenshot?: string | null;
}

export async function GET() {
  if (!isAdmin()) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  await ensureSchema();
  const sql = getSql();
  const rows = (await sql`
    select o.id, o.order_number, o.customer_id, o.customer_email, o.product_name, o.product_brand, o.product_url,
           o.price_gbp, o.price_usd, o.total_usd, o.total_gbp, o.items_count,
           o.status, o.payment_method, o.payment_confirmed,
           o.payment_screenshot, o.notes, o.created_at, o.updated_at,
           o.invoice_sent_at, o.tracking_number,
           o.cost_gbp, o.cost_usd, o.platform_fee_usd, o.profit_usd, o.profit_notes,
           coalesce(c.full_name, '') as full_name,
           coalesce(c.phone, '') as phone,
           coalesce(c.address, '') as address,
           coalesce(
             (select json_agg(json_build_object(
                'brand', oi.product_brand, 'name', oi.product_name, 'quantity', oi.quantity,
                'price_usd', oi.price_usd, 'price_gbp', oi.price_gbp, 'product_url', oi.product_url
              )) from order_items oi where oi.order_id = o.id),
             '[]'
           ) as items
    from orders o
    left join customers c on c.id = o.customer_id
    order by o.created_at desc
  `) as OrderWithCustomer[];
  return NextResponse.json({ orders: rows });
}

function num(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as CreateBody;

  const isCart = Array.isArray(body.items) && body.items.length > 0;

  // Normalise customer fields from either payload shape.
  const cust = body.customer ?? {
    full_name: body.full_name,
    phone: body.phone,
    email: body.email,
    address: body.address,
    notes: body.notes
  };

  for (const key of ["full_name", "phone", "email", "address"] as const) {
    if (!cust[key]) {
      return NextResponse.json({ error: `Missing field: ${key}` }, { status: 400 });
    }
  }
  if (!EMAIL_RE.test(String(cust.email))) {
    return NextResponse.json({ error: "Invalid email" }, { status: 400 });
  }

  // Build a normalised item list (cart) or a single pseudo-item (legacy).
  let items: Array<{ brand: string; name: string; product_url: string | null; image_url: string | null; price_gbp: number; price_usd: number; quantity: number }>;
  if (isCart) {
    items = body.items!.map((it) => ({
      brand: String(it.brand ?? "").trim() || "Seasons by B",
      name: String(it.name ?? "").trim(),
      product_url: it.product_url ?? null,
      image_url: it.image_url ?? null,
      price_gbp: num(it.price_gbp),
      price_usd: num(it.price_usd),
      quantity: Math.max(1, Math.floor(num(it.quantity)) || 1)
    }));
    if (items.some((it) => !it.name)) {
      return NextResponse.json({ error: "Each item needs a name" }, { status: 400 });
    }
  } else {
    if (!body.product_name || !body.product_brand) {
      return NextResponse.json({ error: "Missing product" }, { status: 400 });
    }
    items = [
      {
        brand: body.product_brand,
        name: body.product_name,
        product_url: body.product_url ?? null,
        image_url: null,
        price_gbp: num(body.price_gbp),
        price_usd: num(body.price_usd),
        quantity: 1
      }
    ];
  }

  const totalUSD = Math.round(items.reduce((s, it) => s + it.price_usd * it.quantity, 0) * 100) / 100;
  const totalGBP = Math.round(items.reduce((s, it) => s + it.price_gbp * it.quantity, 0) * 100) / 100;
  const itemsCount = items.length;
  const summaryName = items.length === 1 ? items[0].name : `${items.length} items`;
  const summaryBrand = items.length === 1 ? items[0].brand : "Multiple brands";
  const summaryUrl = items[0].product_url ?? null;

  await ensureSchema();
  const sql = getSql();

  const customer = (await sql`
    insert into customers (full_name, phone, address)
    values (${cust.full_name}, ${cust.phone}, ${cust.address})
    returning id
  `) as Array<{ id: string }>;
  const customerId = customer[0]?.id;
  if (!customerId) {
    return NextResponse.json({ error: "Failed to create customer" }, { status: 500 });
  }

  let orderNumber = generateOrderNumber();
  let attempts = 0;
  let inserted: Array<{ id: string; order_number: string }> = [];
  while (attempts < 5) {
    try {
      inserted = (await sql`
        insert into orders (
          order_number, customer_id, customer_email, product_name, product_brand, product_url,
          price_gbp, price_usd, total_gbp, total_usd, items_count, payment_method, payment_screenshot, notes
        )
        values (
          ${orderNumber}, ${customerId}, ${cust.email}, ${summaryName}, ${summaryBrand}, ${summaryUrl},
          ${totalGBP}, ${totalUSD}, ${totalGBP}, ${totalUSD}, ${itemsCount},
          ${body.payment_method ?? null}, ${body.payment_screenshot ?? null}, ${cust.notes ?? null}
        )
        returning id, order_number
      `) as Array<{ id: string; order_number: string }>;
      break;
    } catch (err) {
      attempts += 1;
      if (attempts >= 5) {
        return NextResponse.json({ error: (err as Error).message }, { status: 500 });
      }
      orderNumber = generateOrderNumber();
    }
  }

  const order = inserted[0];
  if (!order) {
    return NextResponse.json({ error: "Failed to create order" }, { status: 500 });
  }

  // Insert line items.
  for (const it of items) {
    try {
      await sql`
        insert into order_items (order_id, product_name, product_brand, product_url, image_url, price_gbp, price_usd, quantity)
        values (${order.id}, ${it.name}, ${it.brand}, ${it.product_url}, ${it.image_url}, ${it.price_gbp}, ${it.price_usd}, ${it.quantity})
      `;
    } catch (err) {
      console.error("order_items insert failed", err);
    }
  }

  const emailItems: EmailOrderItem[] = items.map((it) => ({
    brand: it.brand,
    name: it.name,
    price_usd: it.price_usd,
    quantity: it.quantity
  }));
  const emailOrder: EmailOrder = {
    order_number: order.order_number,
    product_brand: summaryBrand,
    product_name: summaryName,
    product_url: summaryUrl,
    price_usd: totalUSD,
    price_gbp: totalGBP,
    payment_method: body.payment_method ?? null,
    notes: cust.notes ?? null,
    items: isCart ? emailItems : undefined
  };
  const emailCustomer = {
    full_name: cust.full_name!,
    phone: cust.phone!,
    email: cust.email!,
    address: cust.address!
  };

  try {
    await Promise.all([
      sendOrderConfirmation(emailOrder, emailCustomer).catch((err) => console.error("sendOrderConfirmation error", err)),
      sendOrderNotification(emailOrder, emailCustomer).catch((err) => console.error("sendOrderNotification error", err)),
      sendWhatsAppAlert(
        {
          order_number: order.order_number,
          product_brand: summaryBrand,
          product_name: summaryName,
          price_usd: totalUSD,
          payment_method: body.payment_method ?? null,
          items: items.map((it) => ({ brand: it.brand, name: it.name, quantity: it.quantity, price_usd: it.price_usd }))
        },
        emailCustomer
      ).catch((err) => console.error("sendWhatsAppAlert error", err))
    ]);
  } catch (err) {
    console.error("notification dispatch failed", err);
  }

  return NextResponse.json({ order_number: order.order_number, order_id: order.id, customer_id: customerId });
}
