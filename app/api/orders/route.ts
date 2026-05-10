import { NextResponse } from "next/server";
import { ensureSchema, generateOrderNumber, getSql, type OrderWithCustomer } from "@/lib/db";
import { isAdmin } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface CreateBody {
  full_name?: string;
  phone?: string;
  address?: string;
  notes?: string;
  product_brand?: string;
  product_name?: string;
  product_url?: string | null;
  price_gbp?: number;
  price_usd?: number;
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
    select o.id, o.order_number, o.customer_id, o.product_name, o.product_brand, o.product_url,
           o.price_gbp, o.price_usd, o.status, o.payment_method, o.payment_confirmed,
           o.payment_screenshot, o.notes, o.created_at, o.updated_at,
           coalesce(c.full_name, '') as full_name,
           coalesce(c.phone, '') as phone,
           coalesce(c.address, '') as address
    from orders o
    left join customers c on c.id = o.customer_id
    order by o.created_at desc
  `) as OrderWithCustomer[];
  return NextResponse.json({ orders: rows });
}

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as CreateBody;

  const required: Array<keyof CreateBody> = [
    "full_name",
    "phone",
    "address",
    "product_name",
    "product_brand",
    "price_gbp",
    "price_usd"
  ];
  for (const key of required) {
    const v = body[key];
    if (v === undefined || v === null || v === "") {
      return NextResponse.json({ error: `Missing field: ${key}` }, { status: 400 });
    }
  }

  await ensureSchema();
  const sql = getSql();

  const customer = (await sql`
    insert into customers (full_name, phone, address)
    values (${body.full_name}, ${body.phone}, ${body.address})
    returning id
  `) as Array<{ id: string }>;

  const customerId = customer[0]?.id;
  if (!customerId) {
    return NextResponse.json({ error: "Failed to create customer" }, { status: 500 });
  }

  // Try a small number of times in the unlikely event of an order_number collision.
  let orderNumber = generateOrderNumber();
  let attempts = 0;
  let inserted: Array<{ id: string; order_number: string }> = [];
  while (attempts < 5) {
    try {
      inserted = (await sql`
        insert into orders (
          order_number, customer_id, product_name, product_brand, product_url,
          price_gbp, price_usd, payment_method, payment_screenshot, notes
        )
        values (
          ${orderNumber}, ${customerId}, ${body.product_name}, ${body.product_brand}, ${body.product_url ?? null},
          ${body.price_gbp}, ${body.price_usd}, ${body.payment_method ?? null}, ${body.payment_screenshot ?? null}, ${body.notes ?? null}
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

  return NextResponse.json({
    order_number: order.order_number,
    order_id: order.id,
    customer_id: customerId
  });
}
