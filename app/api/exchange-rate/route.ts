import { NextResponse } from "next/server";
import { CURRENCY_MARKUP, getGBPtoUSD } from "@/lib/currency";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const rate = await getGBPtoUSD();
  return NextResponse.json({
    base: "GBP",
    quote: "USD",
    rate,
    markup: CURRENCY_MARKUP,
    effective_rate: rate * CURRENCY_MARKUP
  });
}
