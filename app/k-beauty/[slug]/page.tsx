import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import ProductCard from "@/components/ProductCard";
import { BeeMascot } from "@/components/BeeMascot";
import {
  KBEAUTY_SLUG_MAP,
  getKBeautyBrands,
  getKBeautyProducts
} from "@/lib/kbeauty";
import { parsePage, parseSort } from "@/lib/categories";

interface Params {
  slug: string;
}

interface SearchParams {
  sort?: string | string[];
  page?: string | string[];
  brand?: string | string[];
}

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const def = KBEAUTY_SLUG_MAP[params.slug];
  if (!def) return { title: "K-Beauty — Seasons by B" };
  return {
    title: `${def.label} — K-Beauty — Seasons by B`,
    description: `Shop K-Beauty ${def.label.toLowerCase()} from Selfridges London, delivered to Lebanon.`
  };
}

export default async function KBeautySlugPage({
  params,
  searchParams
}: {
  params: Params;
  searchParams: SearchParams;
}) {
  const def = KBEAUTY_SLUG_MAP[params.slug];
  if (!def) notFound();

  const sort = parseSort(searchParams.sort) as "featured" | "price-asc" | "price-desc" | "newest";
  const page = parsePage(searchParams.page);
  const brandParam = Array.isArray(searchParams.brand)
    ? searchParams.brand[0]
    : (searchParams.brand ?? null);

  const [brands, result] = await Promise.all([
    getKBeautyBrands(def.categories),
    getKBeautyProducts(def.categories, sort, page, brandParam)
  ]);

  const { products, total, totalPages } = result;

  function buildHref(overrides: Record<string, string | null>): string {
    const p = new URLSearchParams();
    const cur: Record<string, string | null> = {
      sort: sort !== "featured" ? sort : null,
      page: page > 1 ? String(page) : null,
      brand: brandParam
    };
    const merged = { ...cur, ...overrides };
    for (const [k, v] of Object.entries(merged)) {
      if (v) p.set(k, v);
    }
    const qs = p.toString();
    return `/k-beauty/${params.slug}${qs ? `?${qs}` : ""}`;
  }

  const SORT_OPTS = [
    { value: "featured", label: "Most wanted" },
    { value: "price-asc", label: "Price: low → high" },
    { value: "price-desc", label: "Price: high → low" },
    { value: "newest", label: "Newest" }
  ];

  return (
    <div>
      {/* Mini hero */}
      <section
        style={{
          background: "linear-gradient(135deg, #ffe0ef 0%, #f97db8 60%, #c94f92 100%)"
        }}
        className="px-4 py-12 sm:px-6 lg:px-8"
      >
        <div className="mx-auto max-w-7xl">
          <nav aria-label="Breadcrumb" className="mb-4 text-[11px] uppercase tracking-[0.2em] text-white/70">
            <Link href="/k-beauty" className="hover:text-white">
              K-Beauty
            </Link>
            <span className="mx-2 text-white/40">/</span>
            <span className="text-white">{def.label}</span>
          </nav>
          <div className="flex items-center gap-4">
            <span className="text-4xl">{def.emoji}</span>
            <div>
              <h1 className="font-serif text-3xl text-white sm:text-4xl">{def.label}</h1>
              <p className="mt-1 text-sm text-white/80">
                {total} product{total !== 1 ? "s" : ""} · Selfridges London → Lebanon
              </p>
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        {/* Filters row */}
        <div className="mb-8 flex flex-wrap items-center gap-3">
          {/* Sort */}
          <div className="flex items-center gap-2 text-xs">
            <label htmlFor="kb-sort" className="font-bold uppercase tracking-[0.16em] text-ink/60">
              Sort
            </label>
            <select
              id="kb-sort"
              className="rounded-full border border-accent/20 bg-white px-4 py-2 text-xs font-bold uppercase tracking-[0.12em] text-ink focus:outline-none"
              value={sort}
              onChange={undefined}
              // Server-side navigation via links
            >
              {SORT_OPTS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>

          {/* Brand */}
          {brands.length > 1 ? (
            <div className="flex items-center gap-2 text-xs">
              <label htmlFor="kb-brand" className="font-bold uppercase tracking-[0.16em] text-ink/60">
                Brand
              </label>
              <select
                id="kb-brand"
                className="rounded-full border border-accent/20 bg-white px-4 py-2 text-xs font-bold uppercase tracking-[0.12em] text-ink focus:outline-none"
                value={brandParam ?? ""}
                onChange={undefined}
              >
                <option value="">All brands</option>
                {brands.map((b) => (
                  <option key={b.brand} value={b.brand}>
                    {b.brand} ({b.count})
                  </option>
                ))}
              </select>
            </div>
          ) : null}

          {/* Sort link pills (server-navigable) */}
          <div className="ml-auto flex flex-wrap gap-2">
            {SORT_OPTS.map((o) => (
              <Link
                key={o.value}
                href={buildHref({ sort: o.value === "featured" ? null : o.value, page: null })}
                className={
                  "rounded-full border px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.14em] transition-colors " +
                  (sort === o.value
                    ? "border-accent bg-accent text-white"
                    : "border-accent/20 text-ink/60 hover:border-accent/50 hover:text-accent")
                }
              >
                {o.label}
              </Link>
            ))}
          </div>
        </div>

        {/* Brand filter pills */}
        {brands.length > 1 ? (
          <div className="mb-8 flex flex-wrap gap-2">
            <Link
              href={buildHref({ brand: null, page: null })}
              className={
                "rounded-full border px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.14em] transition-colors " +
                (!brandParam
                  ? "border-accent bg-accent text-white"
                  : "border-accent/20 text-ink/60 hover:border-accent/50 hover:text-accent")
              }
            >
              All brands
            </Link>
            {brands.map((b) => (
              <Link
                key={b.brand}
                href={buildHref({ brand: b.brand, page: null })}
                className={
                  "rounded-full border px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.14em] transition-colors " +
                  (brandParam === b.brand
                    ? "border-accent bg-accent text-white"
                    : "border-accent/20 text-ink/60 hover:border-accent/50 hover:text-accent")
                }
              >
                {b.brand}
              </Link>
            ))}
          </div>
        ) : null}

        {/* Products */}
        {products.length === 0 ? (
          <div className="flex flex-col items-center gap-4 rounded-[2rem] border border-ink/10 bg-ink/[0.02] p-16 text-center">
            <BeeMascot variant="floating" />
            <p className="text-sm text-ink/60">No products yet — check back soon.</p>
            <Link href="/k-beauty" className="text-xs uppercase tracking-[0.2em] text-accent hover:underline">
              ← All K-Beauty
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-x-5 gap-y-10 sm:grid-cols-3 lg:grid-cols-4">
            {products.map((p, i) => (
              <div key={p.id} className="relative">
                <span
                  className="absolute right-2 top-2 z-10 rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.15em] text-white"
                  style={{ background: "#c94f92" }}
                >
                  K-Beauty
                </span>
                <ProductCard product={p} index={i} />
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 ? (
          <div className="mt-12 flex items-center justify-center gap-2">
            {page > 1 ? (
              <Link
                href={buildHref({ page: page > 2 ? String(page - 1) : null })}
                className="rounded-full border border-accent/20 px-5 py-2 text-xs font-bold uppercase tracking-[0.14em] text-ink/70 hover:border-accent hover:text-accent"
              >
                ← Prev
              </Link>
            ) : null}
            <span className="px-4 text-xs text-ink/50">
              Page {page} of {totalPages}
            </span>
            {page < totalPages ? (
              <Link
                href={buildHref({ page: String(page + 1) })}
                className="rounded-full border border-accent/20 px-5 py-2 text-xs font-bold uppercase tracking-[0.14em] text-ink/70 hover:border-accent hover:text-accent"
              >
                Next →
              </Link>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}
