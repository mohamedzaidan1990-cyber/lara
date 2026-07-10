import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import ProductCard from "@/components/ProductCard";
import { getBrandBySlug, getBrandProducts } from "@/lib/brands";
import { categorySlug, parsePage, parseSort } from "@/lib/categories";

interface Params {
  slug: string;
}

interface SearchParams {
  sort?: string | string[];
  page?: string | string[];
}

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const info = await getBrandBySlug(params.slug);
  if (!info) return { title: "Brand not found — Seasons by B" };
  const title = `${info.brand} — Seasons by B`;
  const description = `Shop all ${info.total} ${info.brand} products, curated from London and delivered to Lebanon by Seasons by B.`;
  return {
    title,
    description,
    alternates: { canonical: `https://www.seasonsbyb.co.uk/brand/${params.slug}` },
    openGraph: { title, description, url: `https://www.seasonsbyb.co.uk/brand/${params.slug}`, siteName: "Seasons by B", type: "website" },
  };
}

export default async function BrandPage({
  params,
  searchParams
}: {
  params: Params;
  searchParams: SearchParams;
}) {
  const info = await getBrandBySlug(params.slug);
  if (!info) notFound();

  const sort = parseSort(searchParams.sort);
  const page = parsePage(searchParams.page);
  const { products, total, totalPages } = await getBrandProducts(info.brand, sort, page);

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <nav aria-label="Breadcrumb" className="text-[11px] uppercase tracking-[0.2em] text-ink/60">
        <Link href="/" className="hover:text-accent">
          Home
        </Link>
        <span className="mx-2 text-ink/30">/</span>
        <span className="text-ink">{info.brand}</span>
      </nav>

      <header className="mt-6">
        <div className="relative overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-accent via-accent-500 to-secondary p-8 text-white shadow-soft sm:p-12">
          <div className="absolute -right-12 -top-12 h-56 w-56 rounded-full bg-white/15 blur-2xl" />
          <p className="relative text-[11px] font-bold uppercase tracking-[0.32em] text-white/80">Shop the brand</p>
          <h1 className="relative mt-2 font-serif text-4xl font-bold sm:text-5xl">{info.brand}</h1>
          <p className="relative mt-3 text-sm text-white/85">
            {total} {total === 1 ? "product" : "products"} across {info.categories.length}{" "}
            {info.categories.length === 1 ? "category" : "categories"}, curated from London.
          </p>
        </div>

        {info.categories.length > 1 ? (
          <div className="mt-5 flex flex-wrap gap-2 rounded-[2rem] border border-white/60 bg-white/40 p-4 backdrop-blur-sm">
            {info.categories.map((c) => {
              const slug = categorySlug(c.category);
              if (!slug) return null;
              return (
                <Link
                  key={c.category}
                  href={`/category/${slug}?brand=${encodeURIComponent(info.brand)}`}
                  className="rounded-full border border-ink/15 bg-white px-4 py-1.5 text-xs uppercase tracking-[0.14em] text-ink hover:border-accent hover:text-accent"
                >
                  {c.category} ({c.count})
                </Link>
              );
            })}
          </div>
        ) : null}
      </header>

      <div className="mt-10 grid grid-cols-2 gap-x-5 gap-y-10 sm:grid-cols-3 lg:grid-cols-4">
        {products.map((p, i) => (
          <ProductCard
            key={p.id}
            index={i}
            product={{
              id: p.id,
              brand: p.brand,
              name: p.name,
              price_gbp: p.price_gbp,
              price_usd: p.price_usd,
              deliverable_lebanon: p.deliverable_lebanon,
              product_url: p.product_url,
              image_url: p.image_url,
              subcategory: p.subcategory,
              light_shade_image_url: p.light_shade_image_url
            }}
          />
        ))}
      </div>

      <Pagination slug={params.slug} sort={sort} page={page} totalPages={totalPages} />
    </div>
  );
}

function Pagination({
  slug,
  sort,
  page,
  totalPages
}: {
  slug: string;
  sort: string;
  page: number;
  totalPages: number;
}) {
  if (totalPages <= 1) return null;

  function hrefFor(target: number): string {
    const sp = new URLSearchParams();
    if (sort && sort !== "featured") sp.set("sort", sort);
    if (target > 1) sp.set("page", String(target));
    const qs = sp.toString();
    return qs ? `/brand/${slug}?${qs}` : `/brand/${slug}`;
  }

  const prevDisabled = page <= 1;
  const nextDisabled = page >= totalPages;

  return (
    <nav aria-label="Pagination" className="mt-14 flex items-center justify-between border-t border-ink/10 pt-6">
      {prevDisabled ? (
        <span className="text-xs uppercase tracking-[0.18em] text-ink/30">← Previous</span>
      ) : (
        <Link href={hrefFor(page - 1)} className="text-xs uppercase tracking-[0.18em] text-ink hover:text-accent">
          ← Previous
        </Link>
      )}

      <span className="text-xs uppercase tracking-[0.18em] text-ink/60">
        Page {page} of {totalPages}
      </span>

      {nextDisabled ? (
        <span className="text-xs uppercase tracking-[0.18em] text-ink/30">Next →</span>
      ) : (
        <Link href={hrefFor(page + 1)} className="text-xs uppercase tracking-[0.18em] text-ink hover:text-accent">
          Next →
        </Link>
      )}
    </nav>
  );
}
