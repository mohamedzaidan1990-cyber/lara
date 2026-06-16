import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth";
import { getSql, generateOrderNumber } from "@/lib/db";

interface ManualItem {
  brand: string;
  name: string;
  price_usd: number;
  quantity: number;
}

interface ManualOrderBody {
  source: "instagram" | "whatsapp" | "direct";
  customer: {
    full_name: string;
    phone: string;
    address: string;
    email?: string;
  };
  items: ManualItem[];
  payment_method: string;
  payment_confirmed: boolean;
  notes?: string;
}

export async function POST(req: Request) {
  if (!isAdmin()) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const body = (await req.json()) as ManualOrderBody;

  const { customer, items, source, payment_method, payment_confirmed, notes } = body;

  if (!customer?.full_name || !customer?.phone || !customer?.address) {
    return NextResponse.json({ error: "Customer name, phone, and address are required" }, { status: 400 });
  }
  if (!items?.length) {
    return NextResponse.json({ error: "At least one item is required" }, { status: 400 });
  }
  for (const it of items) {
    if (!it.brand || !it.name || !(it.price_usd > 0)) {
      return NextResponse.json({ error: "Each item needs a brand, name, and price" }, { status: 400 });
    }
  }

  const sql = getSql();

  // Create customer
  const custRows = (await sql`
    insert into customers (full_name, phone, address)
    values (${customer.full_name.trim()}, ${customer.phone.trim()}, ${customer.address.trim()})
    returning id
  `) as Array<{ id: string }>;
  const cust = custRows[0];

  const totalUsd = items.reduce((s, i) => s + i.price_usd * (i.quantity || 1), 0);
  const totalGbp = totalUsd / 1.30;
  const orderNumber = generateOrderNumber();

  const summaryBrand = items.length === 1 ? items[0].brand : `${items.length} brands`;
  const summaryName = items.length === 1 ? items[0].name : `${items.length} items`;

  const status = payment_confirmed ? "payment_confirmed" : "pending";

  const orderRows = (await sql`
    insert into orders (
      order_number, customer_id, customer_email,
      product_name, product_brand,
      price_usd, price_gbp, total_usd, total_gbp, items_count,
      status, payment_method, payment_confirmed, notes, source
    )
    values (
      ${orderNumber}, ${cust.id}, ${customer.email?.trim() || null},
      ${summaryName}, ${summaryBrand},
      ${totalUsd}, ${totalGbp}, ${totalUsd}, ${totalGbp}, ${items.length},
      ${status}, ${payment_method || null}, ${payment_confirmed},
      ${notes?.trim() || null}, ${source || "direct"}
    )
    returning id, order_number, created_at
  `) as Array<{ id: string; order_number: string; created_at: string }>;
  const order = orderRows[0];

  for (const it of items) {
    const qty = it.quantity || 1;
    const pUsd = it.price_usd;
    const pGbp = pUsd / 1.30;
    await sql`
      insert into order_items (order_id, product_name, product_brand, price_usd, price_gbp, quantity)
      values (${order.id}, ${it.name.trim()}, ${it.brand.trim()}, ${pUsd}, ${pGbp}, ${qty})
    `;
  }

  // Return the order joined with customer so the dashboard can prepend it
  const fullRows = (await sql`
    select o.*, c.full_name, c.phone, c.address,
           coalesce(
             (select json_agg(json_build_object(
               'brand', oi.product_brand, 'name', oi.product_name, 'quantity', oi.quantity,
               'price_usd', oi.price_usd, 'price_gbp', oi.price_gbp, 'product_url', oi.product_url
             )) from order_items oi where oi.order_id = o.id),
             '[]'
           ) as items
    from orders o
    left join customers c on c.id = o.customer_id
    where o.id = ${order.id}
  `) as Array<Record<string, unknown>>;

  return NextResponse.json(fullRows[0], { status: 201 });
}
