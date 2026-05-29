"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import ProductCard, { type ProductCardData } from "@/components/ProductCard";
import type { CategoryStat } from "@/lib/categories";
import { whatsappRequestLink } from "@/lib/links";

interface SearchProduct extends ProductCardData {
  category?: string;
}

interface Props {
  categories: CategoryStat[];
}

export default function HomeClient({ categories }: Props) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchProduct[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setError(null);
  }, [query]);

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
        body: JSON.stringify({ query, category: "All" })
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
      <Hero query={query} setQuery={setQuery} onSubmit={runSearch} />

      {results !== null ? (
        <section className="mx-auto max-w-7xl px-4 pb-16 sm:px-6 lg:px-8">
          <div className="mb-6 flex items-end justify-between">
            <h2 className="font-serif text-2xl text-ink">
              {loading ? "Searching…" : `Results for "${query}"`}
            </h2>
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
          </div>

          {loading ? <LoadingGrid /> : null}
          {error ? (
            <p className="rounded border border-accent/40 bg-accent/5 p-4 text-sm text-accent-700">
              {error}
            </p>
          ) : null}
          {!loading && results.length === 0 ? (
            <p className="rounded border border-ink/10 bg-ink/[0.02] p-8 text-center text-sm text-ink/60">
              No products matched. Try a different search or message us on WhatsApp.
            </p>
          ) : null}
          {!loading && results.length > 0 ? (
            <div className="grid grid-cols-2 gap-x-5 gap-y-10 sm:grid-cols-3 lg:grid-cols-4">
              {results.map((p, i) => (
                <ProductCard key={(p.product_url || p.name) + i} product={p} />
              ))}
            </div>
          ) : null}
        </section>
      ) : (
        <CategoryCards categories={categories} />
      )}

      <BespokeSection />

      <WhySeasons />
    </div>
  );
}

function BespokeSection() {
  const waHref = whatsappRequestLink();
  const items = [
    { icon: "👜", title: "Luxury Bags", body: "Gucci, Valentino, Loewe, Bottega Veneta and more" },
    { icon: "💎", title: "Rare Finds", body: "Limited editions, sold-out pieces, exclusive collections" },
    { icon: "🎁", title: "Gift Sourcing", body: "Special occasions, curated gifts, personalised selections" }
  ];

  return (
    <section style={{ backgroundColor: "#23272A" }}>
      <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <div className="text-center">
          <p className="text-[11px] uppercase tracking-[0.32em]" style={{ color: "#F4D360" }}>
            Personal sourcing
          </p>
          <h2 className="mt-4 font-serif text-3xl leading-tight text-cream sm:text-4xl">
            Can&apos;t find what you&apos;re looking for?
          </h2>
          <p className="mx-auto mt-5 max-w-2xl text-sm leading-relaxed text-cream/70 sm:text-base">
            Bags, rare finds, limited editions, sold-out pieces — tell us exactly what you want and we&apos;ll source
            it from London&apos;s finest boutiques. No request is too specific.
          </p>
        </div>

        <div className="mx-auto mt-14 grid max-w-4xl gap-10 sm:grid-cols-3">
          {items.map((item) => (
            <div key={item.title} className="text-center">
              <div
                className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border text-2xl"
                style={{ borderColor: "#F4D360" }}
              >
                <span aria-hidden>{item.icon}</span>
              </div>
              <h3 className="mt-5 font-serif text-xl" style={{ color: "#F4D360" }}>
                {item.title}
              </h3>
              <p className="mt-2 text-sm text-cream/70">{item.body}</p>
            </div>
          ))}
        </div>

        <div className="mt-14 text-center">
          <a href={waHref} target="_blank" rel="noreferrer" className="btn-gold">
            WhatsApp Us Your Request
          </a>
          <p className="mt-3 text-xs uppercase tracking-[0.2em] text-cream/50">
            We typically respond within 2 hours
          </p>
        </div>
      </div>
    </section>
  );
}

interface HeroProps {
  query: string;
  setQuery: (v: string) => void;
  onSubmit: (e: React.FormEvent) => void;
}

function Hero({ query, setQuery, onSubmit }: HeroProps) {
  return (
    <section className="border-b border-ink/10 bg-gradient-to-b from-gold/20 to-cream">
      <div className="mx-auto max-w-7xl px-4 py-16 text-center sm:px-6 sm:py-20 lg:px-8">
        <p className="text-[11px] uppercase tracking-[0.32em] text-accent">Seasons by B</p>
        <h1 className="mt-4 font-serif text-4xl leading-tight text-ink sm:text-6xl">
          London&apos;s finest,
          <br /> delivered to your door.
        </h1>
        <p className="mx-auto mt-5 max-w-xl text-sm text-ink/70 sm:text-base">
          Tell us what you want. We&apos;ll source it from London&apos;s finest retailers, check it can ship,
          and deliver in 10–14 working days.
        </p>

        <form onSubmit={onSubmit} className="mx-auto mt-10 flex max-w-2xl items-stretch gap-0 shadow-soft">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search across every category — e.g. Charlotte Tilbury"
            className="flex-1 border border-ink/15 bg-white px-5 py-4 text-base text-ink placeholder:text-ink/40 focus:border-accent focus:outline-none"
          />
          <button type="submit" className="btn-primary px-8">
            Search
          </button>
        </form>
      </div>
    </section>
  );
}

function CategoryCards({ categories }: { categories: CategoryStat[] }) {
  return (
    <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
      <div className="mb-8 flex items-end justify-between">
        <div>
          <p className="text-[11px] uppercase tracking-[0.32em] text-accent">Shop the edit</p>
          <h2 className="mt-2 font-serif text-3xl text-ink">By category</h2>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {categories.map((cat) => (
          <Link
            key={cat.slug}
            href={`/category/${cat.slug}`}
            className="group relative block overflow-hidden border border-ink/10 bg-cream transition-transform duration-300 hover:-translate-y-1 hover:border-ink/30 hover:shadow-soft"
          >
            <div className="relative aspect-[4/3] w-full overflow-hidden bg-ink/[0.04]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={cat.defaultImage}
                alt={cat.label}
                className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.04]"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-ink/60 via-ink/10 to-transparent" />
              <span className="absolute right-3 top-3 inline-flex items-center rounded-full bg-cream/95 px-3 py-1 text-[10px] uppercase tracking-[0.2em] text-ink">
                {cat.count} {cat.count === 1 ? "product" : "products"}
              </span>
            </div>
            <div className="p-5">
              <p className="text-[11px] uppercase tracking-[0.32em] text-accent">Category</p>
              <h3 className="mt-1 font-serif text-2xl text-ink group-hover:text-accent">{cat.label}</h3>
              <p className="mt-2 text-sm text-ink/70">{cat.blurb}</p>
              <p className="mt-4 inline-flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-ink/80 group-hover:text-accent">
                Shop {cat.label} →
              </p>
            </div>
          </Link>
        ))}
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
