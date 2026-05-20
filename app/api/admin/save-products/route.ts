import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth";
import { ensureSchema, getSql } from "@/lib/db";
import { convertGbpToUsd } from "@/lib/currency";
import { isValidProductCategory } from "@/lib/selfridges-import";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface IncomingProduct {
  brand?: string;
  name?: string;
  category?: string;
  price_gbp?: number;
  price_usd?: number;
  deliverable_lebanon?: boolean;
  product_url?: string;
  url?: string;
  image_url?: string;
}

interface Body {
  products?: unknown;
}

export async function POST(req: Request) {
  if (!isAdmin()) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await req.json().catch(() => ({}))) as Body;
  const incoming = Array.isArray(body.products) ? (body.products as IncomingProduct[]) : [];

  if (incoming.length === 0) {
    return NextResponse.json({ error: "No products to save" }, { status: 400 });
  }

  await ensureSchema();
  const sql = getSql();

  let saved = 0;
  for (const p of incoming) {
    const productUrl = (p.product_url ?? p.url ?? "").trim();
    const name = (p.name ?? "").trim();
    const brand = (p.brand ?? "").trim() || "Selfridges";
    const category = isValidProductCategory(p.category ?? "") ? (p.category as string) : "Beauty tools";
    const priceGbp = typeof p.price_gbp === "number" && Number.isFinite(p.price_gbp) ? p.price_gbp : null;

    if (!productUrl || !name || priceGbp === null) continue;

    // Recompute USD server-side so a tampered client can't set arbitrary prices.
    const priceUsd = await convertGbpToUsd(priceGbp);
    const deliverable = p.deliverable_lebanon !== false;
    const imageUrl = (p.image_url ?? "").trim();

    try {
      await sql`
        insert into products (brand, name, category, price_gbp, price_usd, deliverable_lebanon, product_url, image_url)
        values (${brand}, ${name}, ${category}, ${priceGbp}, ${priceUsd}, ${deliverable}, ${productUrl}, ${imageUrl})
        on conflict (product_url) do update set
          brand = excluded.brand,
          name = excluded.name,
          category = excluded.category,
          price_gbp = excluded.price_gbp,
          price_usd = excluded.price_usd,
          deliverable_lebanon = excluded.deliverable_lebanon,
          image_url = excluded.image_url,
          scraped_at = now()
      `;
      saved += 1;
    } catch (err) {
      console.error("[save-products] upsert failed for", productUrl, err);
    }
  }

  return NextResponse.json({ saved });
}
