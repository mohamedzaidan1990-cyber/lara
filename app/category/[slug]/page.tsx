import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import ProductCard from "@/components/ProductCard";
import {
  CATEGORY_DEFS,
  getCategoryBySlug,
  getCategoryProducts,
  parsePage,
  parseSort
} from "@/lib/categories";
import { whatsappRequestLink } from "@/lib/links";
import { BeeMascot } from "@/components/BeeMascot";
import CategoryControls from "./CategoryControls";

// Bags & accessories are sourced on demand rather than scraped — these pages
// lead with a bespoke WhatsApp request instead of a product grid.
const ON_DEMAND_SLUGS = new Set(["bags", "accessories"]);

interface Params {
  slug: string;
}

interface SearchParams {
  sort?: string | string[];
  page?: string | string[];
}

export const dynamic = "force-dynamic";

export function generateStaticParams(): Array<{ slug: string }> {
  return CATEGORY_DEFS.map((d) => ({ slug: d.slug }));
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const def = getCategoryBySlug(params.slug);
  if (!def) return { title: "Category not found — Seasons by B" };
  return {
    title: `${def.label} — Seasons by B`,
    description: def.blurb
  };
}

export default async function CategoryPage({
  params,
  searchParams
}: {
  params: Params;
  searchParams: SearchParams;
}) {
  const def = getCategoryBySlug(params.slug);
  if (!def) notFound();

  const onDemand = ON_DEMAND_SLUGS.has(def.slug);

  const sort = parseSort(searchParams.sort);
  const page = parsePage(searchParams.page);
  const result = await getCategoryProducts(def.name, sort, page);
  const { products, total, totalPages } = result;

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <nav aria-label="Breadcrumb" className="text-[11px] uppercase tracking-[0.2em] text-ink/60">
        <Link href="/" className="hover:text-accent">
          Home
        </Link>
        <span className="mx-2 text-ink/30">/</span>
        <span className="text-ink">{def.label}</span>
      </nav>

      {onDemand ? (
        <OnDemandCategory def={def} products={products} total={total} totalPages={totalPages} sort={sort} page={page} />
      ) : (
        <>
          <header className="mt-6 flex flex-col gap-4 border-b border-ink/10 pb-6 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-[11px] uppercase tracking-[0.32em] text-accent">Shop the edit</p>
              <h1 className="mt-2 font-serif text-4xl text-ink sm:text-5xl">{def.label}</h1>
              <p className="mt-2 text-sm text-ink/70">
                {def.label} — {total} {total === 1 ? "product" : "products"}.
              </p>
            </div>
            <CategoryControls current={sort} />
          </header>

          {products.length === 0 ? (
            <div className="mt-12 flex flex-col items-center gap-4 rounded border border-ink/10 bg-ink/[0.02] p-12 text-center">
              <BeeMascot variant="floating" />
              <p className="text-sm text-ink/60">
                No products in this category yet. Message us on WhatsApp for a custom request.
              </p>
            </div>
          ) : (
            <>
              <div className="mt-10 grid grid-cols-2 gap-x-5 gap-y-10 sm:grid-cols-3 lg:grid-cols-4">
                {products.map((p) => (
                  <ProductCard
                    key={p.id}
                    product={{
                      brand: p.brand,
                      name: p.name,
                      price_gbp: p.price_gbp,
                      price_usd: p.price_usd,
                      deliverable_lebanon: p.deliverable_lebanon,
                      product_url: p.product_url,
                      image_url: p.image_url
                    }}
                  />
                ))}
              </div>

              <Pagination slug={def.slug} sort={sort} page={page} totalPages={totalPages} />
            </>
          )}
        </>
      )}
    </div>
  );
}

