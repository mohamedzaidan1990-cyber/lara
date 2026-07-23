import { NextResponse } from "next/server";
import { getSql } from "@/lib/db";
import { productImageSrc } from "@/lib/images";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SITE = "https://www.seasonsbyb.co.uk";

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

interface Row {
  id: string;
  brand: string;
  name: string;
  category: string;
  price_usd: number;
  image_url: string | null;
}

// Google Merchant Center product feed (RSS 2.0 with g: namespace).
// Register this URL in Merchant Center: /api/merchant-feed
export async function GET() {
  try {
    const sql = getSql();
    const rows = (await sql`
      select id, brand, name, category, price_usd::float8 as price_usd, image_url
      from products
      where deliverable_lebanon = true and image_url is not null
      order by brand, name
    `) as Row[];

    const items = rows
      .map((p) => {
        const img = productImageSrc(p.image_url);
        const imgAbs = img.startsWith("http") ? img : `${SITE}${img}`;
        const title = esc(`${p.brand} ${p.name}`.slice(0, 150));
        const desc = esc(
          `${p.brand} ${p.name} — authentic ${p.category.toLowerCase()} sourced from London, delivered to Lebanon in 10–14 days by Seasons by B.`
        );
        return `<item>
<g:id>${p.id}</g:id>
<g:title>${title}</g:title>
<g:description>${desc}</g:description>
<g:link>${SITE}/product/${p.id}</g:link>
<g:image_link>${esc(imgAbs)}</g:image_link>
<g:availability>in_stock</g:availability>
<g:price>${p.price_usd.toFixed(2)} USD</g:price>
<g:brand>${esc(p.brand)}</g:brand>
<g:condition>new</g:condition>
<g:identifier_exists>no</g:identifier_exists>
<g:google_product_category>Health &amp; Beauty</g:google_product_category>
<g:shipping><g:country>LB</g:country><g:service>Courier</g:service><g:price>5.00 USD</g:price></g:shipping>
</item>`;
      })
      .join("\n");

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">
<channel>
<title>Seasons by B</title>
<link>${SITE}</link>
<description>Luxury beauty from London, delivered to Lebanon.</description>
${items}
</channel>
</rss>`;

    return new NextResponse(xml, {
      headers: {
        "Content-Type": "application/xml; charset=utf-8",
        "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
      },
    });
  } catch {
    return new NextResponse("feed unavailable", { status: 503 });
  }
}
