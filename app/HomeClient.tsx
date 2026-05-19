"use client";

import { useEffect, useMemo, useState } from "react";
import ProductCard, { type ProductCardData } from "@/components/ProductCard";
import { CATEGORIES, type Category, type FeaturedProduct } from "@/lib/featured";

interface SearchProduct extends ProductCardData {
  category?: string;
}

interface Props {
  initialFeatured: FeaturedProduct[];
}

export default function HomeClient({ initialFeatured }: Props) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<Category>("All");
  const [results, setResults] = useState<SearchProduct[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setError(null);
  }, [query, category]);

  const featured = useMemo<SearchProduct[]>(() => {
    if (category === "All") return initialFeatured;
    return initialFeatured.filter((p) => p.category === category);
  }, [category, initialFeatured]);

  const display = results ?? featured;

  async function runSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim()) {
      setResults(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query, category })
      });
      if (!res.ok) throw new Error("Search failed");
      const data = (await res.json()) as { products: SearchProduct[] };
      setResults(data.products ?? []);
    } catch (err) {
      setError((err as Error).message);
      setResults([]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <Hero query={query} setQuery={setQuery} category={category} setCategory={setCategory} onSubmit={runSearch} />

      <section className="mx-auto max-w-7xl px-4 pb-16 sm:px-6 lg:px-8">
        <div className="mb-6 flex items-end justify-between">
          <h2 className="font-serif text-2xl text-ink">
            {results === null ? "Featured this season" : `Results for "${query}"`}
          </h2>
          {results !== null ? (
            <button
              type="button"
              className="text-xs uppercase tracking-[0.2em] text-ink/60 hover:text-accent"
              onClick={() => {
                setResults(null);
                setQuery("");
              }}
            >
              Clear
            </button>
          ) : null}
        </div>

        {loading ? <LoadingGrid /> : null}
        {error ? (
          <p className="rounded border border-accent/40 bg-accent/5 p-4 text-sm text-accent-700">{error}</p>
        ) : null}

        {!loading && display.length === 0 ? (
          <p className="rounded border border-ink/10 bg-ink/[0.02] p-8 text-center text-sm text-ink/60">
            No products to show. Try a different search or message us on WhatsApp for a custom request.
          </p>
        ) : null}

        {!loading && display.length > 0 ? (
          <div className="grid grid-cols-2 gap-x-5 gap-y-10 sm:grid-cols-3 lg:grid-cols-4">
            {display.map((p, i) => (
              <ProductCard key={(p.product_url || p.name) + i} product={p} />
            ))}
          </div>
        ) : null}
      </section>

      <WhySeasons />
    </div>
  );
}

interface HeroProps {
  query: string;
  setQuery: (v: string) => void;
  category: Category;
  setCategory: (v: Category) => void;
  onSubmit: (e: React.FormEvent) => void;
}

function Hero({ query, setQuery, category, setCategory, onSubmit }: HeroProps) {
  return (
    <section className="border-b border-ink/10 bg-gradient-to-b from-gold/20 to-cream">
      <div className="mx-auto max-w-7xl px-4 py-16 text-center sm:px-6 sm:py-20 lg:px-8">
        <p className="text-[11px] uppercase tracking-[0.32em] text-accent">Seasons by B</p>
        <h1 className="mt-4 font-serif text-4xl leading-tight text-ink sm:text-6xl">
          London&apos;s finest,
          <br /> delivered to your door.
        </h1>
        <p className="mx-auto mt-5 max-w-xl text-sm text-ink/70 sm:text-base">
          Tell us what you want. We&apos;ll source it from London&apos;s finest retailers, check it can ship, and
          deliver in 10–14 working days.
        </p>

        <form onSubmit={onSubmit} className="mx-auto mt-10 flex max-w-2xl items-stretch gap-0 shadow-soft">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search a brand or item — e.g. Charlotte Tilbury"
            className="flex-1 border border-ink/15 bg-white px-5 py-4 text-base text-ink placeholder:text-ink/40 focus:border-accent focus:outline-none"
          />
          <button type="submit" className="btn-primary px-8">
            Search
          </button>
        </form>

        <div className="mx-auto mt-6 flex max-w-2xl flex-wrap justify-center gap-2">
          {CATEGORIES.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setCategory(c)}
              className={"chip " + (category === c ? "chip-active" : "")}
            >
              {c}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}

function WhySeasons() {
  const items = [
    {
      icon: "🐝",
      title: "Curated in London",
      body: "Hand-picked from London's finest luxury retailers."
    },
    {
      icon: "📦",
      title: "Delivered to your door",
      body: "10–14 working days, tracked shipping."
    },
    {
      icon: "💬",
      title: "Personal service",
      body: "WhatsApp support throughout your order."
    }
  ];
  return (
    <section className="border-t border-ink/10 bg-gold/15">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-16 sm:px-6 sm:grid-cols-3 lg:px-8">
        {items.map((item) => (
          <div key={item.title} className="text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-gold bg-cream text-2xl">
              <span aria-hidden>{item.icon}</span>
            </div>
            <h3 className="mt-5 font-serif text-2xl text-ink">{item.title}</h3>
            <p className="mt-3 text-sm text-ink/70">{item.body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function LoadingGrid() {
  return (
    <div className="grid grid-cols-2 gap-x-5 gap-y-10 sm:grid-cols-3 lg:grid-cols-4">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="animate-pulse">
          <div className="aspect-[3/4] w-full bg-ink/[0.06]" />
          <div className="mt-3 h-3 w-1/3 bg-ink/[0.08]" />
          <div className="mt-2 h-3 w-2/3 bg-ink/[0.06]" />
          <div className="mt-3 h-4 w-1/4 bg-ink/[0.08]" />
        </div>
      ))}
    </div>
  );
}
