import { NextResponse } from "next/server";
import { ensureSchema } from "@/lib/db";
import { searchSelfridges } from "@/lib/scraper";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as { query?: string; category?: string };
  const query = (body.query ?? "").trim();
  const category = body.category ?? "All";

  if (!query) {
    return NextResponse.json({ products: [] });
  }

  try {
    await ensureSchema();
  } catch {
    // continue — scraper will degrade gracefully
  }

  const products = await searchSelfridges(query, category);
  return NextResponse.json({ products });
}
