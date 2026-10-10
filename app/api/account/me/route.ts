import { NextResponse } from "next/server";
import { getSql } from "@/lib/db";
import { getCurrentAccount } from "@/lib/account";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Used by the header and checkout (prefill). Returns { account: null } when
// signed out — never an error, so callers can treat it as optional.
export async function GET() {
  let account = null;
  try {
    account = await getCurrentAccount();
  } catch {
    // Tables not created yet, or DB unavailable — treat as signed out.
  }
  if (!account) return NextResponse.json({ account: null });
  const sql = getSql();
  const last = (await sql`
    select c.address, o.customer_email
    from customers c left join orders o on o.customer_id = c.id
    where c.phone_norm = ${account.phone}
    order by c.created_at desc, o.created_at desc nulls last
    limit 1
  `) as Array<{ address: string | null; customer_email: string | null }>;
  return NextResponse.json({
    account: {
      full_name: account.full_name,
      phone: account.phone,
      address: last[0]?.address ?? "",
      email: last[0]?.customer_email ?? ""
    }
  });
}
