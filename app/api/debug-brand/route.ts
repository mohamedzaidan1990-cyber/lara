import { NextResponse } from "next/server";
import { getBrandBySlug } from "@/lib/brands";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Temporary diagnostic: returns exactly what the /brand/[slug] page sees.
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const slug = searchParams.get("slug") ?? "kiehl-s";
  const info = await getBrandBySlug(slug);
  return NextResponse.json({
    slug,
    info,
    db: (process.env.DATABASE_URL ?? "").replace(/\/\/[^@]*@/, "//***@").slice(0, 80)
  });
}
