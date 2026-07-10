import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import ProductCard from "@/components/ProductCard";
import {
  CATEGORY_DEFS,
  getCategoryBrands,
  getCategoryBySlug,
  getCategoryProducts,
  getCategorySubcategories,
  getPopularBrands,
  parseBrand,
  parsePage,
  parseSort,
  parseSubcategory
} from "@/lib/categories";
import { BeeMascot } from "@/components/BeeMascot";
import CategoryControls from "./CategoryControls";

// Bags & accessories were retired as browse categories — they're bespoke-only
// now. Redirect any old/external links to the bespoke landing page.
const REDIRECT_TO_BESPOKE = new Set(["bags", "accessories"]);

interface Params {
  slug: string;
}

interface SearchParams {
  sort?: string | string[];
  page?: string | string[];
  brand?: string | string[];
  sub?: string | string[];
}

export const dynamic = "force-dynamic";

export function generateStaticParams(): Array<{ slug: string }> {
  return CATEGORY_DEFS.map((d) => ({ slug: d.slug }));
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const def = getCategoryBySlug(params.slug);
  if (!def) return { title: "Category not found — Seasons by B" };
  const title = `${def.label} — Seasons by B`;
  return {
    title,
    description: def.blurb,
    alternates: { canonical: `https://www.seasonsbyb.co.uk/category/${params.slug}` },
    openGraph: { title, description: def.blurb, url: `https://www.seasonsbyb.co.uk/category/${params.slug}`, siteName: "Seasons by B", type: "website" },
  };
}

export default async function CategoryPage({
  params,
  searchParams
}: {
  params: Params;
  searchParams: SearchParams;
}) {
  if (REDIRECT_TO_BESPOKE.has(params.slug)) redirect("/bespoke");

  const def = getCategoryBySlug(params.slug);
  if (!def) notFound();

  const sort = parseSort(searchParams.sort);
  const page = parsePage(searchParams.page);
  const brand = parseBrand(searchParams.brand);
  const sub = parseSubcategory(searchParams.sub);
  const [result, brands, popularBrands, subcategories] = await Promise.all([
    getCategoryProducts(def.name, sort, page, { brand, subcategory: sub }),
    getCategoryBrands(def.name),
    getPopularBrands(def.name),
    getCategorySubcategories(def.name)
  ]);
  const { products, total, categoryTotal, totalPages } = result;
  const activeBrand = result.brand;
  const activeSub = result.subcategory;

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <nav aria-label="Breadcrumb" className="text-[11px] uppercase tracking-[0.2em] text-ink/60">
        <Link href="/" className="hover:text-accent">
          Home
        </Link>
        <span className="mx-2 text-ink/30">/</span>
        <span className="text-ink">{def.label}</span>
      </nav>

      <header className="mt-6">
        <div className="relative overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-accent via-accent-500 to-secondary p-8 text-white shadow-soft sm:p-12">
          <div className="absolute -right-12 -top-12 h-56 w-56 rounded-full bg-white/15 blur-2xl" />
          <p className="relative text-[11px] font-bold uppercase tracking-[0.32em] text-white/80">Shop the edit</p>
          <h1 className="relative mt-2 font-serif text-4xl font-bold sm:text-5xl">{def.label}</h1>
          <p className="relative mt-3 text-sm text-white/85">
            {activeBrand || activeSub ? (
              <>
                Showing {total} of {categoryTotal} products ({[activeBrand, activeSub].filter(Boolean).join(" · ")}).{" "}
                <Link href={`/category/${def.slug}`} className="font-bold underline hover:text-white">
                  Clear filters
                </Link>
              </>
            ) : (
              <>
                {categoryTotal} {categoryTotal === 1 ? "product" : "products"} curated from London.
              </>
            )}
          </p>
        </div>
        {popularBrands.length > 0 && !activeBrand ? (
          <div className="mt-5 flex flex-wrap items-center gap-2 rounded-[2rem] border border-white/60 bg-white/40 p-4 backdrop-blur-sm">
            <span className="mr-1 text-[10px] uppercase tracking-[0.2em] text-ink/50">Most wanted</span>
            {popularBrands.map((b) => (
              <Link
                key={b.brand}
                href={`/category/${def.slug}?brand=${encodeURIComponent(b.brand)}`}
                className="rounded-full border border-ink/15 bg-white px-4 py-1.5 text-xs uppercase tracking-[0.14em] text-ink hover:border-accent hover:text-accent"
              >
                {b.brand}
              </Link>
            ))}
          </div>
        ) : null}
        <div className="mt-5 flex justify-end rounded-[2rem] border border-white/60 bg-white/40 p-4 backdrop-blur-sm">
          <CategoryControls
            current={sort}
            brands={brands}
            currentBrand={activeBrand}
            subcategories={subcategories}
            currentSubcategory={activeSub}
            slug={def.slug}
          />
        </div>
      </header>

      {products.length === 0 ? (
        <div className="mt-12 flex flex-col items-center gap-4 rounded-[2rem] border border-white/60 bg-white/50 p-12 text-center shadow-soft">
          <BeeMascot variant="floating" />
          <p className="text-sm text-ink/60">
            No products in this category yet. Message us on Instagram for a custom request.
          </p>
        </div>
      ) : (
        <>
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

          <Pagination slug={def.slug} sort={sort} page={page} totalPages={totalPages} brand={activeBrand} sub={activeSub} />
        </>
      )}
    </div>
  );
}

function Pagination({
  slug,
  sort,
  page,
  totalPages,
  brand,
  sub
}: {
  slug: string;
  sort: string;
  page: number;
  totalPages: number;
  brand: string | null;
  sub: string | null;
}) {
  if (totalPages <= 1) return null;

  function hrefFor(target: number): string {
    const sp = new URLSearchParams();
    if (sort && sort !== "featured") sp.set("sort", sort);
    if (brand) sp.set("brand", brand);
    if (sub) sp.set("sub", sub);
    if (target > 1) sp.set("page", String(target));
    const qs = sp.toString();
    return qs ? `/category/${slug}?${qs}` : `/category/${slug}`;
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
