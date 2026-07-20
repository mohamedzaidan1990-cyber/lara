"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import ProductCard, { type ProductCardData } from "@/components/ProductCard";
import SearchAutocomplete from "@/components/SearchAutocomplete";
import BeeLoader from "@/components/BeeLoader";
import { BeeMascot } from "@/components/BeeMascot";

interface SearchProduct extends ProductCardData {
  category?: string;
}

type SearchSort = "relevant" | "price-asc" | "price-desc";

interface BrandMatch {
  brand: string;
  slug: string;
  count: number;
}

const CATEGORIES = ["All", "Makeup", "Skincare", "Fragrance", "Home Fragrance", "Haircare", "Beauty tools", "Health & Nutrition"];
const BUDGETS: Array<{ label: string; value: number | null }> = [
  { label: "All prices", value: null },
  { label: "Under $25", value: 25 },
  { label: "Under $50", value: 50 },
  { label: "Under $100", value: 100 },
  { label: "Under $150", value: 150 },
];

export default function SearchPageClient({ initialQuery }: { initialQuery: string }) {
  const router = useRouter();
  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState<SearchProduct[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeCategory, setActiveCategory] = useState("All");
  const [sort, setSort] = useState<SearchSort>("relevant");
  const [maxUsd, setMaxUsd] = useState<number | null>(null);
  const [trending, setTrending] = useState<ProductCardData[] | null>(null);
  const [brandMatch, setBrandMatch] = useState<BrandMatch | null>(null);

  useEffect(() => {
    if (!initialQuery) return;
    setQuery(initialQuery);
    setActiveCategory("All");
    setSort("relevant");
    setMaxUsd(null);
    void runSearch(initialQuery);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialQuery]);

  useEffect(() => {
    if (results !== null && results.length === 0 && trending === null) {
      void fetch("/api/trending")
        .then((r) => r.json())
        .then((d: { products: ProductCardData[] }) => setTrending(d.products ?? []));
    }
  }, [results, trending]);

  async function runSearch(q: string) {
    if (!q.trim()) return;
    setLoading(true);
    try {
      const res = await fetch("/api/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: q, category: "All" }),
      });
      const data = (await res.json()) as { products: SearchProduct[]; brand_match?: BrandMatch | null };
      setResults(data.products ?? []);
      setBrandMatch(data.brand_match ?? null);
    } finally {
      setLoading(false);
    }
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;
    router.push(`/search?q=${encodeURIComponent(query.trim())}`);
  }

  const displayed = results
    ? results
        .filter((p) => activeCategory === "All" || p.category === activeCategory)
        .filter((p) => maxUsd === null || (p.price_usd ?? 0) <= maxUsd)
        .sort((a, b) => {
          if (sort === "price-asc") return (a.price_usd ?? 0) - (b.price_usd ?? 0);
          if (sort === "price-desc") return (b.price_usd ?? 0) - (a.price_usd ?? 0);
          return 0;
        })
    : null;

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      {/* Search bar */}
      <div className="mx-auto max-w-2xl">
        <SearchAutocomplete query={query} setQuery={setQuery} onSubmit={onSubmit} />
      </div>

      {initialQuery && (
        <div className="mt-10">
          <div className="mb-5 flex items-end justify-between">
            <h1 className="font-serif text-2xl text-ink">
              {loading ? "Searching…" : `Results for "${initialQuery}"`}
            </h1>
            {!loading && results && (
              <span className="text-xs uppercase tracking-[0.2em] text-ink/50">
                {displayed?.length ?? 0} {displayed?.length === 1 ? "product" : "products"}
              </span>
            )}
          </div>

          {/* Direct link to the full brand page when the query names a brand —
              search results are capped, the brand page never is. */}
          {!loading && brandMatch && (
            <Link
              href={`/brand/${brandMatch.slug}`}
              className="mb-6 flex items-center justify-between gap-4 rounded-[1.5rem] border border-accent/20 p-5 shadow-soft transition-all hover:-translate-y-0.5 hover:shadow-pop"
              style={{ background: "linear-gradient(110deg, #ffe6f4 0%, #ffd6ee 100%)" }}
            >
              <div>
                <p className="text-[10px] uppercase tracking-[0.28em] text-accent">Brand page</p>
                <p className="mt-1 font-serif text-xl text-ink">{brandMatch.brand}</p>
                <p className="mt-0.5 text-xs text-ink/60">
                  See the complete collection — all {brandMatch.count} products
                </p>
              </div>
              <span className="inline-flex shrink-0 items-center gap-2 whitespace-nowrap rounded-full bg-accent px-5 py-2.5 text-xs font-bold uppercase tracking-[0.14em] text-white shadow-lg">
                View all →
              </span>
            </Link>
          )}

          {/* Filters */}
          {!loading && results && results.length > 0 && (
            <div className="mb-6 space-y-3">
              {/* Category pills */}
              <div className="flex flex-wrap gap-2">
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setActiveCategory(cat)}
                    className={
                      "rounded-full border px-4 py-1.5 text-xs font-medium uppercase tracking-[0.14em] transition-colors " +
                      (activeCategory === cat
                        ? "border-accent bg-accent text-white"
                        : "border-ink/15 bg-white text-ink hover:border-accent hover:text-accent")
                    }
                  >
                    {cat}
                  </button>
                ))}
              </div>

              {/* Budget + sort row */}
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[10px] uppercase tracking-[0.2em] text-ink/50 mr-1">Budget</span>
                {BUDGETS.map((b) => (
                  <button
                    key={b.label}
                    type="button"
                    onClick={() => setMaxUsd(b.value)}
                    className={
                      "rounded-full border px-4 py-1.5 text-xs font-medium uppercase tracking-[0.14em] transition-colors " +
                      (maxUsd === b.value
                        ? "border-accent bg-accent text-white"
                        : "border-ink/15 bg-white text-ink hover:border-accent hover:text-accent")
                    }
                  >
                    {b.label}
                  </button>
                ))}
                <div className="ml-auto">
                  <select
                    value={sort}
                    onChange={(e) => setSort(e.target.value as SearchSort)}
                    className="rounded-full border border-ink/15 bg-white px-4 py-1.5 text-xs uppercase tracking-[0.14em] text-ink focus:border-accent focus:outline-none"
                  >
                    <option value="relevant">Most Relevant</option>
                    <option value="price-asc">Price: Low → High</option>
                    <option value="price-desc">Price: High → Low</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {loading && <BeeLoader fullScreen={false} />}

          {!loading && displayed !== null && displayed.length === 0 && (
            <div>
              <div className="flex flex-col items-center gap-4 rounded border border-ink/10 bg-ink/[0.02] p-12 text-center">
                <BeeMascot variant="floating" />
                <p className="text-sm text-ink/60">
                  {activeCategory !== "All" || maxUsd !== null
                    ? "No products match these filters. Try adjusting your category or budget."
                    : `No products matched "${initialQuery}". Try a different spelling or message us on Instagram.`}
                </p>
              </div>
              {activeCategory === "All" && maxUsd === null && trending && trending.length > 0 && (
                <div className="mt-12">
                  <h2 className="font-serif text-xl text-ink mb-1">Trending now</h2>
                  <p className="text-xs uppercase tracking-[0.18em] text-ink/40 mb-6">Our most wanted picks</p>
                  <div className="grid grid-cols-2 gap-x-5 gap-y-10 sm:grid-cols-3 lg:grid-cols-4">
                    {trending.map((p, i) => (
                      <ProductCard key={(p.product_url || p.name) + i} product={p} index={i} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {!loading && displayed !== null && displayed.length > 0 && (
            <div className="grid grid-cols-2 gap-x-5 gap-y-10 sm:grid-cols-3 lg:grid-cols-4">
              {displayed.map((p, i) => (
                <ProductCard key={(p.product_url || p.name) + i} product={p} index={i} />
              ))}
            </div>
          )}
        </div>
      )}

      {!initialQuery && (
        <p className="mt-16 text-center text-sm text-ink/50">
          Start typing to search across all products and brands.
        </p>
      )}
    </div>
  );
}
