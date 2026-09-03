import { getSql } from "./db";
import { brandSlug } from "./brands";

export interface TopBrand {
  brand: string;
  slug: string;
  imageUrl: string;
  unitsSold: number;
}

// Shown when sales data is too thin to fill the rail. Ordered by long-run
// prominence; images resolved from the catalogue at query time.
const FALLBACK_BRANDS = [
  "Huda Beauty",
  "Charlotte Tilbury",
  "Kiehl's",
  "Benefit Cosmetics",
  "Fenty Beauty",
  "Sol De Janeiro",
];

export async function getTopBrands(limit = 6): Promise<TopBrand[]> {
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
      select r.brand, r.units as "unitsSold",
             coalesce(
               (select p2.image_url from products p2
                 where lower(trim(p2.brand)) = lower(trim(r.brand)) and not p2.archived
                   and coalesce(p2.image_url, '') <> ''
                 order by coalesce(p2.is_bestseller, false) desc,
                          p2.popularity asc nulls last,
                          p2.scraped_at desc
                 limit 1),
               ''
             ) as "imageUrl"
      from ranked r
      where r.rn = 1
      order by r.units desc, r.brand asc
      limit ${limit}
    `) as Array<{ brand: string; unitsSold: number; imageUrl: string }>;

    const withImages = rows.filter((r) => r.imageUrl);
    const result = withImages.map((r) => ({
      brand: r.brand,
      slug: brandSlug(r.brand),
      imageUrl: r.imageUrl,
      unitsSold: r.unitsSold,
    }));

    if (result.length >= limit) return result.slice(0, limit);
    return await padFromFallback(result, limit, sql);
  } catch {
    return [];
  }
}

async function padFromFallback(
  have: TopBrand[],
  limit: number,
  sql: ReturnType<typeof getSql>
): Promise<TopBrand[]> {
  const haveKeys = new Set(have.map((b) => b.brand.toLowerCase()));
  for (const name of FALLBACK_BRANDS) {
    if (have.length >= limit) break;
    if (haveKeys.has(name.toLowerCase())) continue;
    const img = (await sql`
      select image_url from products
      where lower(trim(brand)) = lower(trim(${name})) and not archived and coalesce(image_url,'') <> ''
      order by coalesce(is_bestseller,false) desc, popularity asc nulls last
      limit 1
    `) as Array<{ image_url: string }>;
    if (img[0]?.image_url) {
      have.push({
        brand: name,
        slug: brandSlug(name),
        imageUrl: img[0].image_url,
        unitsSold: 0,
      });
    }
  }
  return have.slice(0, limit);
}
