import { unstable_cache } from "next/cache";
import { getSql } from "./db";
import { brandSlug } from "./brands";

export interface TopBrand {
  brand: string;
  slug: string;
  unitsSold: number;
}

// Used to top up the list when sales data is thin. Ordered by long-run
// prominence; only names (no images) are needed now.
const FALLBACK_BRANDS = [
  "Huda Beauty",
  "Charlotte Tilbury",
  "Kiehl's",
  "Benefit Cosmetics",
  "Fenty Beauty",
  "Sol De Janeiro",
  "Kayali",
  "NARS",
  "Drunk Elephant",
  "The Ordinary",
  "Pixi",
  "Sephora Collection",
];

export const getTopBrands = unstable_cache(
  async (limit = 12): Promise<TopBrand[]> => computeTopBrands(limit),
  ["top-brands"],
  { revalidate: 3600, tags: ["top-brands"] }
);

async function computeTopBrands(limit: number): Promise<TopBrand[]> {
  try {
    const sql = getSql();
    const rows = (await sql`
      with sold as (
        select lower(trim(product_brand)) as bkey,
               sum(quantity)::int as units,
               count(distinct order_id)::int as orders
        from order_items
        where product_brand is not null and trim(product_brand) <> ''
        group by 1
      ),
      ranked as (
        select p.brand,
               s.units,
               row_number() over (partition by lower(trim(p.brand)) order by count(*) desc) as rn
        from sold s
        join products p on lower(trim(p.brand)) = s.bkey and not p.archived
        where s.orders >= 5            -- filter one-off / concentrated bulk buys
        group by p.brand, s.units, s.bkey
      )
      select r.brand, r.units as "unitsSold"
      from ranked r
      where r.rn = 1
      order by r.units desc, r.brand asc
      limit ${limit}
    `) as Array<{ brand: string; unitsSold: number }>;

    const result: TopBrand[] = rows.map((r) => ({
      brand: r.brand,
      slug: brandSlug(r.brand),
      unitsSold: r.unitsSold,
    }));

    if (result.length >= limit) return result.slice(0, limit);
    return padFromFallback(result, limit);
  } catch {
    // Transient failure of the sales query: fall back to the curated list
    // rather than an empty section.
    return padFromFallback([], limit);
  }
}

function padFromFallback(have: TopBrand[], limit: number): TopBrand[] {
  const haveKeys = new Set(have.map((b) => b.brand.toLowerCase()));
  for (const name of FALLBACK_BRANDS) {
    if (have.length >= limit) break;
    if (haveKeys.has(name.toLowerCase())) continue;
    have.push({ brand: name, slug: brandSlug(name), unitsSold: 0 });
  }
  return have.slice(0, limit);
}
