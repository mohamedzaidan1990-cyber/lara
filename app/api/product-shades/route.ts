import { NextResponse } from "next/server";
import { getSql } from "@/lib/db";
import { extractShadeOptions, isShadeRelevant, type ShadeOption } from "@/lib/shade-options";

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
  if (Array.isArray(raw)) return raw;
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
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
      select id, name, subcategory, product_url, shades, shades_checked_at
      from products where id = ${id} limit 1
    `) as ShadeRow[];
    const p = rows[0];
    if (!p) return NextResponse.json({ shades: [] });

    // Already looked up — serve the cached answer (including "no shades").
    if (p.shades_checked_at) {
      return NextResponse.json({ shades: parseStoredShades(p.shades) });
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
    return NextResponse.json({ shades });
  } catch {
    return NextResponse.json({ shades: [] });
  }
}
