import { NextResponse } from "next/server";
import { ensureSchema, getSql, type ExpenseRow } from "@/lib/db";
import { isAdmin } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  if (!isAdmin()) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  await ensureSchema();
  const sql = getSql();
  const rows = (await sql`
    select id, description, amount_usd, amount_gbp, category, expense_date, notes, created_at
    from expenses
    order by expense_date desc, created_at desc
  `) as ExpenseRow[];
  return NextResponse.json(rows);
}

export async function POST(req: Request) {
  if (!isAdmin()) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await req.json().catch(() => ({}))) as {
    description?: string;
    amount_usd?: number | string;
    amount_gbp?: number | string | null;
    category?: string;
    expense_date?: string;
    notes?: string | null;
  };

  if (!body.description?.trim()) {
    return NextResponse.json({ error: "description is required" }, { status: 400 });
  }
  const amountUsd = Number(body.amount_usd);
  if (!Number.isFinite(amountUsd) || amountUsd < 0) {
    return NextResponse.json({ error: "Invalid amount_usd" }, { status: 400 });
  }
  const amountGbp = body.amount_gbp != null && body.amount_gbp !== "" ? Number(body.amount_gbp) : null;

  await ensureSchema();
  const sql = getSql();

  const rows = (await sql`
    insert into expenses (description, amount_usd, amount_gbp, category, expense_date, notes)
    values (
      ${body.description.trim()},
      ${amountUsd},
      ${amountGbp},
      ${body.category ?? "other"},
      ${body.expense_date ?? new Date().toISOString().slice(0, 10)},
      ${body.notes ?? null}
    )
    returning id, description, amount_usd, amount_gbp, category, expense_date, notes, created_at
  `) as ExpenseRow[];

  return NextResponse.json(rows[0], { status: 201 });
}