function OnDemandCategory({
  def,
  products,
  total,
  totalPages,
  sort,
  page
}: {
  def: { slug: string; label: string };
  products: Array<{
    id: string;
    brand: string;
    name: string;
    price_gbp: number;
    price_usd: number;
    deliverable_lebanon: boolean;
    product_url: string;
    image_url: string;
  }>;
  total: number;
  totalPages: number;
  sort: string;
  page: number;
}) {
  const waHref = whatsappRequestLink(`Hi Seasons by B, I'm looking for ${def.label.toLowerCase()}: `);

  return (
    <>
      {/* Sourced-on-request banner */}
      <div className="mt-6 border border-gold bg-gold/15 px-4 py-3 text-center text-[11px] uppercase tracking-[0.24em] text-ink">
        Sourced on request — contact us for availability and pricing
      </div>

      {/* Bespoke CTA */}
      <section style={{ backgroundColor: "#23272A" }} className="mt-10">
        <div className="px-6 py-14 text-center sm:px-12">
          <p className="text-[11px] uppercase tracking-[0.32em]" style={{ color: "#F4D360" }}>
            Personal sourcing
          </p>
          <h1 className="mt-3 font-serif text-3xl text-cream sm:text-4xl">{def.label}</h1>
          <p className="mx-auto mt-4 max-w-2xl text-sm leading-relaxed text-cream/70 sm:text-base">
            Our bags and accessories are sourced on demand — tell us exactly what you want and we&apos;ll find it for
            you in London.
          </p>
          <div className="mt-8">
            <a href={waHref} target="_blank" rel="noreferrer" className="btn-gold">
              WhatsApp Us Your Request
            </a>
            <p className="mt-3 text-xs uppercase tracking-[0.2em] text-cream/50">
              We typically respond within 2 hours
            </p>
          </div>
        </div>
      </section>

      {/* Any existing products remain visible, framed as sourced on request. */}
      {products.length > 0 ? (
        <div className="mt-14">
          <h2 className="font-serif text-2xl text-ink">
            Previously sourced{" "}
            <span className="text-sm font-normal text-ink/50">
              ({total} {total === 1 ? "piece" : "pieces"})
            </span>
          </h2>
          <div className="mt-6 grid grid-cols-2 gap-x-5 gap-y-10 sm:grid-cols-3 lg:grid-cols-4">
            {products.map((p) => (
              <ProductCard
                key={p.id}
                product={{
                  brand: p.brand,
                  name: p.name,
                  price_gbp: p.price_gbp,
                  price_usd: p.price_usd,
                  deliverable_lebanon: p.deliverable_lebanon,
                  product_url: p.product_url,
                  image_url: p.image_url
                }}
              />
            ))}
          </div>
          <Pagination slug={def.slug} sort={sort} page={page} totalPages={totalPages} />
        </div>
      ) : null}
    </>
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
    if (sort && sort !== "newest") sp.set("sort", sort);
    if (target > 1) sp.set("page", String(target));
    const qs = sp.toString();
    return qs ? `/category/${slug}?${qs}` : `/category/${slug}`;
  }

  const prevDisabled = page <= 1;
  const nextDisabled = page >= totalPages;

  return (
    <nav
      aria-label="Pagination"
      className="mt-14 flex items-center justify-between border-t border-ink/10 pt-6"
    >
      {prevDisabled ? (
        <span className="text-xs uppercase tracking-[0.18em] text-ink/30">← Previous</span>
      ) : (
        <Link
          href={hrefFor(page - 1)}
          className="text-xs uppercase tracking-[0.18em] text-ink hover:text-accent"
        >
          ← Previous
        </Link>
      )}

      <span className="text-xs uppercase tracking-[0.18em] text-ink/60">
        Page {page} of {totalPages}
      </span>

      {nextDisabled ? (
        <span className="text-xs uppercase tracking-[0.18em] text-ink/30">Next →</span>
      ) : (
        <Link
          href={hrefFor(page + 1)}
          className="text-xs uppercase tracking-[0.18em] text-ink hover:text-accent"
        >
          Next →
        </Link>
      )}
    </nav>
  );
}
