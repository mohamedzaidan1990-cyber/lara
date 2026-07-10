import type { MetadataRoute } from "next";
import { getSql } from "@/lib/db";
import { brandSlug } from "@/lib/brands";
import { categorySlug } from "@/lib/categories";

const BASE = "https://www.seasonsbyb.co.uk";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const sql = getSql();

  const [products, brands, categories] = await Promise.all([
    sql`SELECT id, scraped_at FROM products ORDER BY scraped_at DESC NULLS LAST` as Promise<Array<{ id: string; scraped_at: string | null }>>,
    sql`SELECT DISTINCT brand FROM products WHERE brand IS NOT NULL ORDER BY brand` as Promise<Array<{ brand: string }>>,
    sql`SELECT DISTINCT category FROM products WHERE category IS NOT NULL` as Promise<Array<{ category: string }>>,
  ]);

  const statics: MetadataRoute.Sitemap = [
    { url: `${BASE}/`,             changeFrequency: "daily",   priority: 1.0 },
    { url: `${BASE}/info`,         changeFrequency: "monthly", priority: 0.5 },
    { url: `${BASE}/shade-finder`, changeFrequency: "monthly", priority: 0.4 },
  ];

  const categoryUrls: MetadataRoute.Sitemap = categories
    .map((c) => categorySlug(c.category as Parameters<typeof categorySlug>[0]))
    .filter(Boolean)
    .map((slug) => ({
      url: `${BASE}/category/${slug}`,
      changeFrequency: "daily" as const,
      priority: 0.9,
    }));

  const brandUrls: MetadataRoute.Sitemap = brands.map((b) => ({
    url: `${BASE}/brand/${brandSlug(b.brand)}`,
    changeFrequency: "weekly" as const,
    priority: 0.7,
  }));

  const productUrls: MetadataRoute.Sitemap = products.map((p) => ({
    url: `${BASE}/product/${p.id}`,
    lastModified: p.scraped_at ? new Date(p.scraped_at) : new Date(),
    changeFrequency: "weekly" as const,
    priority: 0.8,
  }));

  return [...statics, ...categoryUrls, ...brandUrls, ...productUrls];
}
