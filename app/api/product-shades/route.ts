import { NextResponse } from "next/server";
import { getSql } from "@/lib/db";
import { extractShadeOptions, isShadeRelevant, shadeScore, type ShadeOption } from "@/lib/shade-options";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// First request for a product renders its Selfridges PDP via Oxylabs (~20-40s);
// every request after that is served from the cached jsonb.
export const maxDuration = 60;

interface ShadeRow {
  id: string;
  name: string;
  subcategory: string | null;
  product_url: string | null;
  shades: ShadeOption[] | string | null;
  shades_checked_at: string | null;
  light_shade_image_url: string | null;
}

async function fetchPdpHtml(url: string): Promise<string> {
  const user = process.env.OXYLABS_USERNAME;
  const pass = process.env.OXYLABS_PASSWORD;
  if (!user || !pass) return "";
  const auth = Buffer.from(`${user}:${pass}`).toString("base64");
  try {
    const res = await fetch("https://realtime.oxylabs.io/v1/queries", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Basic ${auth}` },
      body: JSON.stringify({ source: "universal", url, render: "html", geo_location: "United Kingdom" }),
      signal: AbortSignal.timeout(50_000)
    });
    if (!res.ok) return "";
    const data = (await res.json()) as { results?: Array<{ content?: string }> };
    return data.results?.[0]?.content ?? "";
  } catch {
    return "";
  }
}

function parseStoredShades(raw: ShadeRow["shades"]): ShadeOption[] {
  let arr: unknown[] = [];
  if (Array.isArray(raw)) {
    arr = raw;
  } else if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) arr = parsed;
    } catch { /* ignore */ }
  }
  return arr
    .filter((s): s is Record<string, unknown> => typeof s === "object" && s !== null)
    .map((s) => ({
      name: typeof s.name === "string" ? s.name : "",
      swatch_url: typeof s.swatch_url === "string" ? s.swatch_url : "",
      image_url: typeof s.image_url === "string" ? s.image_url : ""
    }))
    .filter((s) => s.name.length > 0);
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id") ?? "";
  if (!/^[0-9a-fA-F-]{36}$/.test(id)) {
    return NextResponse.json({ shades: [] });
  }

  try {
    const sql = getSql();
    const rows = (await sql`
      select id, name, subcategory, product_url, shades, shades_checked_at, light_shade_image_url
      from products where id = ${id} limit 1
    `) as ShadeRow[];
    const p = rows[0];
    if (!p) return NextResponse.json({ shades: [] });

    // Already looked up — serve the cached answer (including "no shades").
    if (p.shades_checked_at) {
      const cachedShades = parseStoredShades(p.shades);
      // If variants haven't been populated yet, back-fill without blocking.
      if (!p.light_shade_image_url && cachedShades.length > 0) {
        void (async () => {
          try {
            for (const shade of cachedShades) {
              const score = shadeScore(shade.name);
              await sql`
                insert into product_variants (product_id, shade_name, shade_image_url, swatch_url, sort_order)
                values (${id}, ${shade.name}, ${shade.image_url || null}, ${shade.swatch_url || null}, ${score})
                on conflict (product_id, shade_name) do update set
                  shade_image_url = excluded.shade_image_url,
                  swatch_url = excluded.swatch_url,
                  sort_order = excluded.sort_order
              `;
            }
            await sql`
              update products
              set light_shade_image_url = (
                select shade_image_url from product_variants
                where product_id = ${id} and shade_image_url is not null and shade_image_url <> ''
                order by sort_order asc limit 1
              )
              where id = ${id}
            `;
          } catch { /* best-effort */ }
        })();
      }
      return NextResponse.json({ shades: cachedShades });
    }

    const url = p.product_url ?? "";
    if (!isShadeRelevant(p.subcategory, p.name) || !url.includes("selfridges.com")) {
      await sql`update products set shades = '[]'::jsonb, shades_checked_at = now() where id = ${id}`;
      return NextResponse.json({ shades: [] });
    }

    const html = await fetchPdpHtml(url);
    if (!html) {
      // Fetch failed — return empty WITHOUT marking checked, so a later visit
      // retries instead of permanently hiding the shades.
      return NextResponse.json({ shades: [] });
    }

    const shades = extractShadeOptions(html);
    await sql`
      update products
      set shades = ${JSON.stringify(shades)}::jsonb, shades_checked_at = now()
      where id = ${id}
    `;

    // Populate product_variants from the freshly-extracted shades.
    if (shades.length > 0) {
      for (const shade of shades) {
        const score = shadeScore(shade.name);
        await sql`
          insert into product_variants (product_id, shade_name, shade_image_url, swatch_url, sort_order)
          values (${id}, ${shade.name}, ${shade.image_url || null}, ${shade.swatch_url || null}, ${score})
          on conflict (product_id, shade_name) do update set
            shade_image_url = excluded.shade_image_url,
            swatch_url = excluded.swatch_url,
            sort_order = excluded.sort_order
        `;
      }
      // Update light_shade_image_url with the lightest shade that has an image.
      await sql`
        update products
        set light_shade_image_url = (
          select shade_image_url from product_variants
          where product_id = ${id} and shade_image_url is not null and shade_image_url <> ''
          order by sort_order asc
          limit 1
        )
        where id = ${id}
      `;
    }

    return NextResponse.json({ shades });
  } catch {
    return NextResponse.json({ shades: [] });
  }
}
