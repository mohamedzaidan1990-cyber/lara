import { getSql } from "./db";
import type { ProductCategory } from "./featured";
import type { ProductListRow } from "./categories";
import { PAGE_SIZE } from "./categories";

// Korean beauty brands. `KBEAUTY_BRAND_MATCHES` is the lowercase matching list
// used for tagging (also mirrored in scripts/tag-kbeauty.ts and the scraper
// worker); `KBEAUTY_ROSTER` is the display list for the hub page.
export const KBEAUTY_BRAND_MATCHES = [
  "cosrx", "laneige", "innisfree", "some by mi", "beauty of joseon",
  "anua", "klairs", "dear klairs", "skin1004", "torriden", "round lab",
  "medicube", "numbuzin", "dr. jart+", "dr jart", "dr jart+", "sulwhasoo", "missha",
  "etude house", "etude", "tony moly", "tonymoly", "the face shop",
  "peach & lily", "glow recipe", "iunik", "3ce", "romand", "abib",
  "mary&may", "haruharu wonder", "axis-y", "mixsoon", "purito",
  "rovectin", "thank you farmer", "benton", "pyunkang yul", "isntree",
  "tocobo", "holika holika", "skinfood", "nature republic", "belif",
  "banila co", "its skin", "the saem", "neogen", "acwell", "goodal",
  "by wishtrend", "im from", "biodance", "aestura", "a-true", "ma:nyo",
  "vt cosmetics", "laneige beauty"
];

export const KBEAUTY_ROSTER = [
  "COSRX", "Laneige", "Dr. Jart+", "Innisfree", "Some By Mi", "Beauty of Joseon",
  "Anua", "Skin1004", "Glow Recipe", "Sulwhasoo", "Klairs", "Torriden",
  "Round Lab", "Medicube", "Numbuzin", "Neogen", "Peach & Lily", "Romand"
];

export interface KBeautySlugDef {
  label: string;
  emoji: string;
  categories: ProductCategory[];
}

export const KBEAUTY_SLUG_MAP: Record<string, KBeautySlugDef> = {
  skincare: { label: "K-Skincare", emoji: "🌿", categories: ["Skincare"] },
  makeup: { label: "K-Makeup", emoji: "🌸", categories: ["Makeup"] },
  haircare: { label: "K-Haircare", emoji: "💆", categories: ["Haircare"] },
  tools: { label: "K-Tools", emoji: "✨", categories: ["Beauty tools"] }
};

export async function getKBeautyCounts(): Promise<Record<string, number>> {
  try {
    const sql = getSql();
    const rows = (await sql`
      select category, count(*)::int as n
      from products where k_beauty = true
      group by category
    `) as Array<{ category: string; n: number }>;
    const byCategory = new Map(rows.map((r) => [r.category, r.n]));
    const out: Record<string, number> = {};
    for (const [slug, def] of Object.entries(KBEAUTY_SLUG_MAP)) {
      out[slug] = def.categories.reduce((n, c) => n + (byCategory.get(c) ?? 0), 0);
    }
    return out;
  } catch {
    return {};
  }
}

export async function getFeaturedKBeauty(limit = 12): Promise<ProductListRow[]> {
  try {
    const sql = getSql();
    return (await sql`
      select id, brand, name, category, subcategory, price_gbp::float8 as price_gbp, price_usd::float8 as price_usd,
             deliverable_lebanon, product_url, image_url, light_shade_image_url
      from products
      where k_beauty = true and coalesce(image_url, '') <> ''
      order by random()
      limit ${limit}
    `) as ProductListRow[];
  } catch {
    return [];
  }
}

export interface KBeautyBrandCount {
  brand: string;
  count: number;
}

export async function getKBeautyBrands(categories: ProductCategory[]): Promise<KBeautyBrandCount[]> {
  try {
    const sql = getSql();
    return (await sql`
      select brand, count(*)::int as count
      from products
      where k_beauty = true and category = any(${categories}::text[])
      group by brand
      order by brand asc
    `) as KBeautyBrandCount[];
  } catch {
    return [];
  }
}

export type KBeautySort = "featured" | "price-asc" | "price-desc" | "newest";

export interface KBeautyProductsResult {
  products: ProductListRow[];
  total: number;
  page: number;
  totalPages: number;
}

export async function getKBeautyProducts(
  categories: ProductCategory[],
  sort: KBeautySort,
  page: number,
  brand: string | null
): Promise<KBeautyProductsResult> {
  const sql = getSql();
  const safePage = page < 1 ? 1 : page;
  const offset = (safePage - 1) * PAGE_SIZE;

  const totalRows = (await sql`
    select count(*)::int as n from products
    where k_beauty = true and category = any(${categories}::text[])
      and (${brand}::text is null or brand = ${brand})
  `) as Array<{ n: number }>;
  const total = totalRows[0]?.n ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const orderBy =
    sort === "price-asc"
      ? "price_gbp asc, scraped_at desc"
      : sort === "price-desc"
        ? "price_gbp desc, scraped_at desc"
        : sort === "newest"
          ? "scraped_at desc, brand asc"
          : "coalesce(is_bestseller, false) desc, popularity asc nulls last, md5(id::text || to_char(now(), 'YYYY-MM-DD')) asc";

  const rows = (await sql(
    `select id, brand, name, category, subcategory, price_gbp::float8 as price_gbp, price_usd::float8 as price_usd,
            deliverable_lebanon, product_url, image_url, light_shade_image_url
     from products
     where k_beauty = true and category = any($1::text[])
       and ($2::text is null or brand = $2)
     order by ${orderBy}
     limit ${PAGE_SIZE} offset ${offset}`,
    [categories, brand]
  )) as ProductListRow[];

  return { products: rows, total, page: safePage, totalPages };
}
